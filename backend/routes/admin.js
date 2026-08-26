const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getOdooSalesStats } = require('../odoo');
router.use(authMiddleware, adminMiddleware);

router.get('/courses', async (req, res) => {
  try {
    const courses = await pool.query(`
      SELECT c.*, COUNT(q.id) as question_count
      FROM courses c
      LEFT JOIN quiz_questions q ON q.course_id = c.id
      GROUP BY c.id ORDER BY c.id ASC
    `);
    res.json(courses.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (course.rows.length === 0) return res.status(404).json({ error: 'Cours introuvable' });

    const questions = await pool.query(
      'SELECT * FROM quiz_questions WHERE course_id = $1 ORDER BY order_index ASC',
      [req.params.id]
    );
    const questionIds = questions.rows.map((q) => q.id);
    let options = [];
    if (questionIds.length > 0) {
      const optRes = await pool.query(
        'SELECT * FROM quiz_options WHERE question_id = ANY($1::int[]) ORDER BY id ASC',
        [questionIds]
      );
      options = optRes.rows;
    }
    const questionsWithOptions = questions.rows.map((q) => ({
      ...q,
      options: options.filter((o) => o.question_id === q.id),
    }));

    res.json({ ...course.rows[0], questions: questionsWithOptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/courses', async (req, res) => {
  const { title, description, content_type, content_url, content_text, duration_minutes, banner_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Le titre est obligatoire' });

  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, content_type, content_url, content_text, duration_minutes, banner_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, content_type || 'pdf', content_url || null, content_text || null, duration_minutes || null, banner_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { title, description, content_type, content_url, content_text, duration_minutes, banner_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE courses SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        content_type = COALESCE($3, content_type),
        content_url = COALESCE($4, content_url),
        content_text = COALESCE($5, content_text),
        duration_minutes = COALESCE($6, duration_minutes),
        banner_url = COALESCE($7, banner_url)
       WHERE id = $8 RETURNING *`,
      [title, description, content_type, content_url, content_text, duration_minutes, banner_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cours introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cours supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/courses/:id/questions', async (req, res) => {
  const { question, points, options } = req.body;
  if (!question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Question et au moins 2 options requises' });
  }
  const hasCorrect = options.some((o) => o.is_correct);
  if (!hasCorrect) return res.status(400).json({ error: 'Une réponse correcte doit être sélectionnée' });

  try {
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM quiz_questions WHERE course_id = $1',
      [req.params.id]
    );
    const nextOrder = orderResult.rows[0].next_order;

    const qResult = await pool.query(
      'INSERT INTO quiz_questions (course_id, question, points, order_index) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.params.id, question, points || 10, nextOrder]
    );
    const questionId = qResult.rows[0].id;

    for (const opt of options) {
      await pool.query(
        'INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
        [questionId, opt.option_text, !!opt.is_correct]
      );
    }

    res.status(201).json({ message: 'Question ajoutée', questionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Question supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/questions/:id', async (req, res) => {
  const { question, points, options } = req.body;
  if (!question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Question et au moins 2 options requises' });
  }
  const hasCorrect = options.some((o) => o.is_correct);
  if (!hasCorrect) return res.status(400).json({ error: 'Une réponse correcte doit être sélectionnée' });

  try {
    await pool.query('UPDATE quiz_questions SET question = $1, points = $2 WHERE id = $3', [question, points || 10, req.params.id]);
    await pool.query('DELETE FROM quiz_options WHERE question_id = $1', [req.params.id]);
    for (const opt of options) {
      await pool.query(
        'INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
        [req.params.id, opt.option_text, !!opt.is_correct]
      );
    }
    res.json({ message: 'Question mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste tous les commerciaux avec leurs stats
router.get('/commercials', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.nom, u.email, u.role, u.photo_url,
        COALESCE(tq.total_target, 9) as daily_target,
        COUNT(a.id) as total_activities,
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE) as today_activities
      FROM users u
      LEFT JOIN (
        SELECT commercial_id, SUM(daily_target) as total_target
        FROM type_quotas
        GROUP BY commercial_id
      ) tq ON tq.commercial_id = u.id
      LEFT JOIN activities a ON a.commercial_id = u.id
      WHERE u.role != 'admin' OR u.role IS NULL
      GROUP BY u.id, tq.total_target
      ORDER BY u.nom ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détail d'un commercial (activités par type + par jour)
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

// Définir/modifier le quota d'un commercial (legacy, non utilisé par l'UI actuelle)
router.put('/commercials/:id/quota', async (req, res) => {
  const { daily_target } = req.body;
  if (!daily_target || daily_target < 1) return res.status(400).json({ error: 'Quota invalide' });

  try {
    await pool.query(
      `INSERT INTO quotas (commercial_id, daily_target) VALUES ($1, $2)
       ON CONFLICT (commercial_id) DO UPDATE SET daily_target = $2, updated_at = NOW()`,
      [req.params.id, daily_target]
    );
    res.json({ message: 'Quota mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rapport CSV téléchargeable : niveau d'atteinte des quotas
router.get('/report/quotas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.nom, u.email,
        COALESCE(tq.total_target, 9) as objectif_quotidien,
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE) as activites_aujourdhui,
        COUNT(a.id) as activites_total
      FROM users u
      LEFT JOIN (
        SELECT commercial_id, SUM(daily_target) as total_target
        FROM type_quotas
        GROUP BY commercial_id
      ) tq ON tq.commercial_id = u.id
      LEFT JOIN activities a ON a.commercial_id = u.id
      WHERE u.role != 'admin' OR u.role IS NULL
      GROUP BY u.id, tq.total_target
      ORDER BY u.nom ASC
    `);

    let csv = 'Nom,Email,Objectif quotidien,Activites aujourd\'hui,Taux atteinte (%),Activites total\n';
    result.rows.forEach((r) => {
      const taux = Math.min(Math.round((r.activites_aujourdhui / r.objectif_quotidien) * 100), 100);
      csv += `"${r.nom}","${r.email}",${r.objectif_quotidien},${r.activites_aujourdhui},${taux}%,${r.activites_total}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport_quotas.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupère les 4 objectifs (par type) d'un commercial
router.get('/commercials/:id/type-quotas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT type, daily_target FROM type_quotas WHERE commercial_id = $1',
      [req.params.id]
    );
    const quotas = { appel: 5, rdv: 2, devis: 1, commande: 1 };
    result.rows.forEach((r) => { quotas[r.type] = r.daily_target; });
    res.json(quotas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifie un objectif précis (un seul type à la fois)
router.put('/commercials/:id/type-quotas', async (req, res) => {
  const { type, daily_target } = req.body;
  const validTypes = ['appel', 'rdv', 'devis', 'commande'];

  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Type invalide' });
  if (!daily_target || daily_target < 0) return res.status(400).json({ error: 'Objectif invalide' });

  try {
    await pool.query(
      `INSERT INTO type_quotas (commercial_id, type, daily_target) VALUES ($1, $2, $3)
       ON CONFLICT (commercial_id, type) DO UPDATE SET daily_target = $3`,
      [req.params.id, type, daily_target]
    );
    res.json({ message: 'Objectif mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/odoo-stats', async (req, res) => {
  try {
    const stats = await getOdooSalesStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de récupérer les stats Odoo', details: err.message });
  }
});

router.get('/rewards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rewards ORDER BY cost ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/rewards', async (req, res) => {
  const { title, description, cost, image_url } = req.body;
  if (!title || !cost) return res.status(400).json({ error: 'Titre et coût obligatoires' });

  try {
    const result = await pool.query(
      'INSERT INTO rewards (title, description, cost, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || null, cost, image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/rewards/:id', async (req, res) => {
  const { title, description, cost, image_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rewards SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        cost = COALESCE($3, cost),
        image_url = COALESCE($4, image_url)
       WHERE id = $5 RETURNING *`,
      [title, description, cost, image_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Récompense introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/rewards/:id', async (req, res) => {
  try {
    const usedCheck = await pool.query(
      'SELECT id FROM reward_redemptions WHERE reward_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (usedCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Cette récompense a déjà été échangée par un commercial et ne peut pas être supprimée. Tu peux la modifier ou la retirer autrement.',
      });
    }
    await pool.query('DELETE FROM rewards WHERE id = $1', [req.params.id]);
    res.json({ message: 'Récompense supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/courses/:id/completions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id as commercial_id, u.nom, qa.score, qa.max_score, qa.completed_at
       FROM users u
       LEFT JOIN quiz_attempts qa ON qa.commercial_id = u.id AND qa.course_id = $1
       WHERE u.role != 'admin' OR u.role IS NULL
       ORDER BY u.nom ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/courses/:courseId/commercials/:commercialId/attempt', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM quiz_attempts WHERE course_id = $1 AND commercial_id = $2',
      [req.params.courseId, req.params.commercialId]
    );
    res.json({ message: 'Formation réinitialisée pour ce commercial' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/notifications/redemptions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.id, rr.quantity, rr.cost_at_redemption, rr.redeemed_at, rr.seen_by_admin,
              r.title, r.image_url, u.nom as commercial_nom
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr.reward_id
       JOIN users u ON u.id = rr.commercial_id
       WHERE rr.dismissed = FALSE
       ORDER BY rr.redeemed_at DESC
       LIMIT 20`
    );
    const unseenCount = result.rows.filter((r) => !r.seen_by_admin).length;
    res.json({ notifications: result.rows, unseenCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/notifications/redemptions/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.id, rr.quantity, rr.cost_at_redemption, rr.redeemed_at, rr.seen_by_admin,
              r.title, r.image_url, u.nom as commercial_nom
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr.reward_id
       JOIN users u ON u.id = rr.commercial_id
       WHERE rr.dismissed = FALSE
       ORDER BY rr.redeemed_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/notifications/redemptions/:id/dismiss', async (req, res) => {
  try {
    await pool.query('UPDATE reward_redemptions SET dismissed = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notification masquée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/notifications/redemptions/mark-seen', async (req, res) => {
  try {
    await pool.query('UPDATE reward_redemptions SET seen_by_admin = TRUE WHERE seen_by_admin = FALSE');
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;