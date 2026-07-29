const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/drip-sequences
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM drip_sequences WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    // Parse steps JSON
    const sequences = rows.map(r => ({
      ...r,
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps || []
    }));
    res.json(sequences);
  } catch (err) {
    // Table may not exist yet
    res.json([]);
  }
});

// POST /api/drip-sequences
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drip_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        steps JSON,
        active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    const [result] = await pool.query(
      'INSERT INTO drip_sequences (owner_id, name, steps) VALUES (?, ?, ?)',
      [req.user.id, name, JSON.stringify(steps || [])]
    );

    const [rows] = await pool.query('SELECT * FROM drip_sequences WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], steps: steps || [] });
  } catch (err) {
    console.error('Create drip sequence error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/drip-sequences/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, steps, active } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM drip_sequences WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (steps !== undefined) { updates.push('steps = ?'); values.push(JSON.stringify(steps)); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE drip_sequences SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM drip_sequences WHERE id = ?', [req.params.id]);
    res.json({ ...rows[0], steps: typeof rows[0].steps === 'string' ? JSON.parse(rows[0].steps) : rows[0].steps || [] });
  } catch (err) {
    console.error('Update drip sequence error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/drip-sequences/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM drip_sequences WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete drip sequence error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
