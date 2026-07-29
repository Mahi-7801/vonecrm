const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Initialize integrations table
async function ensureTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS integrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      type ENUM('n8n','telegram','zapier','webhook') NOT NULL,
      name VARCHAR(255),
      config JSON,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`);
  } catch (e) {}
}
ensureTable();

// GET /api/integrations — list integrations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM integrations WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Get integrations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/integrations — create integration
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, name, config } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'type and name required' });
    const [result] = await pool.query(
      'INSERT INTO integrations (owner_id, type, name, config) VALUES (?, ?, ?, ?)',
      [req.user.id, type, name, JSON.stringify(config || {})]
    );
    res.status(201).json({ id: result.insertId, type, name, config, active: true });
  } catch (err) {
    console.error('Create integration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/integrations/:id — update integration
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, config, active } = req.body;
    await pool.query(
      'UPDATE integrations SET name = COALESCE(?, name), config = COALESCE(?, config), active = COALESCE(?, active) WHERE id = ? AND owner_id = ?',
      [name, config ? JSON.stringify(config) : null, active, req.params.id, req.user.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Update integration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/integrations/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM integrations WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete integration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/integrations/telegram/webhook — Telegram bot webhook
router.post('/telegram/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text || '';
    const from = message.from;

    // Find owner with this Telegram bot configured
    const [integrations] = await pool.query(
      "SELECT * FROM integrations WHERE type = 'telegram' AND active = TRUE"
    );

    for (const integration of integrations) {
      const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : integration.config;
      if (config.bot_token && config.allowed_chat_ids?.includes(String(chatId))) {
        // Send response via Telegram Bot API
        const reply = await generateTelegramReply(text, integration.owner_id);
        await axios.post(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
          chat_id: chatId,
          text: reply,
          parse_mode: 'HTML'
        });

        // Save to messages table
        const [contacts] = await pool.query(
          'SELECT id FROM contacts WHERE owner_id = ? AND phone = ?',
          [integration.owner_id, String(chatId)]
        );
        let contactId;
        if (contacts.length > 0) {
          contactId = contacts[0].id;
        } else {
          const [newContact] = await pool.query(
            'INSERT INTO contacts (owner_id, phone, name) VALUES (?, ?, ?)',
            [integration.owner_id, String(chatId), from.first_name || 'Telegram User']
          );
          contactId = newContact.insertId;
        }

        await pool.query(
          'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
          [integration.owner_id, contactId, 'inbound', text, 'received']
        );
        await pool.query(
          'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
          [integration.owner_id, contactId, 'outbound', reply, 'sent']
        );
        break;
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.sendStatus(200);
  }
});

// POST /api/integrations/telegram/setup — 1-click Telegram Bot Connect & Webhook Registration
router.post('/telegram/setup', authMiddleware, async (req, res) => {
  try {
    const { bot_token } = req.body;
    if (!bot_token) return res.status(400).json({ error: 'bot_token is required' });

    // 1. Validate Bot Token with Telegram getMe API
    let botInfo;
    try {
      const getMeRes = await axios.get(`https://api.telegram.org/bot${bot_token}/getMe`);
      if (!getMeRes.data?.ok) throw new Error('Invalid bot token');
      botInfo = getMeRes.data.result;
    } catch (botErr) {
      return res.status(400).json({ error: 'Invalid Telegram Bot Token. Please check the token from @BotFather.' });
    }

    // 2. Set Webhook URL with Telegram setWebhook API (must be public HTTPS)
    let host = req.headers['x-forwarded-host'] || req.headers.host || '';
    let proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    let baseUrl;

    if (process.env.PUBLIC_URL || process.env.APP_URL) {
      baseUrl = process.env.PUBLIC_URL || process.env.APP_URL;
    } else if (host.includes('trycloudflare.com') || host.includes('ngrok')) {
      baseUrl = `${proto}://${host}`;
    } else {
      // Fallback to active public Cloudflare Tunnel URL
      baseUrl = 'https://honor-directive-republic-downloading.trycloudflare.com';
    }

    const webhookUrl = `${baseUrl}/api/integrations/telegram/webhook`;

    try {
      await axios.post(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      });
    } catch (whErr) {
      console.warn('Set Telegram webhook notice:', whErr.message);
    }

    // 3. Save or update integration in database
    const config = {
      bot_token,
      bot_id: botInfo.id,
      bot_name: botInfo.first_name,
      bot_username: botInfo.username,
      webhook_url: webhookUrl,
      connected_at: new Date().toISOString()
    };

    const [existing] = await pool.query(
      "SELECT id FROM integrations WHERE owner_id = ? AND type = 'telegram'",
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE integrations SET name = ?, config = ?, active = TRUE WHERE id = ?',
        [`Telegram Bot (@${botInfo.username})`, JSON.stringify(config), existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO integrations (owner_id, type, name, config, active) VALUES (?, ?, ?, ?, TRUE)',
        [req.user.id, 'telegram', `Telegram Bot (@${botInfo.username})`, JSON.stringify(config)]
      );
    }

    res.json({
      success: true,
      message: `✅ Telegram Bot @${botInfo.username} connected successfully!`,
      bot: {
        id: botInfo.id,
        name: botInfo.first_name,
        username: botInfo.username,
        webhook_url: webhookUrl
      }
    });
  } catch (err) {
    console.error('Setup Telegram error:', err);
    res.status(500).json({ error: 'Failed to connect Telegram Bot: ' + err.message });
  }
});

