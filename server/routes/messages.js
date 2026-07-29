const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mpeg|pdf|doc|docx|pptx|txt|audio|mpeg|mp3|ogg|opus/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('File type not supported'));
  }
});

// GET /api/messages/:contactId
router.get('/:contactId', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, t.name as template_name
       FROM messages m
       LEFT JOIN templates t ON m.template_id = t.id
       WHERE m.contact_id = ? AND m.owner_id = ?
       ORDER BY m.created_at ASC`,
      [req.params.contactId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages - all conversations for inbox
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id as contact_id, c.name, c.phone,
        (SELECT body FROM messages WHERE contact_id = c.id AND owner_id = c.owner_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE contact_id = c.id AND owner_id = c.owner_id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT direction FROM messages WHERE contact_id = c.id AND owner_id = c.owner_id ORDER BY created_at DESC LIMIT 1) as last_direction,
        (SELECT message_type FROM messages WHERE contact_id = c.id AND owner_id = c.owner_id ORDER BY created_at DESC LIMIT 1) as last_message_type
       FROM contacts c
       WHERE c.owner_id = ?
       AND EXISTS (SELECT 1 FROM messages WHERE contact_id = c.id AND owner_id = c.owner_id)
       ORDER BY last_message_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/upload-media - Upload media file
router.post('/upload-media', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const mediaType = getMediaType(file.mimetype, file.originalname);

    res.json({
      file_url: `/uploads/media/${file.filename}`,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      media_type: mediaType
    });
  } catch (err) {
    console.error('Upload media error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Helper: determine media type from MIME
function getMediaType(mimetype, filename) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'document';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('presentation')) return 'document';
  return 'document';
}

// Helper: get WhatsApp media type
function getWAMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

// Helper: upload media to WhatsApp servers
async function uploadMediaToWhatsApp(phoneNumberId, mediaPath, mimetype, userToken) {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
  const token = userToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

  // Read file
  const fileBuffer = fs.readFileSync(mediaPath);

  // Upload to WhatsApp
  const FormData = require('form-data');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', fileBuffer, { filename: path.basename(mediaPath), contentType: mimetype });
  form.append('type', mimetype);

  const uploadRes = await axios.post(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`,
    form,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders()
      }
    }
  );

  return uploadRes.data.id; // media_id
}

// Helper: send via WhatsApp API
async function sendWhatsAppMessage(phone_number_id, to, body, templateName, userToken) {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${graphVersion}/${phone_number_id}/messages`;
  const token = userToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  if (templateName) {
    return axios.post(url, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: 'en_US' } }
    }, { headers });
  }

  return axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  }, { headers });
}

// Helper: send media message via WhatsApp API
async function sendMediaMessage(phone_number_id, to, mediaId, mediaType, caption, userToken) {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${graphVersion}/${phone_number_id}/messages`;
  const token = userToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  const mediaObj = { id: mediaId };
  if (caption) mediaObj.caption = caption;

  return axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: mediaType,
    [mediaType]: mediaObj
  }, { headers });
}

