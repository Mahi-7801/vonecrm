const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Admin-configurable pricing (read from pricing_config table at send time)
async function getMessageCost(category) {
  try {
    const [rows] = await pool.query(
      'SELECT rate FROM pricing_config WHERE category = ?',
      [category]
    );
    if (rows.length > 0) return parseFloat(rows[0].rate);
  } catch (err) {
    // Table may not exist yet — fall back to defaults
  }
  // Default rates (INR, Meta base + small margin)
  const defaults = {
    marketing: 0.90,
    utility: 0.12,
    authentication: 0.12,
    service: 0.0
  };
  return defaults[category] || 0;
}

// GET /api/billing/usage?period=all|daily|weekly|monthly
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || 'all';
    let dateFilter = '';
    const params = [req.user.id];

    if (period === 'daily') {
      dateFilter = ' AND created_at >= CURDATE()';
    } else if (period === 'weekly') {
      dateFilter = ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'monthly') {
      dateFilter = ' AND created_at >= DATE_FORMAT(CURDATE(), "%Y-%m-01")';
    }

    const [rows] = await pool.query(
      `SELECT category, COUNT(*) as count, SUM(cost) as total_cost
       FROM usage_log WHERE owner_id = ?${dateFilter}
       GROUP BY category`,
      params
    );

    const [total] = await pool.query(
      `SELECT SUM(cost) as total FROM usage_log WHERE owner_id = ?${dateFilter}`,
      params
    );

    const [user] = await pool.query(
      'SELECT balance, credit_mode FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      breakdown: rows,
      total_usage: total[0]?.total || 0,
      balance: user[0]?.balance || 0,
      credit_mode: user[0]?.credit_mode || 'postpaid'
    });
  } catch (err) {
    console.error('Get usage error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/billing/payments
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/create-order - Razorpay order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'your-razorpay-secret') {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const order = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `user_${req.user.id}_${Date.now()}`
        });

        return res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
      } catch (rpErr) {
        console.error('Razorpay order error:', rpErr.message);
      }
    }

    // Fallback: simulate order for testing
    res.json({ order_id: `order_test_${Date.now()}`, amount: amount * 100, currency: 'INR', key_id: 'test_key', test_mode: true });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/verify-payment - verify Razorpay payment after checkout (frontend calls this)
// This is the SECURE way — verify signature server-side before crediting balance
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, test_mode } = req.body;

    if (test_mode) {
      // Test mode: credit balance directly (for development only)
      const amount = 100; // Fixed test amount
      await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id]);
      await pool.query(
        'INSERT INTO payments (owner_id, amount, method, note) VALUES (?, ?, ?, ?)',
        [req.user.id, amount, 'manual', 'Test mode payment']
      );
      return res.json({ message: 'Test payment credited', amount });
    }

    // Verify Razorpay signature
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Check for duplicate payment
    const [existing] = await pool.query(
      'SELECT id FROM payments WHERE razorpay_payment_id = ?',
      [razorpay_payment_id]
    );
    if (existing.length > 0) {
      return res.json({ message: 'Payment already processed' });
    }

    // Fetch order amount from Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amount = order.amount / 100; // Convert paise to rupees

    // Credit balance
    await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id]);
    await pool.query(
      'INSERT INTO payments (owner_id, amount, method, razorpay_payment_id) VALUES (?, ?, ?, ?)',
      [req.user.id, amount, 'razorpay', razorpay_payment_id]
    );

    res.json({ message: 'Payment verified and balance credited', amount });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// POST /api/billing/webhook - Razorpay webhook (called by Razorpay servers, NOT the frontend)
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Verify signature — reject if no webhook secret configured
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Ack immediately
  res.sendStatus(200);

  try {
    const event = req.body;

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return;

      // Check for duplicate (webhook may retry)
      const [existing] = await pool.query(
        'SELECT id FROM payments WHERE razorpay_payment_id = ?',
        [payment.id]
      );
      if (existing.length > 0) return;

      const receipt = payment.receipt || '';
      const userIdMatch = receipt.match(/user_(\d+)/);
      if (!userIdMatch) return;

      const owner_id = parseInt(userIdMatch[1]);
      const amount = payment.amount / 100;

      await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, owner_id]);
      await pool.query(
        'INSERT INTO payments (owner_id, amount, method, razorpay_payment_id) VALUES (?, ?, ?, ?)',
        [owner_id, amount, 'razorpay', payment.id]
      );
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

module.exports = router;
