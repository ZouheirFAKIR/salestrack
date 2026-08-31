const xmlrpc = require('xmlrpc');

const url = new URL(process.env.ODOO_URL);
const common = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/common' });
const models = xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: '/xmlrpc/2/object' });

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
  return authenticate().then((uid) => {
    return new Promise((resolve, reject) => {
      models.methodCall(
        'execute_kw',
        [db, uid, apiKey, model, method, args, kwargs],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  });
}

module.exports = { execute };