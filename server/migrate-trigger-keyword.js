const pool = require('./config/db');

async function migrate() {
  try {
    // Add trigger_keyword column to flows table
    await pool.query(`
      ALTER TABLE flows 
      ADD COLUMN IF NOT EXISTS trigger_keyword VARCHAR(255) DEFAULT NULL
    `);
    console.log('Added trigger_keyword column to flows table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    // Column may already exist
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('trigger_keyword column already exists');
      process.exit(0);
    }
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
