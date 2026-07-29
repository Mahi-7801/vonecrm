const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Ensure table has published column
(async () => {
  try {
    await pool.query("ALTER TABLE canned_responses ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE");
    await pool.query("ALTER TABLE canned_responses ADD COLUMN IF NOT EXISTS is_preset BOOLEAN DEFAULT FALSE");
  } catch (e) {}
})();

// GET /api/canned-responses — returns user's own + admin published
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM canned_responses
       WHERE owner_id = ? OR published = TRUE
       ORDER BY is_preset DESC, created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get canned responses error:', err);
    res.json([]);
  }
});

// GET /api/canned-responses/preset — get only admin published presets
router.get('/preset', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM canned_responses WHERE published = TRUE ORDER BY category, shortcut'
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/canned-responses
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { shortcut, message, category } = req.body;
    if (!shortcut || !message) return res.status(400).json({ error: 'shortcut and message required' });

    const [result] = await pool.query(
      'INSERT INTO canned_responses (owner_id, shortcut, message, category) VALUES (?, ?, ?, ?)',
      [req.user.id, shortcut, message, category || 'general']
    );

    const [rows] = await pool.query('SELECT * FROM canned_responses WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create canned response error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/canned-responses/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { shortcut, message, category } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM canned_responses WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      'UPDATE canned_responses SET shortcut = ?, message = ?, category = ? WHERE id = ?',
      [shortcut, message, category, req.params.id]
    );

    const [rows] = await pool.query('SELECT * FROM canned_responses WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update canned response error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/canned-responses/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM canned_responses WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete canned response error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
