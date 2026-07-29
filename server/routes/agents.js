const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/agents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM agents WHERE owner_id = ? ORDER BY id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get agents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/agents
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const [result] = await pool.query(
      'INSERT INTO agents (owner_id, name, email, role) VALUES (?, ?, ?, ?)',
      [req.user.id, name, email, role || 'agent']
    );

    const [rows] = await pool.query('SELECT * FROM agents WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM agents WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    console.error('Delete agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/agents/assign
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { contact_id, agent_id } = req.body;
    if (!contact_id || !agent_id) return res.status(400).json({ error: 'contact_id and agent_id required' });

    // Verify agent belongs to user
    const [agent] = await pool.query(
      'SELECT id FROM agents WHERE id = ? AND owner_id = ?',
      [agent_id, req.user.id]
    );
    if (agent.length === 0) return res.status(404).json({ error: 'Agent not found' });

    // Verify contact belongs to user
    const [contact] = await pool.query(
      'SELECT id FROM contacts WHERE id = ? AND owner_id = ?',
      [contact_id, req.user.id]
    );
    if (contact.length === 0) return res.status(404).json({ error: 'Contact not found' });

    // Remove existing assignment
    await pool.query('DELETE FROM chat_assignments WHERE contact_id = ?', [contact_id]);

    // Create new assignment
    await pool.query(
      'INSERT INTO chat_assignments (contact_id, agent_id) VALUES (?, ?)',
      [contact_id, agent_id]
    );

    res.json({ message: 'Contact assigned to agent' });
  } catch (err) {
    console.error('Assign agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
