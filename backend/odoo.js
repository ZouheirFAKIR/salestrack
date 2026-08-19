const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

async function odooCall(service, method, args) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.data?.message || 'Erreur Odoo');
  }
  return data.result;
}

async function odooAuthenticate() {
  return odooCall('common', 'authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}]);
}

async function odooExecute(model, method, args, kwargs = {}) {
  const uid = await odooAuthenticate();
  if (!uid) throw new Error('Authentification Odoo échouée — vérifie ODOO_USERNAME et ODOO_API_KEY');
  return odooCall('object', 'execute_kw', [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs]);
}

// Calcule les 3 métriques demandées par Badr : devis, commandes, chiffre d'affaires
async function getOdooSalesStats() {
  const nbDevis = await odooExecute('sale.order', 'search_count', [
    [['state', 'in', ['draft', 'sent']]],
  ]);

  const nbCommandes = await odooExecute('sale.order', 'search_count', [
    [['state', '=', 'sale']],
  ]);

  const commandes = await odooExecute(
    'sale.order',
    'search_read',
    [[['state', '=', 'sale']]],
    { fields: ['amount_total'] }
  );
  const chiffreAffaires = commandes.reduce((sum, c) => sum + c.amount_total, 0);

  return { nbDevis, nbCommandes, chiffreAffaires };
}

module.exports = { odooAuthenticate, odooExecute, getOdooSalesStats };