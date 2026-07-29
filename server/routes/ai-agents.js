const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/ai-agents - List user's own + published AI agents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ai_agents WHERE owner_id = ? OR is_published = TRUE ORDER BY is_prebuilt DESC, id ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get AI agents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ai-agents/:id - Get single AI agent
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ai_agents WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get AI agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ai-agents - Create AI agent
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, role, specialty, system_prompt, personality, avatar_emoji } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const [result] = await pool.query(
      'INSERT INTO ai_agents (owner_id, name, role, specialty, system_prompt, personality, avatar_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, role || 'general', specialty || '', system_prompt || '', personality || '', avatar_emoji || '🤖']
    );

    const [rows] = await pool.query('SELECT * FROM ai_agents WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create AI agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/ai-agents/:id - Update AI agent
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, role, specialty, system_prompt, personality, avatar_emoji } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM ai_agents WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agent not found' });

    await pool.query(
      'UPDATE ai_agents SET name = ?, role = ?, specialty = ?, system_prompt = ?, personality = ?, avatar_emoji = ? WHERE id = ? AND owner_id = ?',
      [name, role, specialty, system_prompt, personality, avatar_emoji, req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM ai_agents WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update AI agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/ai-agents/:id - Delete AI agent
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id, is_prebuilt FROM ai_agents WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agent not found' });
    if (existing[0].is_prebuilt) return res.status(400).json({ error: 'Cannot delete pre-built agents' });

    await pool.query('DELETE FROM ai_agents WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    console.error('Delete AI agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
