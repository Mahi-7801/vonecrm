const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const axios = require('axios');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendPaymentConfirmationEmail } = require('../services/emailService');

const router = express.Router();

// GET /api/plans - public list of active plans
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans WHERE active = TRUE ORDER BY price ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/plans/all - admin: list all plans
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get all plans error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plans - admin: create plan
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, duration_days, max_messages, max_contacts, features } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

    const [result] = await pool.query(
      'INSERT INTO plans (name, description, price, duration_days, max_messages, max_contacts, features) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, price, duration_days || 30, max_messages || -1, max_contacts || -1, JSON.stringify(features || [])]
    );

    const [rows] = await pool.query('SELECT * FROM plans WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/plans/:id - admin: update plan
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, duration_days, max_messages, max_contacts, features, active } = req.body;
    const [existing] = await pool.query('SELECT id FROM plans WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Plan not found' });

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (duration_days !== undefined) { updates.push('duration_days = ?'); values.push(duration_days); }
    if (max_messages !== undefined) { updates.push('max_messages = ?'); values.push(max_messages); }
    if (max_contacts !== undefined) { updates.push('max_contacts = ?'); values.push(max_contacts); }
    if (features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(features)); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE plans SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/plans/:id - admin: delete plan
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM plans WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plans/:id/create-order - create Razorpay order for plan purchase
router.post('/:id/create-order', authMiddleware, async (req, res) => {
  try {
    const [planRows] = await pool.query('SELECT * FROM plans WHERE id = ? AND active = TRUE', [req.params.id]);
    if (planRows.length === 0) return res.status(404).json({ error: 'Plan not found' });

    const plan = planRows[0];

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'your-razorpay-secret') {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const order = await razorpay.orders.create({
        amount: Math.round(plan.price * 100),
        currency: 'INR',
        receipt: `plan_${plan.id}_user_${req.user.id}_${Date.now()}`
      });

      return res.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        plan_name: plan.name,
        user_email: req.user.email
      });
    }

    // Fallback: simulate for testing without Razorpay
    res.json({
      order_id: `order_test_plan_${plan.id}_${Date.now()}`,
      amount: Math.round(plan.price * 100),
      currency: 'INR',
      key_id: 'test_key',
      plan_name: plan.name,
      user_email: req.user.email,
      test_mode: true
    });
  } catch (err) {
    console.error('Create plan order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/plans/verify-payment - verify Razorpay payment and activate subscription
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id, test_mode } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

    // Verify signature (skip for test mode)
    if (!test_mode && razorpay_signature && process.env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (razorpay_signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

    const [planRows] = await pool.query('SELECT * FROM plans WHERE id = ? AND active = TRUE', [plan_id]);
    if (planRows.length === 0) return res.status(404).json({ error: 'Plan not found' });

    const plan = planRows[0];

    // Record payment
    const [payResult] = await pool.query(
      'INSERT INTO payments (owner_id, amount, method, razorpay_payment_id, note) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, plan.price, test_mode ? 'manual' : 'razorpay', razorpay_payment_id || null, `Plan: ${plan.name}`]
    );

    // Cancel any existing active subscription
    await pool.query(
      "UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'",
      [req.user.id]
    );

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const [subResult] = await pool.query(
      'INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, payment_id) VALUES (?, ?, ?, NOW(), ?, ?)',
      [req.user.id, plan_id, 'active', expiresAt, payResult.insertId]
    );

    // Auto-register user's contacts with Meta
    let registered = 0;
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );
    const [contacts] = await pool.query(
      'SELECT phone FROM contacts WHERE owner_id = ?',
      [req.user.id]
    );

    if (waNumbers.length > 0 && contacts.length > 0 && process.env.WHATSAPP_SYSTEM_USER_TOKEN) {
      const phone_number_id = waNumbers[0].phone_number_id;
      for (const contact of contacts) {
        try {
          await axios.post(
            `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${phone_number_id}/register`,
            { messaging_product: 'whatsapp', to: contact.phone },
            { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
          );
          registered++;
        } catch (regErr) {}
      }
    }

    // Send confirmation email (non-blocking)
    try {
      const [userRow] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (userRow.length > 0) {
        sendPaymentConfirmationEmail({
          userEmail: userRow[0].email,
          userName: userRow[0].email.split('@')[0],
          planName: plan.name,
          amount: plan.price,
          paymentId: razorpay_payment_id || `TEST-${Date.now()}`,
          expiresAt
        });
      }
    } catch (emailErr) {
      console.error('Email send error (non-fatal):', emailErr.message);
    }

    res.json({
      message: `Subscribed to ${plan.name}! ${registered > 0 ? `${registered} contacts registered.` : ''} A confirmation email has been sent.`,
      subscription: {
        id: subResult.insertId,
        plan: plan.name,
        expires_at: expiresAt
      }
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plans/:id/subscribe - user: purchase a plan (balance-based)
router.post('/:id/subscribe', authMiddleware, async (req, res) => {
  try {
    const [planRows] = await pool.query('SELECT * FROM plans WHERE id = ? AND active = TRUE', [req.params.id]);
    if (planRows.length === 0) return res.status(404).json({ error: 'Plan not found or inactive' });

    const plan = planRows[0];

    // Check user balance
    const [userRows] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    const balance = userRows[0]?.balance || 0;
    if (balance < plan.price) {
      return res.status(400).json({ error: `Insufficient balance. Required: ₹${plan.price}, Available: ₹${balance}` });
    }

    // Deduct balance
    await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [plan.price, req.user.id]);

    // Record payment
    const [payResult] = await pool.query(
      'INSERT INTO payments (owner_id, amount, method, note) VALUES (?, ?, ?, ?)',
      [req.user.id, plan.price, 'manual', `Subscription: ${plan.name}`]
    );

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Cancel any existing active subscription
    await pool.query(
      "UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'",
      [req.user.id]
    );

    const [subResult] = await pool.query(
      'INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, payment_id) VALUES (?, ?, ?, NOW(), ?, ?)',
      [req.user.id, req.params.id, 'active', expiresAt, payResult.insertId]
    );

    // Auto-register user's contacts with Meta to remove sandbox restrictions
    let registered = 0;
    const [waNumbers] = await pool.query(
      'SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
      [req.user.id]
    );
    const [contacts] = await pool.query(
      'SELECT phone FROM contacts WHERE owner_id = ?',
      [req.user.id]
    );

    if (waNumbers.length > 0 && contacts.length > 0 && process.env.WHATSAPP_SYSTEM_USER_TOKEN) {
      const phone_number_id = waNumbers[0].phone_number_id;
      for (const contact of contacts) {
        try {
          await axios.post(
            `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${phone_number_id}/register`,
            { messaging_product: 'whatsapp', to: contact.phone },
            { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
          );
          registered++;
        } catch (regErr) {
          // Number may already be registered
        }
      }
    }

    // Send confirmation email (non-blocking)
    try {
      const [userRow] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (userRow.length > 0) {
        sendPaymentConfirmationEmail({
          userEmail: userRow[0].email,
          userName: userRow[0].email.split('@')[0],
          planName: plan.name,
          amount: plan.price,
          paymentId: `BAL-${payResult.insertId}`,
          expiresAt
        });
      }
    } catch (emailErr) {
      console.error('Email send error (non-fatal):', emailErr.message);
    }

    res.json({
      message: `Subscribed to ${plan.name} successfully! ${registered > 0 ? `${registered} contacts registered for messaging.` : ''} A confirmation email has been sent.`,
      subscription: {
        id: subResult.insertId,
        plan: plan.name,
        expires_at: expiresAt,
        balance_remaining: balance - plan.price,
        contacts_registered: registered
      }
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/plans/my-subscription - user: get current subscription
router.get('/my-subscription', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, p.name as plan_name, p.price, p.duration_days, p.max_messages, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
       ORDER BY s.expires_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/plans/admin/subscriptions - admin: all subscriptions
router.get('/admin/subscriptions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.email, p.name as plan_name, p.price
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get all subscriptions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
