const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// POST /api/broadcast/send
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { template_id, template_name, contact_ids, tag_filter } = req.body;

    let templateName;
    let templateBody = null; // Store template body to extract parameters
    let templateLanguageCode = 'en_US'; // default

    // Handle both local templates (by ID) and Meta templates (by name)
    if (template_id) {
      const [tplRows] = await pool.query(
        'SELECT * FROM templates WHERE id = ? AND owner_id = ?',
        [template_id, req.user.id]
      );
      if (tplRows.length === 0) return res.status(404).json({ error: 'Template not found' });
      templateName = tplRows[0].name;
      templateBody = tplRows[0].body; // Store body for parameter extraction
    } else if (template_name) {
      // Meta template - use name directly, will fetch body from Meta below
      templateName = template_name;
    } else {
      return res.status(400).json({ error: 'template_id or template_name required' });
    }

    // Get contacts
    let contacts;
    if (contact_ids && contact_ids.length > 0) {
      const placeholders = contact_ids.map(() => '?').join(',');
      [contacts] = await pool.query(
        `SELECT * FROM contacts WHERE id IN (${placeholders}) AND owner_id = ?`,
        [...contact_ids, req.user.id]
      );
    } else if (tag_filter) {
      // Filter by tag - try JSON_CONTAINS first, fallback to LIKE for string tags
      try {
        [contacts] = await pool.query(
          "SELECT * FROM contacts WHERE owner_id = ? AND JSON_CONTAINS(tags, ?)",
          [req.user.id, JSON.stringify(tag_filter)]
        );
      } catch (e) {
        // Fallback: search for tag in tags string
        [contacts] = await pool.query(
          "SELECT * FROM contacts WHERE owner_id = ? AND tags LIKE ?",
          [req.user.id, `%${tag_filter}%`]
        );
      }
    } else {
      // No filter - get all contacts
      [contacts] = await pool.query(
        'SELECT * FROM contacts WHERE owner_id = ?',
        [req.user.id]
      );
    }

    if (contacts.length === 0) return res.status(400).json({ error: 'No contacts found' });

    // Check user balance & credit mode before broadcasting
    const [userRows] = await pool.query('SELECT balance, credit_mode FROM users WHERE id = ?', [req.user.id]);
    const creditMode = userRows[0]?.credit_mode || 'postpaid';
    const userBalance = parseFloat(userRows[0]?.balance || 0);

    if (creditMode === 'prepaid' && userBalance <= 0) {
      return res.status(402).json({
        error: `Insufficient wallet balance (Current Balance: ₹${userBalance.toFixed(2)}). Please top up your wallet under Billing to send broadcast messages.`
      });
    }

    // Get verified WA number (with system fallback)
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );

    const phone_number_id = waNumbers[0]?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '1269197539606780';
    const userToken = waNumbers[0]?.access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    let sent = 0, failed = 0;
    let sandboxErrors = 0;
    let lastError = null;

    // Get template category and verify name exists on Meta
    let templateCategory = 'utility'; // default
    if (template_id) {
      const [tplCat] = await pool.query('SELECT category, meta_template_id FROM templates WHERE id = ?', [template_id]);
      if (tplCat.length > 0) templateCategory = tplCat[0].category;
    }

    // Verify template exists and is APPROVED on Meta before sending
    const [waNumbersForVerify] = await pool.query(
      'SELECT waba_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );
    const wabaId = waNumbersForVerify[0]?.waba_id;
    const verifyToken = waNumbersForVerify[0]?.access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    let templateFound = false;
    let foundMetaTemplate = null; // Store the matched Meta template for language code lookup

    // Also look up meta_template_id from database for better matching
    let metaTemplateId = null;
    if (template_id) {
      const [tplMeta] = await pool.query('SELECT meta_template_id FROM templates WHERE id = ?', [template_id]);
      metaTemplateId = tplMeta[0]?.meta_template_id || null;
    }

    if (wabaId) {
      try {
        const metaRes = await axios.get(
          `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${wabaId}/message_templates`,
          { headers: { Authorization: `Bearer ${verifyToken}` } }
        );
        const metaTemplates = metaRes.data.data || [];

        // 1. Try exact name match first
        let found = metaTemplates.find(t => t.name === templateName && t.status === 'APPROVED' && t.name !== 'hello_world');

        // 2. Try fuzzy match: name starts with template name (handles timestamp suffixes like follow_up_new_abc123)
        if (!found) {
          const baseName = templateName.toLowerCase();
          found = metaTemplates.find(t =>
            t.status === 'APPROVED' &&
            t.name !== 'hello_world' &&
            (t.name.toLowerCase().startsWith(baseName + '_') || t.name.toLowerCase().startsWith(baseName))
          );
        }

        // 3. Try matching by meta_template_id
        if (!found && metaTemplateId) {
          found = metaTemplates.find(t => t.id === metaTemplateId && t.status === 'APPROVED');
        }

        if (found) {
          foundMetaTemplate = found;
          templateFound = true;
          // Use the actual name from Meta
          if (found.name !== templateName) {
            console.log(`Template "${templateName}" fuzzy matched to "${found.name}" on Meta`);
            templateName = found.name;
            if (template_id) {
              await pool.query('UPDATE templates SET name = ?, meta_template_id = ? WHERE id = ?',
                [found.name, found.id, template_id]);
            }
          }
          // Extract body and language from Meta template
          if (!templateBody) {
            const bodyComp = found.components?.find(c => c.type === 'BODY');
            templateBody = bodyComp?.text || null;
          }
          if (found.language) {
            templateLanguageCode = found.language;
          }
          console.log(`Template "${templateName}" found on Meta, body: ${templateBody}, lang: ${templateLanguageCode}`);
        } else {
          // Check if template exists but is pending
          const pending = metaTemplates.find(t =>
            (t.name === templateName || t.name.toLowerCase().startsWith(templateName.toLowerCase())) &&
            t.status === 'PENDING'
          );
          if (pending) {
            return res.status(400).json({
              error: `Template "${templateName}" is still pending approval. Please wait for Meta to approve it (usually 24-48 hours).`
            });
          }

          // Try to find any approved template as fallback
          const anyApproved = metaTemplates.find(t => t.status === 'APPROVED' && t.name !== 'hello_world');
          if (anyApproved) {
            foundMetaTemplate = anyApproved;
            console.log(`Template "${templateName}" not found, using approved template "${anyApproved.name}" as fallback`);
            templateName = anyApproved.name;
            templateFound = true;
          } else {
            // Get list of approved templates for error message
            const approvedList = metaTemplates
              .filter(t => t.status === 'APPROVED' && t.name !== 'hello_world')
              .map(t => t.name);

            if (approvedList.length === 0) {
              return res.status(400).json({
                error: 'No approved templates available. All templates are pending Meta approval. Please wait 24-48 hours for approval.'
              });
            } else {
              return res.status(400).json({
                error: `Template "${templateName}" not found on Meta. Available approved templates: ${approvedList.join(', ')}`
              });
            }
          }
        }
      } catch (e) {
        console.log('Could not verify template on Meta:', e.message);
        // Continue anyway - let Meta API handle the error
      }
    }

    console.log(`Broadcast: Sending template "${templateName}" to ${contacts.length} contacts`);

    // Extract parameters from template body (e.g., {{1}}, {{2}})
    const extractParams = (body) => {
      if (!body) return [];
      const matches = body.match(/\{\{\d+\}\}/g);
      if (!matches) return [];
      return [...new Set(matches)].sort(); // unique, sorted
    };

    const templateParams = extractParams(templateBody);
    console.log(`Template "${templateName}" has ${templateParams.length} parameters:`, templateParams);

    // If language still default and we have a local template, try to get its language
    if (templateLanguageCode === 'en_US' && template_id) {
      const [tplLang] = await pool.query('SELECT language FROM templates WHERE id = ?', [template_id]);
      if (tplLang.length > 0 && tplLang[0].language) {
        const lang = tplLang[0].language;
        if (lang.length === 2) {
          const langMap = { 'en': 'en_US', 'hi': 'hi_IN', 'es': 'es_ES', 'fr': 'fr_FR', 'de': 'de_DE', 'pt': 'pt_BR', 'ar': 'ar_SA' };
          templateLanguageCode = langMap[lang] || `${lang}_${lang.toUpperCase()}`;
        } else if (lang.includes('_')) {
          templateLanguageCode = lang;
        }
      }
    }

    console.log(`Using language code: ${templateLanguageCode} for template "${templateName}"`);

    // Send in batches (respect Meta rate limits)
    for (const contact of contacts) {
      try {
        // Clean phone number for WhatsApp API (remove +, spaces, dashes)
        let cleanPhone = String(contact.phone).replace(/[\s\-()+]/g, '');
        // Ensure country code prefix (default to India 91)
        if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }

        // Build template message with parameters
        const templateMessage = {
          name: templateName,
          language: { code: templateLanguageCode }
        };

        // If template has parameters, include them in components
        if (templateParams.length > 0) {
          const parameters = templateParams.map((param, index) => {
            // Use contact name for {{1}}, phone for {{2}}, generic placeholder for others
            let value;
            if (index === 0 && contact.name) {
              value = contact.name;
            } else if (index === 1) {
              value = contact.phone || '';
            } else {
              value = `Value ${index + 1}`;
            }
            return { type: 'text', text: value };
          });

          templateMessage.components = [{
            type: 'body',
            parameters: parameters
          }];
        }

        // Log the full request for debugging
        const requestBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: templateMessage
        };
        console.log(`Sending to ${cleanPhone}:`, JSON.stringify(requestBody, null, 2));

        const waResponse = await axios.post(
          `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${phone_number_id}/messages`,
          requestBody,
          { headers: { Authorization: `Bearer ${userToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
        );

        console.log(`WhatsApp API response for ${cleanPhone}:`, JSON.stringify(waResponse.data, null, 2));

        // Check for errors in the response body (Meta sometimes returns 200 with errors)
        const waError = waResponse.data?.error;
        if (waError) {
          const errCode = waError.code;
          const errMsg = waError.message || 'Unknown error';
          if (errCode === 131030 || errMsg.includes('not in allowed list')) {
            sandboxErrors++;
          }
          lastError = errMsg;
          console.error(`Send to ${cleanPhone} API error:`, errMsg);
          failed++;

          // Save failed message for tracking
          await pool.query(
            'INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, contact.id, 'outbound', `Template: ${templateName}`, template_id || null, null, 'failed']
          );
          continue;
        }

        const waMsgId = waResponse.data?.messages?.[0]?.id || null;

        // If no message ID returned, the message was NOT accepted by WhatsApp
        if (!waMsgId) {
          const errMsg = waResponse.data?.messages?.[0]?.errors?.[0]?.message || 'No message ID returned - template may not exist or language code mismatch';
          lastError = errMsg;
          console.error(`Send to ${cleanPhone} failed: No message ID. Response:`, JSON.stringify(waResponse.data, null, 2));
          failed++;

          await pool.query(
            'INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, contact.id, 'outbound', `Template: ${templateName}`, template_id || null, null, 'failed']
          );
          continue;
        }

        const [result] = await pool.query(
          'INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, contact.id, 'outbound', `Template: ${templateName}`, template_id || null, waMsgId, 'sent']
        );

        // Look up cost from pricing_config table
        let cost = 0;
        try {
          const [pricingRows] = await pool.query(
            'SELECT rate FROM pricing_config WHERE category = ?',
            [templateCategory]
          );
          if (pricingRows.length > 0) {
            cost = parseFloat(pricingRows[0].rate);
          } else {
            const defaults = { marketing: 0.90, utility: 0.12, authentication: 0.12, service: 0 };
            cost = defaults[templateCategory] || 0;
          }
        } catch (e) {}

        // Deduct from user balance
        if (cost > 0) {
          await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [cost, req.user.id]);
        }

        await pool.query(
          'INSERT INTO usage_log (owner_id, message_id, category, cost) VALUES (?, ?, ?, ?)',
          [req.user.id, result.insertId, templateCategory, cost]
        );

        sent++;

        // Rate limit: 80 messages per second per phone number
        await new Promise(r => setTimeout(r, 15));
      } catch (sendErr) {
        const errCode = sendErr.response?.data?.error?.code;
        const errMsg = sendErr.response?.data?.error?.message || sendErr.message;
        const fullError = sendErr.response?.data || sendErr.message;
        if (errCode === 131030 || errMsg.includes('not in allowed list')) {
          sandboxErrors++;
        }
        lastError = errMsg;
        console.error(`Send to ${contact.phone} failed:`, JSON.stringify(fullError, null, 2));
        failed++;

        // Save failed message for tracking
        try {
          await pool.query(
            'INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, contact.id, 'outbound', `Template: ${templateName}`, template_id || null, null, 'failed']
          );
        } catch (saveErr) {}
      }
    }

    const response = { total: contacts.length, sent, failed };
    if (sandboxErrors > 0) {
      response.sandbox_errors = sandboxErrors;
      response.error = `${sandboxErrors} numbers not in allowed list. Complete Meta App Review in Settings to enable bulk messaging.`;
    } else if (lastError) {
      response.error = lastError;
    }
    res.json(response);
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/broadcast/status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.status, COUNT(*) as count
       FROM messages m WHERE m.owner_id = ? AND m.direction = 'outbound'
       GROUP BY m.status`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Broadcast status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/broadcast/history - recent broadcast messages
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [rows] = await pool.query(
      `SELECT m.id, m.body, m.status, m.wa_message_id, m.created_at,
              c.name as contact_name, c.phone as contact_phone,
              COALESCE(t.name, CASE WHEN m.body LIKE 'Template: %' THEN SUBSTRING(m.body, 11) ELSE NULL END) as template_name,
              COALESCE(t.category, 'message') as template_category
       FROM messages m
       LEFT JOIN contacts c ON m.contact_id = c.id
       LEFT JOIN templates t ON m.template_id = t.id
       WHERE m.owner_id = ? AND m.direction = 'outbound'
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('Broadcast history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Scheduled Broadcasts

// GET /api/broadcast/scheduled
router.get('/scheduled', authMiddleware, async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      template_name VARCHAR(255),
      template_id INT,
      contact_ids JSON,
      tag_filter VARCHAR(255),
      scheduled_at DATETIME NOT NULL,
      status ENUM('pending','sent','cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`);
    const [rows] = await pool.query(
      'SELECT * FROM scheduled_broadcasts WHERE owner_id = ? ORDER BY scheduled_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get scheduled error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/broadcast/schedule
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const { template_name, template_id, contact_ids, tag_filter, scheduled_at } = req.body;
    if (!template_name || !scheduled_at) return res.status(400).json({ error: 'template_name and scheduled_at required' });
    const [result] = await pool.query(
      'INSERT INTO scheduled_broadcasts (owner_id, template_name, template_id, contact_ids, tag_filter, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, template_name, template_id || null, JSON.stringify(contact_ids || null), tag_filter || null, scheduled_at]
    );
    res.status(201).json({ id: result.insertId, message: 'Broadcast scheduled' });
  } catch (err) {
    console.error('Schedule broadcast error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/broadcast/scheduled/:id
router.delete('/scheduled/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE scheduled_broadcasts SET status = ? WHERE id = ? AND owner_id = ?', ['cancelled', req.params.id, req.user.id]);
    res.json({ message: 'Scheduled broadcast cancelled' });
  } catch (err) {
    console.error('Cancel scheduled error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
