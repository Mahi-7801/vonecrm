const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixEnum() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'whatsapp_crm'
  });

  try {
    await conn.query("ALTER TABLE templates MODIFY COLUMN status ENUM('pending','active','approved','rejected') DEFAULT 'pending'");
    console.log('Status enum updated successfully');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await conn.end();
}

fixEnum();
