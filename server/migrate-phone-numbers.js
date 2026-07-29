const mysql = require('mysql2/promise');
require('dotenv').config();

async function migratePhoneNumbers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'whatsapp_crm'
  });

  console.log('Connected to database. Running migrations...');

  const migrations = [
    // Add display columns to whatsapp_numbers
    "ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS display_phone_number VARCHAR(20) AFTER waba_id",
    "ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS verified_name VARCHAR(255) AFTER display_phone_number",
    "ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS added_by INT NULL AFTER verified",

    // Fix template status enum — add 'active' so sync doesn't fail
    "ALTER TABLE templates MODIFY COLUMN status ENUM('pending','approved','rejected','active') DEFAULT 'pending'"
  ];

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log('OK:', sql.substring(0, 60) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists, skipping...');
      } else if (err.code === 'ER_DUP_KEYNAME') {
        console.log('Index/constraint already exists, skipping...');
      } else {
        console.error('Error:', err.message);
      }
    }
  }

  await conn.end();
  console.log('Migration complete!');
}

migratePhoneNumbers().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
