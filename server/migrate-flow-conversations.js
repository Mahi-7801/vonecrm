const pool = require('./config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flow_id INT NOT NULL,
        contact_id INT,
        owner_id INT NOT NULL,
        current_node VARCHAR(100),
        context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (flow_id) REFERENCES flows(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    console.log('flow_conversations table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        node_id VARCHAR(100),
        role ENUM('user','assistant','button_click') NOT NULL,
        content TEXT,
        button_label VARCHAR(255),
        ai_context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES flow_conversations(id) ON DELETE CASCADE
      )
    `);
    console.log('flow_messages table created');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
