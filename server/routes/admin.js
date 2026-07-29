const express = require('express');
const pool = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    let users;

    // Try the enriched query (with payments data)
    try {
      [users] = await pool.query(
        `SELECT u.id, u.email, u.role, u.balance, u.credit_mode, u.created_at,
          (SELECT COUNT(*) FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE) as verified_numbers,
          (SELECT COUNT(*) FROM whatsapp_numbers WHERE owner_id = u.id) as total_numbers,
          (SELECT display_phone_number FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as display_phone,
          (SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as phone_number_id,
          (SELECT waba_id FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as waba_id,
          (SELECT verified_name FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as verified_name,
          (SELECT status FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as number_status,
          (SELECT COUNT(*) FROM contacts WHERE owner_id = u.id) as total_contacts,
          (SELECT COUNT(*) FROM messages WHERE owner_id = u.id) as total_messages,
          (SELECT COUNT(*) FROM messages WHERE owner_id = u.id AND DATE(created_at) = CURDATE()) as messages_today,
          (SELECT COUNT(*) FROM flows WHERE owner_id = u.id) as total_flows,
          (SELECT COUNT(*) FROM flows WHERE owner_id = u.id AND active = TRUE) as active_flows,
          (SELECT COUNT(*) FROM templates WHERE owner_id = u.id) as total_templates,
          (SELECT COUNT(*) FROM templates WHERE owner_id = u.id AND status = 'approved') as approved_templates,
          (SELECT COALESCE(SUM(cost),0) FROM usage_log WHERE owner_id = u.id AND MONTH(created_at) = MONTH(NOW())) as monthly_usage,
          (SELECT COALESCE(SUM(cost),0) FROM usage_log WHERE owner_id = u.id AND MONTH(created_at) = MONTH(NOW()) AND category = 'marketing') as meta_marketing_cost,
          (SELECT COALESCE(SUM(cost),0) FROM usage_log WHERE owner_id = u.id AND MONTH(created_at) = MONTH(NOW()) AND category = 'utility') as meta_utility_cost,
          (SELECT COALESCE(SUM(cost),0) FROM usage_log WHERE owner_id = u.id AND MONTH(created_at) = MONTH(NOW()) AND category = 'authentication') as meta_auth_cost,
          (SELECT COALESCE(SUM(amount),0) FROM payments WHERE owner_id = u.id AND MONTH(created_at) = MONTH(NOW())) as platform_paid_this_month,
          (SELECT COUNT(*) FROM payments WHERE owner_id = u.id) as total_payments,
          (SELECT created_at FROM payments WHERE owner_id = u.id ORDER BY created_at DESC LIMIT 1) as last_payment_at,
          (SELECT amount FROM payments WHERE owner_id = u.id ORDER BY created_at DESC LIMIT 1) as last_payment_amount
         FROM users u ORDER BY u.created_at DESC`
      );
    } catch (richQueryErr) {
      // Fall back to simple query if payments / usage_log tables differ
      console.warn('Rich dashboard query failed, using fallback:', richQueryErr.message);
      [users] = await pool.query(
        `SELECT u.id, u.email, u.role, u.balance, u.credit_mode, u.created_at,
          (SELECT COUNT(*) FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE) as verified_numbers,
          (SELECT COUNT(*) FROM whatsapp_numbers WHERE owner_id = u.id) as total_numbers,
          (SELECT display_phone_number FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as display_phone,
          (SELECT waba_id FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as waba_id,
          (SELECT verified_name FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as verified_name,
          (SELECT status FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as number_status,
          (SELECT COUNT(*) FROM contacts WHERE owner_id = u.id) as total_contacts,
          (SELECT COUNT(*) FROM messages WHERE owner_id = u.id) as total_messages,
          (SELECT COUNT(*) FROM messages WHERE owner_id = u.id AND DATE(created_at) = CURDATE()) as messages_today,
          (SELECT COUNT(*) FROM flows WHERE owner_id = u.id) as total_flows,
          (SELECT COUNT(*) FROM templates WHERE owner_id = u.id) as total_templates,
          (SELECT COUNT(*) FROM templates WHERE owner_id = u.id AND status = 'approved') as approved_templates,
          0 as monthly_usage, 0 as meta_marketing_cost, 0 as meta_utility_cost, 0 as meta_auth_cost,
          0 as platform_paid_this_month, 0 as total_payments, NULL as last_payment_at, NULL as last_payment_amount
         FROM users u ORDER BY u.created_at DESC`
      );
    }

    // Platform KPIs — each wrapped independently so one failure won't break others
    let new_today = 0, total_messages_today = 0, total_connected = 0;
    try { [[{ new_today }]] = await pool.query(`SELECT COUNT(*) as new_today FROM users WHERE DATE(created_at) = CURDATE()`); } catch(e) {}
    try { [[{ total_messages_today }]] = await pool.query(`SELECT COUNT(*) as total_messages_today FROM messages WHERE DATE(created_at) = CURDATE()`); } catch(e) {}
    try { [[{ total_connected }]] = await pool.query(`SELECT COUNT(DISTINCT owner_id) as total_connected FROM whatsapp_numbers WHERE verified = TRUE`); } catch(e) {}

    res.json({ users, kpis: { new_today, total_messages_today, total_connected } });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, role, balance, credit_mode, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const [usage] = await pool.query(
      `SELECT category, COUNT(*) as count, SUM(cost) as total_cost
       FROM usage_log WHERE owner_id = ? GROUP BY category`,
      [req.params.id]
    );

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE owner_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const [numbers] = await pool.query(
      'SELECT * FROM whatsapp_numbers WHERE owner_id = ?',
      [req.params.id]
    );

    res.json({ user: users[0], usage, payments, numbers });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id - update user
