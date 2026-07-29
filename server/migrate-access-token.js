/**
 * Migration: Add access_token column to whatsapp_numbers table
 * This stores each user's permanent access token for their WhatsApp account
 */

const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Adding access_token column to whatsapp_numbers table...');

    // Check if column already exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'whatsapp_numbers'
      AND COLUMN_NAME = 'access_token'
    `);

    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE whatsapp_numbers
        ADD COLUMN access_token TEXT AFTER verified_name
      `);
      console.log('✅ access_token column added successfully');
    } else {
      console.log('ℹ️ access_token column already exists');
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
