const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/commercials/:id', async (req, res) => {
  try {
    const user = await pool.query('SELECT id, nom, email, photo_url FROM users WHERE id = $1', [req.params.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });

    const stats = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities WHERE commercial_id = $1 GROUP BY type`,
      [req.params.id]
    );
    const daily = await pool.query(
      `SELECT TO_CHAR(d, 'YYYY-MM-DD') as jour, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN activities a ON DATE(a.date_activite) = d AND a.commercial_id = $1
       GROUP BY d ORDER BY d ASC`,
      [req.params.id]
    );
    const typeQuotaTotal = await pool.query(
      'SELECT COALESCE(SUM(daily_target), 9) as total_target FROM type_quotas WHERE commercial_id = $1',
      [req.params.id]
    );

    const earnedResult = await pool.query(
      `SELECT COALESCE(SUM(best_score), 0) as total FROM (
         SELECT DISTINCT ON (course_id) score as best_score
         FROM quiz_attempts
         WHERE commercial_id = $1
         ORDER BY course_id, score DESC, completed_at DESC
       ) t`,
      [req.params.id]
    );
    const bonusResult = await pool.query(
      'SELECT COALESCE(SUM(points), 0) as total FROM daily_bonus_points WHERE commercial_id = $1',
      [req.params.id]
    );
    const redemptions = await pool.query(
      `SELECT rr.id, rr.quantity, rr.cost_at_redemption, rr.redeemed_at, r.title, r.image_url
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr.reward_id
       WHERE rr.commercial_id = $1
       ORDER BY rr.redeemed_at DESC`,
      [req.params.id]
    );
    const spentResult = await pool.query(
      'SELECT COALESCE(SUM(cost_at_redemption), 0) as total FROM reward_redemptions WHERE commercial_id = $1',
      [req.params.id]
    );
    const earned = Number(earnedResult.rows[0].total) + Number(bonusResult.rows[0].total);
    const spent = Number(spentResult.rows[0].total);

    res.json({
      user: user.rows[0],
      stats: stats.rows,
      daily: daily.rows,
      daily_target: typeQuotaTotal.rows[0].total_target,
      points_balance: earned - spent,
      redemptions: redemptions.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/commercials/:id/activity-week', async (req, res) => {
  const { id } = req.params;
  const type = ['appel', 'rdv', 'devis', 'commande'].includes(req.query.type) ? req.query.type : 'appel';
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const result = await pool.query(
      `SELECT TO_CHAR(d, 'YYYY-MM-DD') as jour, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(
         (CURRENT_DATE + ($3 * INTERVAL '7 days')) - INTERVAL '6 days',
         CURRENT_DATE + ($3 * INTERVAL '7 days'),
         INTERVAL '1 day'
       ) d
       LEFT JOIN activities a ON DATE(a.date_activite) = d AND a.commercial_id = $1 AND a.type = $2
       GROUP BY d ORDER BY d ASC`,
      [id, type, offset]
    );

    res.json({
      type,
      offset,
      start: result.rows[0]?.jour || null,
      end: result.rows[result.rows.length - 1]?.jour || null,
      daily: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;