const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Webhook Request Logger
app.use((req, res, next) => {
  if (req.url.includes('/webhook') || req.url.includes('/telegram') || req.url.includes('/whatsapp')) {
    console.log(`📡 INCOMING WEBHOOK [${req.method}]: ${req.url}`);
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/flows', require('./routes/flows'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/broadcast', require('./routes/broadcast'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/ai-agents', require('./routes/ai-agents'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/canned-responses', require('./routes/canned-responses'));
app.use('/api/drip-sequences', require('./routes/drip-sequences'));
app.use('/api/integrations', require('./routes/integrations'));

// Dashboard route
app.get('/api/dashboard', require('./middleware/auth').authMiddleware, async (req, res) => {
  const pool = require('./config/db');
  try {
    const [user] = await pool.query(
      'SELECT balance, credit_mode FROM users WHERE id = ?', [req.user.id]
    );
    const [contacts] = await pool.query(
      'SELECT COUNT(*) as count FROM contacts WHERE owner_id = ?', [req.user.id]
    );
    const [chats] = await pool.query(
      `SELECT COUNT(DISTINCT contact_id) as count FROM messages WHERE owner_id = ?`,
      [req.user.id]
    );
    const [usage] = await pool.query(
      `SELECT SUM(cost) as total FROM usage_log WHERE owner_id = ? AND MONTH(created_at) = MONTH(NOW())`,
      [req.user.id]
    );
    const [numbers] = await pool.query(
      'SELECT COUNT(*) as count FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE',
      [req.user.id]
    );

    // Daily message counts for last 7 days (for chart)
    const [dailyMessages] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM messages WHERE owner_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [req.user.id]
    );

    // Recent messages for activity feed
    const [recentMessages] = await pool.query(
      `SELECT m.id, m.body, m.direction, m.status, m.created_at,
              c.name as contact_name, c.phone as contact_phone
       FROM messages m
       LEFT JOIN contacts c ON m.contact_id = c.id
       WHERE m.owner_id = ?
       ORDER BY m.created_at DESC LIMIT 10`,
      [req.user.id]
    );

    // Message category breakdown
    const [categoryBreakdown] = await pool.query(
      `SELECT COALESCE(t.category, 'message') as category, COUNT(*) as count
       FROM messages m
       LEFT JOIN templates t ON m.template_id = t.id
       WHERE m.owner_id = ? AND m.direction = 'outbound'
       GROUP BY category`,
      [req.user.id]
    );

    res.json({
      balance: user[0]?.balance || 0,
      credit_mode: user[0]?.credit_mode || 'postpaid',
      total_contacts: contacts[0]?.count || 0,
      active_chats: chats[0]?.count || 0,
      monthly_usage: usage[0]?.total || 0,
      verified_numbers: numbers[0]?.count || 0,
      daily_messages: dailyMessages,
      recent_messages: recentMessages,
      message_categories: categoryBreakdown
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Broadcast Scheduler - checks every minute for due broadcasts
const pool = require('./config/db');
setInterval(async () => {
  try {
    const [due] = await pool.query(
      "SELECT * FROM scheduled_broadcasts WHERE status = 'pending' AND scheduled_at <= NOW()"
    );
    for (const broadcast of due) {
      try {
        // Mark as sent immediately to prevent re-processing
        await pool.query("UPDATE scheduled_broadcasts SET status = 'sent' WHERE id = ?", [broadcast.id]);

        // Get user's WA number
        const [waNumbers] = await pool.query(
          'SELECT phone_number_id, access_token FROM whatsapp_numbers WHERE owner_id = ? AND verified = TRUE LIMIT 1',
          [broadcast.owner_id]
        );
        if (waNumbers.length === 0) continue;

        const { phone_number_id, access_token } = waNumbers[0];
        const token = access_token || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
        const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';

        // Get contacts
        let contactIds = broadcast.contact_ids;
        if (typeof contactIds === 'string') contactIds = JSON.parse(contactIds);
        let contacts;
        if (contactIds && contactIds.length > 0) {
          const placeholders = contactIds.map(() => '?').join(',');
          [contacts] = await pool.query(`SELECT * FROM contacts WHERE id IN (${placeholders}) AND owner_id = ?`, [...contactIds, broadcast.owner_id]);
        } else {
          [contacts] = await pool.query('SELECT * FROM contacts WHERE owner_id = ?', [broadcast.owner_id]);
        }

        // Send to each contact
        for (const contact of contacts) {
          try {
            // Clean phone number for WhatsApp API
            let cleanPhone = String(contact.phone).replace(/[\s\-()+]/g, '');
            if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
              cleanPhone = '91' + cleanPhone;
            }

            // Build template message with parameters
            const templateMessage = {
              name: broadcast.template_name,
              language: { code: 'en_US' }
            };

            // If template_id is provided, try to extract parameters from template body
            if (broadcast.template_id) {
              try {
                const [tplRows] = await pool.query('SELECT body FROM templates WHERE id = ?', [broadcast.template_id]);
                if (tplRows.length > 0 && tplRows[0].body) {
                  const body = tplRows[0].body;
                  const paramMatches = body.match(/\{\{\d+\}\}/g);
                  if (paramMatches && paramMatches.length > 0) {
                    const uniqueParams = [...new Set(paramMatches)].sort();
                    const parameters = uniqueParams.map((param, index) => {
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
                    templateMessage.components = [{ type: 'body', parameters }];
                  }
                }
              } catch (tplErr) {
                console.log('Could not fetch template body for params:', tplErr.message);
              }
            }

            console.log(`Scheduled broadcast: Sending to ${cleanPhone}:`, JSON.stringify(templateMessage, null, 2));

            const response = await axios.post(
              `https://graph.facebook.com/${graphVersion}/${phone_number_id}/messages`,
              { messaging_product: 'whatsapp', to: cleanPhone, type: 'template', template: templateMessage },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`Scheduled broadcast: WhatsApp response for ${cleanPhone}:`, JSON.stringify(response.data, null, 2));
            const waMsgId = response.data?.messages?.[0]?.id || null;
            await pool.query('INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [broadcast.owner_id, contact.id, 'outbound', `Template: ${broadcast.template_name}`, broadcast.template_id, waMsgId, 'sent']);
          } catch (e) {
            const errMsg = e.response?.data?.error?.message || e.message;
            const fullError = e.response?.data || e.message;
            console.error(`Scheduled broadcast send to ${contact.phone} failed:`, JSON.stringify(fullError, null, 2));
            // Save failed message
            try {
              await pool.query('INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [broadcast.owner_id, contact.id, 'outbound', `Template: ${broadcast.template_name}`, broadcast.template_id, null, 'failed']);
            } catch (saveErr) {}
          }
          await new Promise(r => setTimeout(r, 15));
        }
        console.log(`Scheduled broadcast ${broadcast.id} sent to ${contacts.length} contacts`);
      } catch (err) {
        console.error('Scheduled broadcast error:', err.message);
      }
    }
  } catch (err) {}
}, 60000);

// Start Minutely Automated Plan Expiry & Renewal Monitor
const { startMinutelyExpiryMonitor } = require('./services/expiryAlertWorker');
startMinutelyExpiryMonitor();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
