require('dotenv').config();
const odoo = require('./utils/odooClient');

odoo.execute(
  'res.users',
  'search_read',
  [[['login', 'like', '@yealead.com'], ['active', '=', true]]],
  { fields: ['id', 'name', 'login'] }
)
  .then((users) => {
    console.log(`✅ ${users.length} comptes Yealead trouvés :\n`);
    users.forEach((u) => console.log(`ID: ${u.id} | ${u.name} | ${u.login}`));
  })
  .catch((err) => {
    console.error('❌ Erreur :', err.message);
  });