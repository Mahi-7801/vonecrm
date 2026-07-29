const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
  // Connect WITHOUT database first
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  });

  console.log('Connected to MySQL on port ' + (process.env.DB_PORT || 3307));

  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await conn.query(schema);
  console.log('Database whatsapp_crm created and tables initialized.');

  // Create admin user
  const bcrypt = require('bcryptjs');
  const adminHash = await bcrypt.hash('admin123', 10);
  await conn.query('USE whatsapp_crm');
  await conn.query(
    'INSERT IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    ['admin@crm.com', adminHash, 'admin']
  );
  console.log('Admin user created: admin@crm.com / admin123');

  await conn.end();
  console.log('Done!');
}

initDB().catch(err => {
  console.error('Init DB error:', err.message);
  process.exit(1);
});
