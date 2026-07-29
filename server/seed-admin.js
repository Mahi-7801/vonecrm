const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seedAdmin() {
  try {
    const email = 'admin';
    const password = 'admin123';

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role, balance) VALUES (?, ?, ?, ?)',
      [email, password_hash, 'admin', 0]
    );

    console.log('Admin user created successfully!');
    console.log('  Email:    admin');
    console.log('  Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedAdmin();
