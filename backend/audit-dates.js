const pool = require('./db');
const odoo = require('./utils/odooClient');
const { toMoroccoDate } = odoo;

(async () => {
  const rows = await pool.query(`
    SELECT s.odoo_order_id, s.kind, u.nom, a.date_activite
    FROM odoo_activity_sync s
    JOIN activities a ON a.id = s.activity_id
    JOIN users u ON u.id = s.commercial_id
    WHERE a.date_activite >= '2026-09-14'
    ORDER BY s.odoo_order_id
  `);

  const orderIds = rows.rows.map(r => r.odoo_order_id);
  const orders = await odoo.execute(
    'sale.order', 'read',
    [orderIds],
    { fields: ['name', 'date_order', 'create_date', 'write_date', 'state'] }
  );
  const byId = Object.fromEntries(orders.map(o => [o.id, o]));

  const report = rows.rows.map(r => {
    const o = byId[r.odoo_order_id];
    if (!o) return { order_id: r.odoo_order_id, nom: r.nom, PROBLEME: 'INTROUVABLE DANS ODOO (supprime?)' };
    return {
      order_id: r.odoo_order_id,
      num: o.name,
      nom: r.nom,
      kind: r.kind,
      date_stockee_app: r.date_activite.toISOString().slice(0, 10),
      odoo_date_order_now: toMoroccoDate(o.date_order),
      odoo_create_date_now: toMoroccoDate(o.create_date),
      etat_actuel: o.state,
    };
  });

  const mismatches = report.filter(r => r.PROBLEME || r.date_stockee_app !== r.odoo_date_order_now);
  console.log('=== ' + mismatches.length + ' / ' + report.length + ' lignes ou la date stockee ne correspond plus a Odoo ===');
  console.table(mismatches);

  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
