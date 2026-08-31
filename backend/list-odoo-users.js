require('dotenv').config();
const xmlrpc = require('xmlrpc');

const url = new URL(process.env.ODOO_URL);
const common = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/common' });
const models = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/object' });

const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const apiKey = process.env.ODOO_PASSWORD;

common.methodCall('authenticate', [db, username, apiKey, {}], (err, uid) => {
  if (err || !uid) {
    console.error('❌ Erreur de connexion :', err?.message || 'authentification refusée');
    return;
  }

  models.methodCall(
    'execute_kw',
    [
      db, uid, apiKey,
      'res.users', 'search_read',
      [[['active', '=', true]]],
      { fields: ['id', 'name', 'login', 'email'] },
    ],
    (err2, users) => {
      if (err2) {
        console.error('❌ Erreur en lisant res.users :', err2.message);
        return;
      }
      console.log(`✅ ${users.length} utilisateur(s) Odoo actif(s) :\n`);
      users.forEach((u) => {
        console.log(`ID: ${u.id} | Nom: ${u.name} | Login: ${u.login} | Email: ${u.email || '(vide)'}`);
      });
    }
  );
});