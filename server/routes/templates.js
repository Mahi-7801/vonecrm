const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

const graphVersion = () => process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

// Map custom categories to valid Meta categories
function mapToMetaCategory(category) {
  const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
  const upper = (category || '').toUpperCase();

  if (validCategories.includes(upper)) return upper;

  // Map custom categories to valid Meta categories
  const categoryMap = {
    'WELCOME': 'UTILITY',
    'APPOINTMENT': 'UTILITY',
    'PAYMENT': 'UTILITY',
    'FEEDBACK': 'UTILITY',
    'ANNOUNCEMENT': 'MARKETING',
    'FOLLOWUP': 'UTILITY',
    'FESTIVAL': 'MARKETING',
    'PROMOTION': 'MARKETING'
  };

  return categoryMap[upper] || 'UTILITY';
}

// Helper: Submit a template to Meta for approval using Platform Admin Master Key
async function submitTemplateToMeta(template, userId) {
  // Get user's WhatsApp number details if available
  const [waNumbers] = await pool.query(
    'SELECT phone_number_id, waba_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
    [userId]
  );

  let resourceId = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  let token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

  if (waNumbers.length > 0) {
    resourceId = waNumbers[0].waba_id || waNumbers[0].phone_number_id || resourceId;
    token = token || waNumbers[0].access_token;
  }

  if (!resourceId || !token) {
    console.warn('Missing Meta credentials (WHATSAPP_SYSTEM_USER_TOKEN or WABA_ID)');
    throw new Error('Meta API credentials not configured');
  }

  // Map category to valid Meta category
  const metaCategory = mapToMetaCategory(template.category);

  // Build unique template name
  const baseName = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const uniqueName = baseName + '_' + Date.now().toString(36);

  // Build template payload
  const templatePayload = {
    name: uniqueName,
    language: template.language || 'en_US',
    category: metaCategory,
    components: []
  };

  // Header
  if (template.header) {
    templatePayload.components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: template.header
    });
  }

  // Body (required)
  templatePayload.components.push({
    type: 'BODY',
    text: template.body
  });

  // Footer
  if (template.footer) {
    templatePayload.components.push({
      type: 'FOOTER',
      text: template.footer
    });
  }

  console.log('🚀 Auto-submitting template to Meta via Admin Key:', JSON.stringify(templatePayload, null, 2));

  let response;
  try {
    response = await axios.post(
      `https://graph.facebook.com/${graphVersion()}/${resourceId}/message_templates`,
      templatePayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (apiError) {
    console.error('Meta API Error:', JSON.stringify(apiError.response?.data || apiError.message, null, 2));
    throw apiError;
  }

  const metaStatus = response.data?.status?.toLowerCase() === 'approved' ? 'approved' : 'pending';

  // Update template record with Meta ID and status
  await pool.query('UPDATE templates SET status = ?, meta_template_id = ?, name = ? WHERE id = ?',
    [metaStatus, response.data.id, uniqueName, template.id]);

  return { meta_template_id: response.data.id, status: metaStatus };
}

// GET /api/templates — show user's own + published public templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM templates WHERE (owner_id = ? OR is_published = TRUE) AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates — create and auto-submit to Meta
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, language, header, body, footer, buttons } = req.body;
    console.log('Creating template:', { name, category, language, body: body?.substring(0, 50) + '...' });

    if (!name || !category || !body) {
      return res.status(400).json({ error: 'name, category, and body required' });
    }

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 512);

    const [result] = await pool.query(
      'INSERT INTO templates (owner_id, name, category, language, header, body, footer, buttons) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, sanitizedName, category, language || 'en', header || null, body, footer || null, buttons ? JSON.stringify(buttons) : null]
    );
    console.log('Template saved with ID:', result.insertId, 'category:', category);

    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [result.insertId]);
    const template = rows[0];

    // Auto-submit to Meta
    let metaResult = null;
    try {
      metaResult = await submitTemplateToMeta(template, req.user.id);
    } catch (metaErr) {
      console.warn('Auto-submit to Meta failed (template saved locally):', metaErr.message);
    }

    const [updated] = await pool.query('SELECT * FROM templates WHERE id = ?', [template.id]);
    res.status(201).json({
      ...updated[0],
      meta_submitted: !!metaResult,
      message: metaResult ? 'Template created and submitted to Meta for review' : 'Template created (auto-submit failed — retry from template list)'
    });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/templates/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, category, language, header, body, footer, buttons } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM templates WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Template not found' });

    await pool.query(
      'UPDATE templates SET name = ?, category = ?, language = ?, header = ?, body = ?, footer = ?, buttons = ? WHERE id = ? AND owner_id = ?',
      [name, category, language || 'en', header || null, body, footer || null, buttons ? JSON.stringify(buttons) : null, req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid template ID' });

    const [result] = await pool.query(
      'UPDATE templates SET deleted_at = NOW() WHERE id = ? AND owner_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates/:id/submit - Manual retry: submit template to Meta
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM templates WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    // Log the attempt for debugging
    console.log(`Submitting template "${rows[0].name}" for user ${req.user.id}`);

    try {
      const result = await submitTemplateToMeta(rows[0], req.user.id);
      console.log(`Template "${rows[0].name}" submitted successfully:`, result);
      res.json({ message: 'Template submitted for approval', ...result });
    } catch (waErr) {
      const errorData = waErr.response?.data || {};
      const errorMessage = errorData.error?.message || waErr.message || 'Failed to submit to Meta';
      const errorCode = errorData.error?.code;
      const errorType = errorData.error?.error_subcode;

      console.error('Template submit error:', {
        template: rows[0].name,
        userId: req.user.id,
        errorCode,
        errorType,
        errorMessage,
        fullError: errorData
      });

      // Provide helpful error messages
      let userMessage = errorMessage;
      if (errorCode === 190) {
        userMessage = 'Access token expired. Please reconnect your WhatsApp number from Settings.';
      } else if (errorCode === 100) {
        userMessage = 'Invalid parameter. Check template name and body format.';
      } else if (errorCode === 200) {
        userMessage = 'Permission denied. Make sure your WhatsApp account has permission to create templates.';
      }

      res.status(500).json({ error: userMessage, code: errorCode });
    }
  } catch (err) {
    console.error('Submit template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates/sync - Sync template status from Meta (uses user's token)
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, waba_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );

    const resourceId = waNumbers[0]?.waba_id || waNumbers[0]?.phone_number_id || process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = waNumbers[0]?.access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    if (!resourceId || !token) {
      return res.status(400).json({ error: 'Meta WABA credentials not configured' });
    }

    // Fetch ALL templates from Meta with pagination
    let allMetaTemplates = [];
    let url = `https://graph.facebook.com/${graphVersion()}/${resourceId}/message_templates`;
    let hasMore = true;
    while (hasMore) {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      allMetaTemplates = allMetaTemplates.concat(response.data.data || []);
      url = response.data.paging?.next;
      hasMore = !!url;
    }

    // Build lookup maps from Meta templates
    const metaById = {};
    const metaByName = {};
    for (const mt of allMetaTemplates) {
      metaById[mt.id] = mt;
      metaByName[mt.name] = mt;
    }

    const [pendingTemplates] = await pool.query(
      "SELECT * FROM templates WHERE owner_id = ? AND deleted_at IS NULL",
      [req.user.id]
    );

    const results = [];
    for (const template of pendingTemplates) {
      let metaTemplate = null;

      // 1. Match by meta_template_id (most reliable)
      if (template.meta_template_id && metaById[template.meta_template_id]) {
        metaTemplate = metaById[template.meta_template_id];
      }

      // 2. Match by exact name
      if (!metaTemplate && metaByName[template.name]) {
        metaTemplate = metaByName[template.name];
      }

      // 3. Fuzzy match: find Meta template whose name contains local name or vice versa
      if (!metaTemplate) {
        const localName = template.name.toLowerCase();
        for (const mt of allMetaTemplates) {
          const metaName = mt.name.toLowerCase();
          if (metaName.startsWith(localName) || localName.startsWith(metaName) ||
              metaName.replace(/[_\d]+$/, '') === localName.replace(/[_\d]+$/, '')) {
            metaTemplate = mt;
            break;
          }
        }
      }

      if (metaTemplate) {
        const newStatus = metaTemplate.status === 'APPROVED' ? 'approved' :
                         metaTemplate.status === 'REJECTED' ? 'rejected' : 'pending';
        // Update status and meta_template_id, and sync name to match Meta
        await pool.query(
          'UPDATE templates SET status = ?, meta_template_id = ?, name = ? WHERE id = ?',
          [newStatus, metaTemplate.id, metaTemplate.name, template.id]
        );
        results.push({ id: template.id, oldName: template.name, name: metaTemplate.name, status: newStatus });
      }
    }

    res.json({ synced: results.length, results });
  } catch (err) {
    console.error('Sync templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/templates/meta - Fetch all templates from Meta (handles pagination)
router.get('/meta', authMiddleware, async (req, res) => {
  try {
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, waba_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );

    const resourceId = waNumbers[0]?.waba_id || waNumbers[0]?.phone_number_id || process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = waNumbers[0]?.access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    if (!resourceId || !token) {
      console.warn('No WABA ID or System User Token configured');
      return res.json([]);
    }

    // Fetch all templates with pagination
    let allTemplates = [];
    let url = `https://graph.facebook.com/${graphVersion()}/${resourceId}/message_templates`;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });

      const templates = response.data.data || [];
      allTemplates = allTemplates.concat(templates);

      // Check for next page
      if (response.data.paging && response.data.paging.next) {
        url = response.data.paging.next;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allTemplates.length} templates from Meta`);
    res.json(allTemplates);
  } catch (err) {
    console.error('Fetch meta templates error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch templates from Meta' });
  }
});

module.exports = router;
