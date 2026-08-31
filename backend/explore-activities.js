require('dotenv').config();
const odoo = require('./utils/odooClient');

odoo.execute('mail.activity', 'fields_get', [], { attributes: ['string', 'type', 'help'] })
  .then((fields) => {
    console.log(`\n✅ ${Object.keys(fields).length} champs disponibles sur mail.activity :\n`);
    Object.entries(fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, def]) => {
        console.log(`${key} (${def.type}) — ${def.string}`);
      });
  })
  .catch((err) => console.error('❌ Erreur :', err.message));