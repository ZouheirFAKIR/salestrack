require('dotenv').config();
const pool = require('./db');
const odoo = require('./utils/odooClient');

async function run() {
  const result = await pool.query('SELECT id, nom, odoo_user_id FROM users WHERE odoo_user_id IS NOT NULL');

  for (const user of result.rows) {
    const records = await odoo.execute(
      'mail.activity',
      'search_read',
      [[['user_id', '=', user.odoo_user_id]]],
      { fields: ['activity_type_id'], context: { active_test: false } }
    );

    const byCategory = {};
    records.forEach((r) => {
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      byCategory[label] = (byCategory[label] || 0) + 1;
    });

    console.log(`\n=== ${user.nom} (${records.length} activités au total) ===`);
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([label, count]) => console.log(`  ${label} : ${count}`));
  }

  await pool.end();
}

run().catch((err) => console.error('❌', err.message));