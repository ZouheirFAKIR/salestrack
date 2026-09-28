const pool = require('./db');

(async () => {
  const syncRows = await pool.query('SELECT * FROM odoo_activity_sync ORDER BY id');
  console.log('odoo_activity_sync: ' + syncRows.rows.length + ' lignes');
  console.log(syncRows.rows);

  const actCount = await pool.query('SELECT COUNT(*) FROM activities');
  console.log('activities total: ' + actCount.rows[0].count);

  const orphans = await pool.query(`
    SELECT s.* FROM odoo_activity_sync s
    LEFT JOIN activities a ON a.id = s.activity_id
    WHERE a.id IS NULL
  `);
  console.log('entrees orphelines (sync sans activity correspondante): ' + orphans.rows.length);
  console.log(orphans.rows);

  process.exit();
})().catch((e) => { console.error(e); process.exit(1); });
