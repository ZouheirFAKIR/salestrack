const pool = require('./db');

(async () => {
  const result = await pool.query(`
    DELETE FROM activities a
    WHERE a.type IN ('devis', 'commande')
      AND a.date_activite >= '2026-09-14'
      AND NOT EXISTS (
        SELECT 1 FROM odoo_activity_sync s WHERE s.activity_id = a.id
      )
    RETURNING a.id, a.commercial_id, a.type, a.date_activite
  `);
  console.log(result.rows.length + ' lignes supprimees');
  console.table(result.rows);
  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
