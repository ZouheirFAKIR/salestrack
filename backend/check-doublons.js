const pool = require('./db');

(async () => {
  const result = await pool.query(`
    SELECT
      u.nom,
      a.type,
      COUNT(*) FILTER (WHERE s.activity_id IS NOT NULL) AS venant_odoo,
      COUNT(*) FILTER (WHERE s.activity_id IS NULL) AS ajoute_manuellement
    FROM activities a
    JOIN users u ON u.id = a.commercial_id
    LEFT JOIN odoo_activity_sync s ON s.activity_id = a.id
    WHERE a.type IN ('devis', 'commande')
      AND a.date_activite >= '2026-09-14'
    GROUP BY u.nom, a.type
    ORDER BY u.nom, a.type
  `);
  console.table(result.rows);
  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
