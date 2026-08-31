require('dotenv').config();
const odoo = require('./utils/odooClient');

const ODOO_USER_ID = 94; // Meryem Talbi

odoo.execute(
  'mail.activity',
  'search_count',
  [[['user_id', '=', ODOO_USER_ID]]],
  { context: { active_test: false } }
)
  .then((count) => {
    console.log(`\n✅ Total (actives + inactives) pour ce vendeur : ${count}\n`);
  })
  .catch((err) => console.error('❌ Erreur :', err.message));