// POST /api/integrations/telegram/webhook — Incoming Telegram Messages Webhook Receiver
router.post('/telegram/webhook', async (req, res) => {
  try {
    console.log('✈️ RAW TELEGRAM PAYLOAD:', JSON.stringify(req.body));

    const message = req.body.message || req.body.edited_message || req.body.callback_query?.message || req.body.channel_post;
    const chatId = message?.chat?.id || req.body.callback_query?.from?.id || req.body.from?.id;

    if (!chatId) {
      console.warn('⚠️ Telegram webhook received payload without valid chatId:', req.body);
      return res.sendStatus(200);
    }

    const text = req.body.callback_query?.data || message?.text || req.body.text || '/start';
    const from = req.body.callback_query?.from || message?.from || req.body.from || {};
    const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Telegram User';

    console.log(`✈️ Processing Telegram Message [Chat ID: ${chatId}] (${senderName}): "${text}"`);

    // Find active Telegram integration
    const [integrations] = await pool.query(
      "SELECT * FROM integrations WHERE type = 'telegram' AND active = TRUE ORDER BY id DESC"
    );

    let ownerId = 1;
    let botToken = '8962284256:AAHmf0j24MQT7ziMAH1fKQFCQQfSWHjBw2Y';

    if (integrations.length > 0) {
      const integration = integrations[0];
      ownerId = integration.owner_id;
      const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : integration.config;
      if (config.bot_token) botToken = config.bot_token;
    }

    // Save or find Contact in Mahi CRM by phone or tg_chatId
    const phoneStr = `tg_${chatId}`;
    const [contacts] = await pool.query(
      'SELECT id, custom_fields FROM contacts WHERE owner_id = ? AND (phone = ? OR phone LIKE ? OR phone LIKE ?)',
      [ownerId, phoneStr, '%6301400137%', '%9581490308%']
    );

    let contactId;
    if (contacts.length > 0) {
      contactId = contacts[0].id;
      // Update custom_fields with telegram_chat_id
      try {
        const cFields = typeof contacts[0].custom_fields === 'string' ? JSON.parse(contacts[0].custom_fields || '{}') : (contacts[0].custom_fields || {});
        cFields.telegram_chat_id = chatId;
        await pool.query('UPDATE contacts SET custom_fields = ? WHERE id = ?', [JSON.stringify(cFields), contactId]);
      } catch (e) {}
    } else {
      const [newContact] = await pool.query(
        'INSERT INTO contacts (owner_id, phone, name, tags, custom_fields) VALUES (?, ?, ?, ?, ?)',
        [ownerId, phoneStr, senderName, JSON.stringify(['Telegram', 'Lead']), JSON.stringify({ telegram_chat_id: chatId })]
      );
      contactId = newContact.insertId;
    }

    // Save Inbound Message
    await pool.query(
      'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
      [ownerId, contactId, 'inbound', text, 'received']
    );

    // Generate AI / Flow Reply
    const replyText = await generateTelegramReply(text, ownerId, senderName);

    // Send Outbound Message to Telegram with HTML formatting, fallback to plain text if HTML parse fails
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: replyText,
        parse_mode: 'HTML'
      });
      console.log(`✅ Sent Telegram HTML reply to Chat ${chatId}`);
    } catch (sendErr) {
      console.warn('Telegram HTML sendMessage failed, retrying plain text:', sendErr.response?.data?.description || sendErr.message);
      try {
        const plainText = replyText.replace(/<[^>]*>?/gm, '');
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: plainText
        });
        console.log(`✅ Sent Telegram plain text reply to Chat ${chatId}`);
      } catch (err2) {
        console.error('Telegram plain text sendMessage error:', err2.response?.data || err2.message);
      }
    }

    // Save Outbound Message Log
    await pool.query(
      'INSERT INTO messages (owner_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
      [ownerId, contactId, 'outbound', replyText, 'sent']
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.sendStatus(200);
  }
});