// POST /api/messages/send
router.post('/send', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { contact_id, body, template_id, media_type, caption } = req.body;
    const mediaFile = req.file;

    if (!contact_id || (!body && !template_id && !mediaFile)) {
      return res.status(400).json({ error: 'contact_id and body, template_id, or media required' });
    }

    // Get contact phone
    const [contacts] = await pool.query(
      'SELECT phone FROM contacts WHERE id = ? AND owner_id = ?',
      [contact_id, req.user.id]
    );
    if (contacts.length === 0) return res.status(404).json({ error: 'Contact not found' });

    // Get user's verified whatsapp number
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );
    if (waNumbers.length === 0) return res.status(400).json({ error: 'No verified WhatsApp number connected' });

    const phone_number_id = waNumbers[0].phone_number_id;
    const userToken = waNumbers[0].access_token;
    const to = contacts[0].phone;

    // Check for existing inbound conversation
    const [existingMsgs] = await pool.query(
      `SELECT id FROM messages WHERE contact_id = ? AND owner_id = ? AND direction = 'inbound' LIMIT 1`,
      [contact_id, req.user.id]
    );
    const hasConversation = existingMsgs.length > 0;

    let waResponse;
    let waError = null;
    let usedTemplate = false;
    let templateCategory = null;
    let messageType = 'text';
    let mediaUrl = null;
    let mediaType = null;

    try {
      // Handle media upload
      if (mediaFile) {
        const fileMimetype = mediaFile.mimetype;
        mediaType = getMediaType(fileMimetype, mediaFile.originalname);
        mediaUrl = `/uploads/media/${mediaFile.filename}`;

        // Upload to WhatsApp and get media_id
        const waMediaId = await uploadMediaToWhatsApp(
          phone_number_id,
          mediaFile.path,
          fileMimetype,
          userToken
        );

        // Send media message
        waResponse = await sendMediaMessage(
          phone_number_id,
          to,
          waMediaId,
          mediaType === 'image' ? 'image' : mediaType === 'video' ? 'video' : mediaType === 'audio' ? 'audio' : 'document',
          caption || body || null,
          userToken
        );
        messageType = mediaType;
      } else if (template_id) {
        // Template message
        const [tplRows] = await pool.query('SELECT name, category FROM templates WHERE id = ? AND owner_id = ?', [template_id, req.user.id]);
        if (tplRows.length === 0) return res.status(404).json({ error: 'Template not found' });
        templateCategory = tplRows[0].category;
        waResponse = await sendWhatsAppMessage(phone_number_id, to, body, tplRows[0].name, userToken);
        usedTemplate = true;
        messageType = 'template';
      } else if (hasConversation) {
        // Existing conversation — try text first
        try {
          waResponse = await sendWhatsAppMessage(phone_number_id, to, body, null, userToken);
        } catch (textErr) {
          console.log('Text send failed, falling back to template:', textErr.response?.data?.error?.message);
          waResponse = await sendWhatsAppMessage(phone_number_id, to, body, 'hello_world', userToken);
          usedTemplate = true;
        }
      } else {
        // New conversation — must use template
        waResponse = await sendWhatsAppMessage(phone_number_id, to, body, 'hello_world', userToken);
        usedTemplate = true;
      }
    } catch (waErr) {
      waError = waErr.response?.data || { message: waErr.message };
      console.error('WhatsApp API error:', JSON.stringify(waError, null, 2));
    }

    const status = waResponse ? 'sent' : 'failed';
    const messageId = waResponse?.data?.messages?.[0]?.id || null;

    const [result] = await pool.query(
      'INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status, message_type, media_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contact_id, 'outbound', body || caption || null, template_id || null, messageId, status, messageType, mediaUrl]
    );

    // Determine message category and cost
    let category = 'service';
    if (usedTemplate && templateCategory) {
      category = templateCategory;
    } else if (!hasConversation) {
      category = 'marketing';
    }

    // Look up cost from pricing_config table
    let cost = 0;
    try {
      const [pricingRows] = await pool.query(
        'SELECT rate FROM pricing_config WHERE category = ?',
        [category]
      );
      if (pricingRows.length > 0) {
        cost = parseFloat(pricingRows[0].rate);
      } else {
        const defaults = { marketing: 0.90, utility: 0.12, authentication: 0.12, service: 0.05 };
        cost = defaults[category] || 0;
      }
    } catch (e) {}

    // Deduct from user balance
    if (cost > 0) {
      await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [cost, req.user.id]);
    }

    await pool.query(
      'INSERT INTO usage_log (owner_id, message_id, category, cost) VALUES (?, ?, ?, ?)',
      [req.user.id, result.insertId, category, cost]
    );

    const [savedMsg] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    const response = { ...savedMsg[0], status, used_template: usedTemplate };
    if (messageId) response.wa_message_id = messageId;
    if (waError) response.wa_error = waError;
    res.status(201).json(response);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
