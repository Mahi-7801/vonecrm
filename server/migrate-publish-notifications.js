const pool = require('./config/db');

async function migrate() {
  try {
    // Add is_published to templates
    await pool.query('ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE');
    console.log('Added is_published to templates');

    // Add is_published to flows
    await pool.query('ALTER TABLE flows ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE');
    console.log('Added is_published to flows');

    // Add is_published to ai_agents
    await pool.query('ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE');
    console.log('Added is_published to ai_agents');

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type ENUM('template', 'flow', 'agent', 'system') DEFAULT 'system',
        reference_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Created notifications table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist');
      process.exit(0);
    }
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
