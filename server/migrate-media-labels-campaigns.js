const pool = require('./config/db');

async function migrate() {
  try {
    // Add message_type and media_url columns to messages table
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS message_type ENUM('text', 'image', 'video', 'audio', 'document', 'template') DEFAULT 'text'
    `);
    console.log('Added message_type column');

    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS media_url VARCHAR(500) DEFAULT NULL
    `);
    console.log('Added media_url column');

    // Add label column to contacts for chat labels
    await pool.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS label ENUM('new', 'pending', 'resolved', 'archived') DEFAULT 'new'
    `);
    console.log('Added label column to contacts');

    // Add label column to messages for chat labels
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS label VARCHAR(50) DEFAULT NULL
    `);
    console.log('Added label column to messages');

    // Create canned_responses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS canned_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        shortcut VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    console.log('Created canned_responses table');

    // Create campaigns table for scheduled broadcasts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        template_id INT,
        contact_filter JSON,
        scheduled_at DATETIME DEFAULT NULL,
        status ENUM('draft', 'scheduled', 'running', 'completed', 'failed') DEFAULT 'draft',
        total_contacts INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        read_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    console.log('Created campaigns table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_ALREADY_EXISTS') {
      console.log('Some objects already exist, continuing...');
      process.exit(0);
    }
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
