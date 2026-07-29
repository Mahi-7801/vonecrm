const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// GET /api/contacts — list all contacts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contacts WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/contacts/labels — list labels (MUST BE BEFORE /:id)
router.get('/labels', authMiddleware, async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS contact_labels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#25D366',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`);
    const [rows] = await pool.query('SELECT * FROM contact_labels WHERE owner_id = ?', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Get labels error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/contacts/labels — create label (MUST BE BEFORE /:id)
router.post('/labels', authMiddleware, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    await pool.query(`CREATE TABLE IF NOT EXISTS contact_labels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#25D366',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`);
    const [result] = await pool.query(
      'INSERT INTO contact_labels (owner_id, name, color) VALUES (?, ?, ?)',
      [req.user.id, name, color || '#25D366']
    );
    res.status(201).json({ id: result.insertId, name, color: color || '#25D366' });
  } catch (err) {
    console.error('Create label error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/contacts/labels/:id — delete label
router.delete('/labels/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM contact_labels WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Label deleted' });
  } catch (err) {
    console.error('Delete label error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/contacts/:id — fetch single contact
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contacts WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get contact error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/contacts — create single contact
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, tags, custom_fields } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    let cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const [result] = await pool.query(
      'INSERT INTO contacts (owner_id, name, phone, tags, custom_fields) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name || null, cleanPhone, JSON.stringify(tags || []), JSON.stringify(custom_fields || {})]
    );

    // Auto-register with Meta
    try {
      const [waNumbers] = await pool.query(
        'SELECT phone_number_id FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
        [req.user.id]
      );
      if (waNumbers.length > 0 && process.env.WHATSAPP_SYSTEM_USER_TOKEN) {
        await axios.post(
          `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'}/${waNumbers[0].phone_number_id}/register`,
          { messaging_product: 'whatsapp', to: cleanPhone },
          { headers: { Authorization: `Bearer ${process.env.WHATSAPP_SYSTEM_USER_TOKEN}` } }
        );
      }
    } catch (regErr) {
      // Silent catch
    }

    const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/contacts/:id — update contact
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, tags, custom_fields } = req.body;
    const [existing] = await pool.query(
      'SELECT id FROM contacts WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Contact not found' });

    await pool.query(
      'UPDATE contacts SET name = ?, phone = ?, tags = ?, custom_fields = ? WHERE id = ? AND owner_id = ?',
      [name, phone, JSON.stringify(tags || []), JSON.stringify(custom_fields || {}), req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/contacts/:id — delete contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const contactId = req.params.id;

    // Delete from all tables that reference contacts(id) to avoid foreign key errors
    // 1. flow_messages (via flow_conversations, will cascade if ON DELETE CASCADE is set)
    try {
      await pool.query(
        `DELETE fm FROM flow_messages fm
         JOIN flow_conversations fc ON fm.conversation_id = fc.id
         WHERE fc.contact_id = ?`,
        [contactId]
      );
    } catch (e) {}

    // 2. flow_conversations
    try {
      await pool.query('DELETE FROM flow_conversations WHERE contact_id = ?', [contactId]);
    } catch (e) {}

    // 3. flow_runs
    try {
      await pool.query('DELETE FROM flow_runs WHERE contact_id = ?', [contactId]);
    } catch (e) {}

    // 4. chat_assignments
    try {
      await pool.query('DELETE FROM chat_assignments WHERE contact_id = ?', [contactId]);
    } catch (e) {}

    // 5. usage_log (references messages, clean up after messages are deleted)
    try {
      await pool.query(
        `DELETE ul FROM usage_log ul
         JOIN messages m ON ul.message_id = m.id
         WHERE m.contact_id = ?`,
        [contactId]
      );
    } catch (e) {}

    // 6. messages
    await pool.query('DELETE FROM messages WHERE contact_id = ? AND owner_id = ?', [contactId, req.user.id]);

    // 7. drip_progress (may not exist in all schemas)
    try {
      await pool.query('DELETE FROM drip_progress WHERE contact_id = ?', [contactId]);
    } catch (e) {}

    // 8. Finally delete the contact
    const [result] = await pool.query(
      'DELETE FROM contacts WHERE id = ? AND owner_id = ?',
      [contactId, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/contacts/import — bulk CSV upload
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });

    const filePath = req.file.path;
    const contactsToInsert = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          const phone = data.phone || data.Phone || data.mobile || data.Mobile || data.number || data.Number;
          const name = data.name || data.Name || data.first_name || data.FirstName || '';
          const tagsStr = data.tags || data.Tags || '';

          if (phone) {
            let cleanPhone = String(phone).replace(/[\s\-()]/g, '');
            if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
              cleanPhone = '91' + cleanPhone;
            }

            let tags = [];
            if (tagsStr) {
              tags = String(tagsStr).split(',').map(t => t.trim()).filter(Boolean);
            }

            contactsToInsert.push({ name: name.trim(), phone: cleanPhone, tags });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    let imported = 0;
    let skipped = 0;
    const importedPhones = [];

    for (const c of contactsToInsert) {
      try {
        const [existing] = await pool.query(
          'SELECT id FROM contacts WHERE phone = ? AND owner_id = ?',
          [c.phone, req.user.id]
        );

        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO contacts (owner_id, name, phone, tags) VALUES (?, ?, ?, ?)',
            [req.user.id, c.name || null, c.phone, JSON.stringify(c.tags)]
          );
          imported++;
          importedPhones.push(c.phone);
        } else {
          skipped++;
        }
      } catch (err) {
        skipped++;
      }
    }

    try { fs.unlinkSync(filePath); } catch (e) {}

    let message = `Imported ${imported} contacts`;
    if (skipped > 0) message += ` (${skipped} skipped)`;

    res.json({ message, imported, skipped });
  } catch (err) {
    console.error('Import contacts error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// POST /api/contacts/:id/label — assign label to contact
router.post('/:id/label', authMiddleware, async (req, res) => {
  try {
    const { label_id } = req.body;
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS label_id INT NULL');
    await pool.query('UPDATE contacts SET label_id = ? WHERE id = ? AND owner_id = ?', [label_id, req.params.id, req.user.id]);
    res.json({ message: 'Label assigned' });
  } catch (err) {
    console.error('Assign label error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
