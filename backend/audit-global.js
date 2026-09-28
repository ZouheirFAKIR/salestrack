const pool = require('./db');
const odoo = require('./utils/odooClient');
const { toMoroccoDate } = odoo;

const SINCE = '2026-09-14';

(async () => {
  // 1) Utilisateurs suivis
  const usersRes = await pool.query(
    `SELECT id, nom, odoo_user_id FROM users WHERE odoo_user_id IS NOT NULL AND hidden = FALSE ORDER BY nom`
  );
  const users = usersRes.rows;
  const odooUserIds = users.map(u => u.odoo_user_id);
  const userByOdooId = Object.fromEntries(users.map(u => [u.odoo_user_id, u]));

  // 2) Commandes Odoo (source de verite)
  const orders = await odoo.execute(
    'sale.order', 'search_read',
    [[
      ['user_id', 'in', odooUserIds],
      ['date_order', '>=', `${SINCE} 00:00:00`],
    ]],
    { fields: ['name', 'user_id', 'state', 'date_order'] }
  );

  const odooRows = [];
  for (const o of orders) {
    const kind = ['draft', 'sent'].includes(o.state) ? 'devis'
      : ['sale', 'done'].includes(o.state) ? 'commande'
      : null;
    if (!kind) continue;
    const uid = o.user_id ? o.user_id[0] : null;
    const user = userByOdooId[uid];
    if (!user) continue;
    odooRows.push({
      order_id: o.id, name: o.name, nom: user.nom, kind,
      day: toMoroccoDate(o.date_order), state: o.state, date_order: o.date_order,
    });
  }

  // 3) Liste brute Odoo triee (pour comparer visuellement avec l'UI Odoo)
  console.log('\n=== LISTE BRUTE ODOO (' + odooRows.length + ' lignes, ' + SINCE + ' -> maintenant) ===');
  console.table(odooRows.sort((a, b) => b.date_order.localeCompare(a.date_order))
    .map(r => ({ jour: r.day, nom: r.nom, type: r.kind, etat: r.state, num: r.name, order_id: r.order_id })));

  // 4) Comptage Odoo par jour/commercial/type
  const odooCount = {};
  for (const r of odooRows) {
    const key = `${r.day}|${r.nom}|${r.kind}`;
    odooCount[key] = (odooCount[key] || 0) + 1;
  }

  // 5) Comptage LOCAL par jour/commercial/type (+ lien sync ou non)
  const localRes = await pool.query(`
    SELECT u.nom, a.type, DATE(a.date_activite) as jour,
           COUNT(*) FILTER (WHERE s.activity_id IS NOT NULL) as lie_odoo,
           COUNT(*) FILTER (WHERE s.activity_id IS NULL) as orphelin,
           COUNT(*) as total
    FROM activities a
    JOIN users u ON u.id = a.commercial_id
    LEFT JOIN odoo_activity_sync s ON s.activity_id = a.id
    WHERE a.type IN ('devis', 'commande') AND a.date_activite >= $1
    GROUP BY u.nom, a.type, DATE(a.date_activite)
  `, [SINCE]);

  const localCount = {};
  for (const r of localRes.rows) {
    const jour = r.jour.toISOString().slice(0, 10);
    const key = `${jour}|${r.nom}|${r.type}`;
    localCount[key] = { total: Number(r.total), lie_odoo: Number(r.lie_odoo), orphelin: Number(r.orphelin) };
  }

  // 6) Diff jour par jour
  const allKeys = new Set([...Object.keys(odooCount), ...Object.keys(localCount)]);
  const diffs = [];
  for (const key of allKeys) {
    const [jour, nom, type] = key.split('|');
    const odooN = odooCount[key] || 0;
    const local = localCount[key] || { total: 0, lie_odoo: 0, orphelin: 0 };
    if (odooN !== local.total) {
      diffs.push({ jour, nom, type, odoo: odooN, app_total: local.total, app_lie: local.lie_odoo, app_orphelin: local.orphelin });
    }
  }
  diffs.sort((a, b) => a.jour.localeCompare(b.jour) || a.nom.localeCompare(b.nom));

  console.log('\n=== ECARTS (Odoo vs App), ' + diffs.length + ' ligne(s) ===');
  console.table(diffs);

  // 7) Doublons dans la table de sync elle-meme (ne devrait jamais arriver)
  const dupSync = await pool.query(`
    SELECT odoo_order_id, kind, COUNT(*) as nb
    FROM odoo_activity_sync
    GROUP BY odoo_order_id, kind
    HAVING COUNT(*) > 1
  `);
  console.log('\n=== DOUBLONS DANS odoo_activity_sync (devrait etre vide) ===');
  console.table(dupSync.rows);

  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
