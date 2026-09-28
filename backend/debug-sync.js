const pool = require('./db');
const odoo = require('./utils/odooClient');

(async () => {
  const usersResult = await pool.query(
    'SELECT id, email, odoo_user_id FROM users WHERE odoo_user_id IS NOT NULL AND hidden = FALSE'
  );
  console.log('Users avec odoo_user_id:', usersResult.rows);

  const odooUserIds = usersResult.rows.map((u) => u.odoo_user_id);
  const orders = await odoo.execute(
    'sale.order', 'search_read',
    [[
      ['user_id', 'in', odooUserIds],
      ['date_order', '>=', '2026-09-14 00:00:00'],
    ]],
    { fields: ['name', 'user_id', 'state', 'date_order'] }
  );

  console.log('Commandes trouvees:', orders.length);
  orders.forEach((o) => {
    console.log(o.id, o.name, '| state:', o.state, '| user_id:', o.user_id, '| date:', o.date_order);
  });

  process.exit();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