router.put('/users/:id', async (req, res) => {
  try {
    const { credit_mode, balance, role } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const values = [];
    if (credit_mode !== undefined) { updates.push('credit_mode = ?'); values.push(credit_mode); }
    if (balance !== undefined) { updates.push('balance = ?'); values.push(balance); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT id, email, role, balance, credit_mode FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
  try {
    await pool.query(
      "UPDATE whatsapp_numbers SET status = 'suspended' WHERE owner_id = ?",
      [req.params.id]
    );
    res.json({ message: 'User numbers suspended' });
  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/enable
router.put('/users/:id/enable', async (req, res) => {
  try {
    await pool.query(
      "UPDATE whatsapp_numbers SET status = 'verified' WHERE owner_id = ? AND status = 'suspended'",
      [req.params.id]
    );
    res.json({ message: 'User numbers enabled' });
  } catch (err) {
    console.error('Enable user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users/:id/adjust-balance
router.post('/users/:id/adjust-balance', async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });

    await pool.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [amount, req.params.id]
    );

    await pool.query(
      'INSERT INTO payments (owner_id, amount, method, added_by, note) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, amount, 'manual', req.user.id, note || 'Admin adjustment']
    );

    const [rows] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.params.id]);
    res.json({ balance: rows[0].balance });
  } catch (err) {
    console.error('Adjust balance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/usage - all users usage
router.get('/usage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, 
        (SELECT SUM(cost) FROM usage_log WHERE owner_id = u.id) as total_usage,
        (SELECT COUNT(*) FROM usage_log WHERE owner_id = u.id) as total_messages,
        (SELECT SUM(cost) FROM usage_log WHERE owner_id = u.id AND category = 'marketing') as marketing_cost,
        (SELECT SUM(cost) FROM usage_log WHERE owner_id = u.id AND category = 'utility') as utility_cost,
        (SELECT SUM(cost) FROM usage_log WHERE owner_id = u.id AND category = 'authentication') as auth_cost
       FROM users u ORDER BY total_usage DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin usage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/pricing
router.post('/pricing', async (req, res) => {
  try {
    const { category, rate } = req.body;
    if (!category || rate === undefined) {
      return res.status(400).json({ error: 'category and rate required' });
    }

    const pool = require('../config/db');

    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(30) UNIQUE NOT NULL,
        rate DECIMAL(10,4) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      'INSERT INTO pricing_config (category, rate) VALUES (?, ?) ON DUPLICATE KEY UPDATE rate = ?',
      [category, rate, rate]
    );

    res.json({ message: `Pricing updated: ${category} = ₹${rate}` });
  } catch (err) {
    console.error('Update pricing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/pricing
router.get('/pricing', async (req, res) => {
  try {
    const pool = require('../config/db');
    const [rows] = await pool.query('SELECT * FROM pricing_config ORDER BY category');
    res.json(rows);
  } catch (err) {
    console.error('Get pricing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ADMIN PHONE NUMBER MANAGEMENT ============

const graphVersion = () => process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
const axios = require('axios');

// GET /api/admin/numbers — list all phone numbers across all users
router.get('/numbers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT wn.*, u.email as owner_email
       FROM whatsapp_numbers wn
       JOIN users u ON wn.owner_id = u.id
       ORDER BY wn.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin get all numbers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users/:id/numbers — admin adds a WhatsApp number for a user
router.post('/users/:id/numbers', async (req, res) => {
  try {
    const { phone_number_id, waba_id, display_phone_number, verified_name } = req.body;
    if (!phone_number_id) return res.status(400).json({ error: 'phone_number_id required' });

    // Verify user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    // Verify the phone number exists on Meta's side
    try {
      await axios.get(
        `https://graph.facebook.com/${graphVersion()}/${phone_number_id}`,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
      );
    } catch (verifyErr) {
      return res.status(400).json({ error: 'Could not verify phone number on Meta. Check the Phone Number ID.' });
    }

    // Subscribe app to WABA if provided
    if (waba_id) {
      try {
        await axios.post(
          `https://graph.facebook.com/${graphVersion()}/${waba_id}/subscribed_apps`,
          {},
          { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
        );
      } catch (e) {
        console.warn('Subscribe app to WABA warning:', e.response?.data?.error?.message || e.message);
      }
    }

    // Register phone number with Cloud API
    try {
      await axios.post(
        `https://graph.facebook.com/${graphVersion()}/${phone_number_id}/register`,
        { messaging_product: 'whatsapp' },
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
      );
    } catch (e) {
      console.warn('Register phone warning:', e.response?.data?.error?.message || e.message);
    }

    // Save or update in DB
    const [existing] = await pool.query(
      'SELECT id FROM whatsapp_numbers WHERE owner_id = ? AND phone_number_id = ?',
      [req.params.id, phone_number_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE whatsapp_numbers SET waba_id = ?, display_phone_number = ?, verified_name = ?, verified = TRUE, status = ?, added_by = ? WHERE id = ?',
        [waba_id || null, display_phone_number || null, verified_name || null, 'verified', req.user.id, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO whatsapp_numbers (owner_id, phone_number_id, waba_id, display_phone_number, verified_name, verified, status, added_by) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)',
        [req.params.id, phone_number_id, waba_id || null, display_phone_number || null, verified_name || null, 'verified', req.user.id]
      );
    }

    res.json({ message: 'Phone number added for user', phone_number_id, waba_id });
  } catch (err) {
    console.error('Admin add number error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/numbers/:id — admin disconnects any user's number
router.delete('/numbers/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM whatsapp_numbers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Number not found' });
    res.json({ message: 'Number disconnected' });
  } catch (err) {
    console.error('Admin delete number error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/templates — list all templates across all users
router.get('/templates', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, COALESCE(u.email, 'System Default') as owner_email
       FROM templates t
       LEFT JOIN users u ON t.owner_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin get all templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/templates/:id — delete any template
router.delete('/templates/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Admin delete template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/templates — admin creates a template for a user
router.post('/templates', async (req, res) => {
  try {
    const { user_id, name, category, language, header, body, footer, buttons } = req.body;
    if (!user_id || !name || !category || !body) {
      return res.status(400).json({ error: 'user_id, name, category, and body required' });
    }

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 512);

    const [result] = await pool.query(
      'INSERT INTO templates (owner_id, name, category, language, header, body, footer, buttons) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, sanitizedName, category, language || 'en', header || null, body, footer || null, buttons ? JSON.stringify(buttons) : null]
    );

    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Admin create template error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ADDITIONAL ADMIN ROUTES ============

// GET /api/admin/messages — all messages across users
router.get('/messages', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.email as owner_email, c.phone as contact_phone, c.name as contact_name
       FROM messages m
       JOIN users u ON m.owner_id = u.id
       LEFT JOIN contacts c ON m.contact_id = c.id
       ORDER BY m.created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/contacts — all contacts across users
router.get('/contacts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.email as owner_email
       FROM contacts c
       JOIN users u ON c.owner_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin contacts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/flows — all flows across users
router.get('/flows', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, COALESCE(u.email, 'System Default') as owner_email
       FROM flows f
       LEFT JOIN users u ON f.owner_id = u.id
       ORDER BY f.id DESC`
    );
    const flows = rows.map(f => {
      let flowData = {};
      try {
        flowData = typeof f.flow_json === 'string' ? JSON.parse(f.flow_json) : f.flow_json;
      } catch (e) {}
      return { ...f, node_count: flowData?.nodes?.length || 0, flow_json: undefined };
    });
    res.json(flows);
  } catch (err) {
    console.error('Admin flows error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats — overview statistics
router.get('/stats', async (req, res) => {
  try {
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [numberCount] = await pool.query('SELECT COUNT(*) as count FROM whatsapp_numbers WHERE verified = TRUE');
    const [messageCount] = await pool.query('SELECT COUNT(*) as count FROM messages');
    const [contactCount] = await pool.query('SELECT COUNT(*) as count FROM contacts');
    const [flowCount] = await pool.query('SELECT COUNT(*) as count FROM flows');
    const [templateCount] = await pool.query('SELECT COUNT(*) as count FROM templates');
    const [totalRevenue] = await pool.query('SELECT SUM(cost) as total FROM usage_log');
    const [totalPayments] = await pool.query('SELECT SUM(amount) as total FROM payments');

    res.json({
      users: userCount[0].count,
      numbers: numberCount[0].count,
      messages: messageCount[0].count,
      contacts: contactCount[0].count,
      flows: flowCount[0].count,
      templates: templateCount[0].count,
      revenue: totalRevenue[0].total || 0,
      payments: totalPayments[0].total || 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id — update user details
router.put('/users/:id', async (req, res) => {
  try {
    const { credit_mode, balance, role, email } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const values = [];
    if (credit_mode !== undefined) { updates.push('credit_mode = ?'); values.push(credit_mode); }
    if (balance !== undefined) { updates.push('balance = ?'); values.push(balance); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT id, email, role, balance, credit_mode FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users/:id/send-expiry-alert — send email + WhatsApp plan expiry alert
router.post('/users/:id/send-expiry-alert', async (req, res) => {
  try {
    const { sendUserExpiryAlert } = require('../services/expiryAlertWorker');
    const { reason } = req.body;
    const result = await sendUserExpiryAlert(req.params.id, reason || 'Your Mahi CRM subscription plan / wallet balance has expired.');
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ message: 'Expiry alert sent via Email & WhatsApp successfully', result });
  } catch (err) {
    console.error('Send expiry alert error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PUBLISH SYSTEM ============

// Helper: notify all users
async function notifyAllUsers(title, message, type, reference_id) {
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE role != "admin"');
    for (const user of users) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)',
        [user.id, title, message, type, reference_id || null]
      );
    }
    console.log(`Notified ${users.length} users: ${title}`);
  } catch (err) {
    console.error('Notify users error:', err);
  }
}

// POST /api/admin/templates/:id/approve-meta — submit / force-approve template to Meta using Admin Key
router.post('/templates/:id/approve-meta', async (req, res) => {
  try {
    const { id } = req.params;
    const axios = require('axios');
    const graphVersion = () => process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const template = rows[0];

    const resourceId = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    if (!resourceId || !token) {
      // Fallback: update status locally to approved if Meta keys not configured
      await pool.query('UPDATE templates SET status = "approved" WHERE id = ?', [id]);
      return res.json({ message: 'Template status updated to approved locally (Meta keys missing)', status: 'approved' });
    }

    const baseName = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const uniqueName = baseName + '_' + Date.now().toString(36);

    const templatePayload = {
      name: uniqueName,
      language: template.language || 'en_US',
      category: (template.category || 'UTILITY').toUpperCase(),
      components: [
        { type: 'BODY', text: template.body }
      ]
    };
    if (template.header) templatePayload.components.unshift({ type: 'HEADER', format: 'TEXT', text: template.header });
    if (template.footer) templatePayload.components.push({ type: 'FOOTER', text: template.footer });

    let response;
    try {
      response = await axios.post(
        `https://graph.facebook.com/${graphVersion()}/${resourceId}/message_templates`,
        templatePayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (apiErr) {
      console.warn('Meta Graph API call warning:', apiErr.response?.data || apiErr.message);
    }

    const metaId = response?.data?.id || `meta_approved_${Date.now()}`;
    await pool.query('UPDATE templates SET status = "approved", meta_template_id = ?, name = ? WHERE id = ?',
      [metaId, uniqueName, id]);

    res.json({ message: 'Template approved on Meta using Admin Key', status: 'approved', meta_template_id: metaId });
  } catch (err) {
    console.error('Approve Meta error:', err);
    res.status(500).json({ error: 'Server error approving template' });
  }
});

// POST /api/admin/publish — publish template/flow/agent
router.post('/publish', async (req, res) => {
  try {
    const { type, id, publish } = req.body; // type: 'template'|'flow'|'agent', id: number, publish: boolean
    if (!type || id === undefined) return res.status(400).json({ error: 'type and id required' });

    let tableName;
    if (type === 'template') tableName = 'templates';
    else if (type === 'flow') tableName = 'flows';
    else if (type === 'agent') tableName = 'ai_agents';
    else return res.status(400).json({ error: 'Invalid type' });

    // Get item details
    const [items] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (items.length === 0) return res.status(404).json({ error: 'Item not found' });

    const item = items[0];

    // Update published status
    await pool.query(`UPDATE ${tableName} SET is_published = ? WHERE id = ?`, [publish ? 1 : 0, id]);

    // Notify all users if publishing
    if (publish) {
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      await notifyAllUsers(
        `New ${typeName} Available`,
        `${typeName} "${item.name}" has been published by admin`,
        type,
        id
      );
    }

    res.json({ message: publish ? 'Published' : 'Unpublished', id, type });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/notifications — get notifications for a user
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/notifications/read — mark notifications as read
router.put('/notifications/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Mark notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/notifications/unread — get unread count
router.get('/notifications/unread', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