// POST /api/integrations/telegram/set-webhook — set Telegram webhook
router.post('/telegram/set-webhook', authMiddleware, async (req, res) => {
  try {
    const { bot_token } = req.body;
    if (!bot_token) return res.status(400).json({ error: 'bot_token required' });

    const webhookUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/integrations/telegram/webhook`;
    const response = await axios.post(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      url: webhookUrl
    });

    res.json({ message: 'Webhook set', result: response.data });
  } catch (err) {
    console.error('Set Telegram webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/n8n/webhook — n8n webhook receiver
router.post('/n8n/webhook', async (req, res) => {
  try {
    const { owner_id, action, data } = req.body;
    if (!owner_id || !action) return res.status(400).json({ error: 'owner_id and action required' });

    // Process n8n action
    switch (action) {
      case 'send_message':
        if (data.contact_phone && data.message) {
          const [waNumbers] = await pool.query(
            'SELECT phone_number_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
            [owner_id]
          );
          if (waNumbers.length > 0) {
            const token = waNumbers[0].access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
            await axios.post(
              `https://graph.facebook.com/v21.0/${waNumbers[0].phone_number_id}/messages`,
              { messaging_product: 'whatsapp', to: data.contact_phone, type: 'text', text: { body: data.message } },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        break;
      case 'get_contacts':
        const [contacts] = await pool.query('SELECT * FROM contacts WHERE owner_id = ?', [owner_id]);
        return res.json({ contacts });
      case 'get_messages':
        const [messages] = await pool.query(
          'SELECT * FROM messages WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50',
          [owner_id]
        );
        return res.json({ messages });
    }

    res.json({ message: 'Action processed' });
  } catch (err) {
    console.error('n8n webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate Telegram reply using Flow Builder + Groq Llama 3.1 AI
async function generateTelegramReply(text, ownerId, userName = 'Customer') {
  const lower = text.toLowerCase().trim();

  // 1. Check Flow Builder triggers first
  try {
    const [flows] = await pool.query(
      'SELECT * FROM flows WHERE owner_id = ? AND active = TRUE AND trigger_keyword IS NOT NULL',
      [ownerId]
    );
    for (const flow of flows) {
      const keywords = flow.trigger_keyword.split(',').map(k => k.trim().toLowerCase());
      if (keywords.some(k => lower.includes(k))) {
        const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;
        const greetNode = flowData.nodes?.find(n => n.type === 'message');
        if (greetNode?.data?.message) return greetNode.data.message;
      }
    }
  } catch (e) {}

  // 2. Commands & Greetings menu
  const isGreeting = ['/start', 'hi', 'hello', 'hey', 'bhi', 'hlo', 'namaste', 'start'].some(g => lower.includes(g));
  if (isGreeting) {
    return `👋 <b>Hello ${userName}!</b> Welcome to <b>Mahi CRM Bot</b> (@mahicrm_bot).\n\nI am your automated AI assistant connected to Mahi CRM.\n\nType <b>/help</b> to see all commands or ask any question!`;
  }
  if (lower.includes('help') || lower === '/help') {
    return `🤖 <b>Mahi CRM Bot Commands:</b>\n\n/start - Start conversation\n/help - View help menu\n/services - View products & services\n/contact - Get support contact info`;
  }
  if (lower.includes('service') || lower === '/services') {
    return `🚀 <b>Our Services & Products:</b>\n\n💬 Bulk WhatsApp Messaging CRM\n🤖 AI Chatbot & Flow Automation\n📈 Digital Marketing & Campaign ROI\n⚡ Custom Web & App Development\n\nReply with any question to chat with our AI!`;
  }
  if (lower.includes('contact') || lower === '/contact') {
    return `📞 <b>Support & Contact Info:</b>\n\n📱 WhatsApp / Phone: +91 9581490308\n📧 Email: support@mahicrm.com\n🌐 Portal: http://localhost:3000`;
  }

  // 3. Groq Llama 3.1 AI Engine Response Fallback
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const prompt = `You are Mahi CRM's friendly, helpful AI bot responding to a Telegram user named ${userName}.\nUser message: "${text}"\nProvide a clear, helpful response in under 150 words.`;
      const aiRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.7
        },
        { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' } }
      );
      const aiMsg = aiRes.data.choices?.[0]?.message?.content;
      if (aiMsg) return aiMsg;
    } catch (aiErr) {
      console.log('Groq Telegram AI error:', aiErr.message);
    }
  }

  return `Thanks for reaching out, ${userName}! 👋\n\nOur team has received your message. Type /help to see quick options!`;
}

module.exports = router;
