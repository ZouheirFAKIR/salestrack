const pool = require('../db');
const odoo = require('./odooClient');
const { toMoroccoDate } = odoo;
const crypto = require('crypto');

const DAILY_BONUS_POINTS = 5;
const SYNC_LOOKBACK_DAYS = 3;

async function applyGamificationSideEffects(commercialId, activityDateISO) {
  const quotasResult = await pool.query(
    'SELECT COALESCE(SUM(daily_target), 9) as total_target FROM type_quotas WHERE commercial_id = $1',
    [commercialId]
  );
  const totalTarget = Number(quotasResult.rows[0].total_target);

  const dayTotalResult = await pool.query(
    `SELECT COUNT(*) as total FROM activities WHERE commercial_id = $1 AND DATE(date_activite) = $2::date`,
    [commercialId, activityDateISO]
  );
  const dayTotal = Number(dayTotalResult.rows[0].total);

  if (dayTotal >= totalTarget) {
    await pool.query(
      `INSERT INTO daily_bonus_points (commercial_id, bonus_date, points)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (commercial_id, bonus_date) DO NOTHING`,
      [commercialId, activityDateISO, DAILY_BONUS_POINTS]
    );
    await pool.query(
      `INSERT INTO daily_winners (commercial_id, win_date, activity_count)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (win_date) DO NOTHING`,
      [commercialId, activityDateISO, dayTotal]
    );
  }

  const activeChallenge = await pool.query(
    `SELECT id, target, created_at FROM challenges WHERE ended = FALSE ORDER BY created_at DESC LIMIT 1`
  );
  if (activeChallenge.rows.length > 0) {
    const challenge = activeChallenge.rows[0];
    const progressResult = await pool.query(
      `SELECT COUNT(*) as total FROM activities WHERE commercial_id = $1 AND date_activite >= $2 AND date_activite <= NOW()`,
      [commercialId, challenge.created_at]
    );
    const progress = Number(progressResult.rows[0].total);
    if (progress >= challenge.target) {
      await pool.query(
        `UPDATE challenges SET winner_id = $1, ended = TRUE, ended_at = NOW() WHERE id = $2 AND winner_id IS NULL`,
        [commercialId, challenge.id]
      );
    }
  }
}

async function syncOdooActivities(sinceDate) {
  const usersResult = await pool.query(
    `SELECT id, odoo_user_id FROM users WHERE odoo_user_id IS NOT NULL AND hidden = FALSE`
  );
  const users = usersResult.rows;
  if (users.length === 0) return { synced: 0, checked: 0 };

  const odooUserIds = users.map((u) => u.odoo_user_id);
  let since;
  if (sinceDate) {
    since = new Date(`${sinceDate}T00:00:00Z`);
  } else {
    since = new Date();
    since.setUTCDate(since.getUTCDate() - SYNC_LOOKBACK_DAYS);
  }

  const orders = await odoo.execute(
    'sale.order', 'search_read',
    [[
      ['user_id', 'in', odooUserIds],
      ['date_order', '>=', `${since.toISOString().slice(0, 10)} 00:00:00`],
    ]],
    { fields: ['name', 'user_id', 'state', 'date_order'] }
  );

  let syncedCount = 0;

  for (const order of orders) {
    const kind = ['draft', 'sent'].includes(order.state) ? 'devis'
      : ['sale', 'done'].includes(order.state) ? 'commande'
      : null;
    if (!kind) continue;

    const odooUserId = order.user_id ? order.user_id[0] : null;
    const user = users.find((u) => u.odoo_user_id === odooUserId);
    if (!user) continue;

    const alreadySynced = await pool.query(
      `SELECT id FROM odoo_activity_sync WHERE odoo_order_id = $1 AND kind = $2`,
      [order.id, kind]
    );
    if (alreadySynced.rows.length > 0) continue;

    const activityDateISO = toMoroccoDate(order.date_order);
    const batchId = crypto.randomUUID();

    const insertResult = await pool.query(
      `INSERT INTO activities (type, commercial_id, date_activite, description, batch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [kind, user.id, order.date_order, `Odoo - ${order.name}`, batchId]
    );
    const activityId = insertResult.rows[0].id;

    await pool.query(
      `INSERT INTO odoo_activity_sync (odoo_order_id, kind, commercial_id, activity_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (odoo_order_id, kind) DO NOTHING`,
      [order.id, kind, user.id, activityId]
    );

    await applyGamificationSideEffects(user.id, activityDateISO);
    syncedCount++;
  }

  return { synced: syncedCount, checked: orders.length };
}

module.exports = { syncOdooActivities };