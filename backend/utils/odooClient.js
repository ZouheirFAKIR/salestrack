const xmlrpc = require('xmlrpc');

const url = new URL(process.env.ODOO_URL);
const https = require('https');
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });
const common = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/common', agent });
const models = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/object', agent });

const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const apiKey = process.env.ODOO_PASSWORD;

let cachedUid = null;

function authenticate() {
  return new Promise((resolve, reject) => {
    if (cachedUid) return resolve(cachedUid);
    common.methodCall('authenticate', [db, username, apiKey, {}], (err, uid) => {
      if (err) return reject(err);
      if (!uid) return reject(new Error('Authentification Odoo refusée'));
      cachedUid = uid;
      resolve(uid);
    });
  });
}

function execute(model, method, args, kwargs = {}) {
  const t0 = Date.now();
  return authenticate().then((uid) => {
    return new Promise((resolve, reject) => {
      models.methodCall(
        'execute_kw',
        [db, uid, apiKey, model, method, args, kwargs],
        (err, result) => {
          console.log(`[odoo] ${model}.${method} ${Date.now() - t0}ms ${Array.isArray(result) ? result.length + ' lignes' : ''}`);
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  });
}

function toMoroccoDate(dateOrderStr) {
  const utcDate = new Date(dateOrderStr.replace(' ', 'T') + 'Z');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(utcDate);
}

// Devis : jour de création. Commande : jour de confirmation (date_order).
function orderDay(o) {
  const isCommande = ['sale', 'done'].includes(o.state);
  return toMoroccoDate(isCommande ? o.date_order : o.create_date);
}

// Devis/commandes créés OU confirmés entre from et to
function orderDateDomain(from, to) {
  return ['|', '&', ['create_date', '>=', from], ['create_date', '<=', to], '&', ['date_order', '>=', from], ['date_order', '<=', to]];
}

module.exports = { execute, toMoroccoDate, orderDay, orderDateDomain };