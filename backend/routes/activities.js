const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');

router.post('/', authMiddleware, async (req, res) => {
  const { type, sens, statut, description } = req.body;
  const qty = Math.max(1, Math.min(parseInt(req.body.nombre, 10) || 1, 1000));

  if (!type) return res.status(400).json({ error: 'Le type est obligatoire' });

  const batchId = crypto.randomUUID();
  const DAILY_BONUS_POINTS = 5;

  try {
    const result = await pool.query(
      `INSERT INTO activities (type, sens, statut, commercial_id, date_activite, batch_id, description)
       SELECT $1, $2, $3, $4, NOW(), $6::uuid, $7
       FROM generate_series(1, $5::int)
       RETURNING *`,
      [type, sens || null, statut || null, req.userId, qty, batchId, description || null]
    );

    let bonusAwarded = false;
    const quotasResult = await pool.query(
      'SELECT COALESCE(SUM(daily_target), 9) as total_target FROM type_quotas WHERE commercial_id = $1',
      [req.userId]
    );
    const totalTarget = Number(quotasResult.rows[0].total_target);

    const todayTotalResult = await pool.query(
      `SELECT COUNT(*) as total FROM activities
       WHERE commercial_id = $1 AND DATE(date_activite) = CURRENT_DATE`,
      [req.userId]
    );
    const todayTotal = Number(todayTotalResult.rows[0].total);

    if (todayTotal >= totalTarget) {
      const bonusInsert = await pool.query(
        `INSERT INTO daily_bonus_points (commercial_id, bonus_date, points)
         VALUES ($1, CURRENT_DATE, $2)
         ON CONFLICT (commercial_id, bonus_date) DO NOTHING
         RETURNING id`,
        [req.userId, DAILY_BONUS_POINTS]
      );
      bonusAwarded = bonusInsert.rows.length > 0;
    }

    res.status(201).json({ count: result.rows.length, activities: result.rows, bonusAwarded, bonusPoints: DAILY_BONUS_POINTS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const offset = (page - 1) * limit;
  const type = req.query.type || 'all';
  const search = (req.query.search || '').trim();

  const conditions = [];
  const params = [req.userId];
  let paramIndex = 2;

  if (type !== 'all') {
    if (type === 'reward') {
      conditions.push(`combined.kind = 'redemption'`);
    } else {
      conditions.push(`combined.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
  }

  if (search) {
    conditions.push(
      `(combined.commercial_nom ILIKE $${paramIndex} OR combined.description ILIKE $${paramIndex} OR combined.reward_title ILIKE $${paramIndex})`
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const limitParam = paramIndex;
  params.push(limit);
  paramIndex++;
  const offsetParam = paramIndex;
  params.push(offset);

  try {
    const result = await pool.query(
      `SELECT
         combined.batch_id, combined.type, combined.sens, combined.statut, combined.description, combined.image_url,
         combined.date_activite, combined.nombre, combined.kind, combined.reward_title, combined.cost_at_redemption,
         combined.commercial_id, combined.commercial_nom, combined.commercial_photo_url,
         COALESCE(pl.likes_count, 0) as likes_count,
         COALESCE(pc.comments_count, 0) as comments_count,
         EXISTS(
           SELECT 1 FROM post_likes me WHERE me.post_id = combined.batch_id AND me.commercial_id = $1
         ) as liked_by_me,
         COUNT(*) OVER() as total_count
       FROM (
         SELECT
           a.batch_id::text as batch_id, a.type, a.sens, a.statut, a.description, a.image_url,
           MIN(a.date_activite) as date_activite,
           COUNT(*) as nombre,
           'activity' as kind,
           NULL::text as reward_title,
           NULL::int as cost_at_redemption,
           a.commercial_id,
           u.nom as commercial_nom,
           u.photo_url as commercial_photo_url
         FROM activities a
         JOIN users u ON u.id = a.commercial_id
         GROUP BY a.batch_id, a.type, a.sens, a.statut, a.description, a.image_url, a.commercial_id, u.nom, u.photo_url

         UNION ALL

         SELECT
           'reward-' || rr.id as batch_id,
           'reward' as type,
           NULL as sens,
           NULL as statut,
           NULL as description,
           r.image_url,
           rr.redeemed_at as date_activite,
           rr.quantity as nombre,
           'redemption' as kind,
           r.title as reward_title,
           rr.cost_at_redemption,
           rr.commercial_id,
           u.nom as commercial_nom,
           u.photo_url as commercial_photo_url
         FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         JOIN users u ON u.id = rr.commercial_id
       ) combined
       LEFT JOIN (SELECT post_id, COUNT(*) as likes_count FROM post_likes GROUP BY post_id) pl ON pl.post_id = combined.batch_id
       LEFT JOIN (SELECT post_id, COUNT(*) as comments_count FROM post_comments GROUP BY post_id) pc ON pc.post_id = combined.batch_id
       ${whereClause}
       ORDER BY combined.date_activite DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    const totalCount = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    res.json({
      activities: result.rows,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/my-feed-stats', authMiddleware, async (req, res) => {
  try {
    const weekResult = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities
       WHERE commercial_id = $1 AND date_activite >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY type`,
      [req.userId]
    );
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM activities WHERE commercial_id = $1',
      [req.userId]
    );
    const weekCounts = { appel: 0, rdv: 0, devis: 0, commande: 0 };
    weekResult.rows.forEach((r) => { weekCounts[r.type] = Number(r.total); });
    const weekTotal = Object.values(weekCounts).reduce((sum, n) => sum + n, 0);
    res.json({ weekCounts, weekTotal, myTotal: Number(totalResult.rows[0].total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:postId/like', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  try {
    const existing = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND commercial_id = $2',
      [postId, req.userId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND commercial_id = $2',
        [postId, req.userId]
      );
      const countResult = await pool.query('SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1', [postId]);
      return res.json({ liked: false, likes_count: Number(countResult.rows[0].total) });
    }

    await pool.query(
      'INSERT INTO post_likes (post_id, commercial_id) VALUES ($1, $2)',
      [postId, req.userId]
    );
    const countResult = await pool.query('SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1', [postId]);
    res.json({ liked: true, likes_count: Number(countResult.rows[0].total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:postId/comments', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  try {
    const result = await pool.query(
      `SELECT pc.id, pc.content, pc.image_url, pc.created_at, pc.commercial_id, u.nom as commercial_nom, u.photo_url as commercial_photo_url
       FROM post_comments pc
       JOIN users u ON u.id = pc.commercial_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at ASC`,
      [postId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:postId/comments', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { content, image_url } = req.body;

  if ((!content || !content.trim()) && !image_url) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO post_comments (post_id, commercial_id, content, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, image_url, created_at, commercial_id`,
      [postId, req.userId, (content || '').trim().slice(0, 500), image_url || null]
    );
    const userResult = await pool.query('SELECT nom, photo_url FROM users WHERE id = $1', [req.userId]);

    res.status(201).json({
      ...result.rows[0],
      commercial_nom: userResult.rows[0].nom,
      commercial_photo_url: userResult.rows[0].photo_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/comments/:commentId', authMiddleware, async (req, res) => {
  const { commentId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM post_comments WHERE id = $1 AND commercial_id = $2 RETURNING id',
      [commentId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire introuvable' });
    }
    res.json({ message: 'Commentaire supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT type, COUNT(*) as total
       FROM activities WHERE commercial_id = $1 GROUP BY type`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nom, u.photo_url, COALESCE(COUNT(a.id), 0) as total
       FROM users u
       LEFT JOIN activities a ON a.commercial_id = u.id
         AND a.date_activite >= CURRENT_DATE - INTERVAL '6 days'
       WHERE u.role != 'admin' OR u.role IS NULL
       GROUP BY u.id, u.nom, u.photo_url
       ORDER BY total DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/stats/today', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT type, COUNT(*) as total
       FROM activities
       WHERE commercial_id = $1 AND DATE(date_activite) = CURRENT_DATE
       GROUP BY type`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total FROM activities
       WHERE commercial_id = $1 AND DATE(date_activite) = CURRENT_DATE`,
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(d, 'YYYY-MM-DD') as jour, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN activities a ON DATE(a.date_activite) = d AND a.commercial_id = $1
       GROUP BY d ORDER BY d ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(w, 'YYYY-MM-DD') as periode, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '11 weeks', CURRENT_DATE, INTERVAL '1 week') w
       LEFT JOIN activities a ON DATE_TRUNC('week', a.date_activite) = DATE_TRUNC('week', w) AND a.commercial_id = $1
       GROUP BY w ORDER BY w ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(m, 'YYYY-MM-DD') as periode, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE, INTERVAL '1 month') m
       LEFT JOIN activities a ON DATE_TRUNC('month', a.date_activite) = DATE_TRUNC('month', m) AND a.commercial_id = $1
       GROUP BY m ORDER BY m ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/yearly', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(y, 'YYYY-MM-DD') as periode, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '4 years', CURRENT_DATE, INTERVAL '1 year') y
       LEFT JOIN activities a ON DATE_TRUNC('year', a.date_activite) = DATE_TRUNC('year', y) AND a.commercial_id = $1
       GROUP BY y ORDER BY y ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/weekly-target', authMiddleware, async (req, res) => {
  const target = 5;
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(d, 'YYYY-MM-DD') as jour, COALESCE(COUNT(a.id), 0) as total
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN activities a ON DATE(a.date_activite) = d AND a.commercial_id = $1
       GROUP BY d ORDER BY d ASC`,
      [req.userId]
    );
    const withTarget = result.rows.map((r) => ({
      jour: r.jour,
      total: Number(r.total),
      target,
      atteint: Number(r.total) >= target,
    }));
    res.json(withTarget);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/batch/:batchId', authMiddleware, async (req, res) => {
  const { batchId } = req.params;
  const { description, image_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE activities 
       SET description = COALESCE($1, description), image_url = COALESCE($2, image_url)
       WHERE batch_id = $3 AND commercial_id = $4
       RETURNING *`,
      [description, image_url, batchId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activité introuvable' });
    }
    res.json({ updated: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/batch/:batchId', authMiddleware, async (req, res) => {
  const { batchId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM activities WHERE batch_id = $1 AND commercial_id = $2 RETURNING *',
      [batchId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activité introuvable' });
    }
    res.json({ message: 'Activités supprimées', count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/badge-stats', authMiddleware, async (req, res) => {
  try {
    const typeResult = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities WHERE commercial_id = $1 GROUP BY type`,
      [req.userId]
    );
    const dailyResult = await pool.query(
      `SELECT TO_CHAR(date_activite, 'YYYY-MM-DD') as jour, COUNT(*) as total
       FROM activities WHERE commercial_id = $1
       GROUP BY TO_CHAR(date_activite, 'YYYY-MM-DD') ORDER BY jour DESC`,
      [req.userId]
    );

    const typeCounts = { appel: 0, rdv: 0, devis: 0, commande: 0 };
    let total = 0;
    typeResult.rows.forEach((r) => {
      typeCounts[r.type] = Number(r.total);
      total += Number(r.total);
    });

    const daySet = new Set(dailyResult.rows.map((r) => r.jour));
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      if (daySet.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    const targetDays = dailyResult.rows.filter((r) => Number(r.total) >= 5).length;

    res.json({ typeCounts, total, streak, targetDays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/seen-badges', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT badge_id FROM seen_badges WHERE commercial_id = $1',
      [req.userId]
    );
    res.json(result.rows.map((r) => r.badge_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/seen-badges', authMiddleware, async (req, res) => {
  const { badgeIds } = req.body;
  if (!Array.isArray(badgeIds) || badgeIds.length === 0) {
    return res.status(400).json({ error: 'badgeIds requis' });
  }
  try {
    const values = badgeIds.map((_, i) => `($1, $${i + 2})`).join(',');
    await pool.query(
      `INSERT INTO seen_badges (commercial_id, badge_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [req.userId, ...badgeIds]
    );
    res.json({ message: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/my-quota', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT daily_target FROM quotas WHERE commercial_id = $1',
      [req.userId]
    );
    res.json({ daily_target: result.rows[0]?.daily_target || 5 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/my-type-quotas', authMiddleware, async (req, res) => {
  try {
    const quotasResult = await pool.query(
      'SELECT type, daily_target FROM type_quotas WHERE commercial_id = $1',
      [req.userId]
    );
    const quotas = { appel: 5, rdv: 2, devis: 1, commande: 1 };
    quotasResult.rows.forEach((r) => { quotas[r.type] = r.daily_target; });

    const todayResult = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities
       WHERE commercial_id = $1 AND DATE(date_activite) = CURRENT_DATE
       GROUP BY type`,
      [req.userId]
    );
    const today = { appel: 0, rdv: 0, devis: 0, commande: 0 };
    todayResult.rows.forEach((r) => { today[r.type] = Number(r.total); });

    res.json({ quotas, today });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;