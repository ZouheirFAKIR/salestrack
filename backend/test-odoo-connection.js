require('dotenv').config();
const xmlrpc = require('xmlrpc');

const url = new URL(process.env.ODOO_URL);
const common = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/common' });
const models = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/object' });

const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const apiKey = process.env.ODOO_PASSWORD;

common.methodCall('authenticate', [db, username, apiKey, {}], (err, uid) => {
  if (err) {
    console.error('❌ Erreur de connexion :', err.message);
    return;
  }
  if (!uid) {
    console.error('❌ Authentification refusée — vérifie ODOO_DB, ODOO_USERNAME et ODOO_PASSWORD dans .env');
    return;
  }
  console.log(`✅ Connecté avec succès ! UID Odoo : ${uid}`);

  models.methodCall(
    'execute_kw',
    [db, uid, apiKey, 'sale.order', 'search_count', [[]]],
    (err2, count) => {
      if (err2) {
        console.error('❌ Erreur en lisant sale.order :', err2.message);
        return;
      }
      console.log(`✅ Nombre total de devis/commandes trouvés dans sale.order : ${count}`);
    }
  );
});