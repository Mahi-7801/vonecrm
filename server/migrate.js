const pool = require('./config/db');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      max_messages INT DEFAULT -1,
      max_contacts INT DEFAULT -1,
      features JSON,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      status ENUM('active','expired','cancelled') DEFAULT 'active',
      starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      payment_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    )
  `);

  // Add wa_message_id column to messages table (if missing)
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN wa_message_id VARCHAR(100) AFTER template_id`);
    console.log('Added wa_message_id column to messages table');
  } catch (e) {
    // Column already exists — ignore
  }

  // Create pricing_config table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pricing_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(30) UNIQUE NOT NULL,
      rate DECIMAL(10,4) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Seed default pricing if empty
  const [pricingCount] = await pool.query('SELECT COUNT(*) as count FROM pricing_config');
  if (pricingCount[0].count === 0) {
    await pool.query(`INSERT INTO pricing_config (category, rate) VALUES ('marketing', 0.90), ('utility', 0.12), ('authentication', 0.12), ('service', 0.00)`);
    console.log('Default pricing seeded!');
  }

  // Seed default plans
  const [existing] = await pool.query('SELECT COUNT(*) as count FROM plans');
  if (existing[0].count === 0) {
    await pool.query("INSERT INTO plans (name, description, price, duration_days, features) VALUES (?, ?, ?, ?, ?)", [
      'Basic', 'Starter plan for small businesses', 499, 30,
      JSON.stringify(['1000 messages/month', '500 contacts', 'Template messages', 'Basic support'])
    ]);
    await pool.query("INSERT INTO plans (name, description, price, duration_days, features) VALUES (?, ?, ?, ?, ?)", [
      'Professional', 'For growing businesses', 999, 30,
      JSON.stringify(['10000 messages/month', '5000 contacts', 'Template + text messages', 'Bulk broadcast', 'Priority support'])
    ]);
    await pool.query("INSERT INTO plans (name, description, price, duration_days, features) VALUES (?, ?, ?, ?, ?)", [
      'Enterprise', 'Unlimited everything', 2999, 30,
      JSON.stringify(['Unlimited messages', 'Unlimited contacts', 'All message types', 'Bulk broadcast', 'API access', 'Dedicated support'])
    ]);
    console.log('Default plans seeded!');
  }

  console.log('Migration complete!');
  process.exit();
}

run().catch(e => { console.error(e.message); process.exit(1); });
