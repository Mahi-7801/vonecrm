const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateTemplates() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'whatsapp_crm'
  });

  console.log('Connected to database. Adding template columns...');

  const migrations = [
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' AFTER category",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS header TEXT AFTER language",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS footer TEXT AFTER body",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS buttons JSON AFTER footer",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS meta_template_id VARCHAR(100) AFTER status",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_at"
  ];

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log('OK:', sql.substring(0, 50) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists, skipping...');
      } else {
        console.error('Error:', err.message);
      }
    }
  }

  await conn.end();
  console.log('Migration complete!');
}

migrateTemplates().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
