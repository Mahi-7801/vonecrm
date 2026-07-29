const pool = require('./config/db');

async function fix() {
  await pool.query("UPDATE templates SET category = 'UTILITY' WHERE category = '' AND owner_id = 6");
  const [rows] = await pool.query('SELECT id, name, category FROM templates WHERE owner_id = 6');
  console.log('Fixed templates:', JSON.stringify(rows, null, 2));
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
