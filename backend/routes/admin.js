const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const odoo = require('../utils/odooClient');
const { toMoroccoDate } = odoo;
const ODOO_START = '2026-09-13 23:00:00'; // 14/09/2026 00:00 heure du Maroc
const { getPeriodReportData, renderPeriodReportPdf } = require('../utils/reportGenerator');
const { getGlobalReportData, renderGlobalReportPdf, getDailyReportData, renderDailyReportPdf } = require('../utils/reportGenerator');
const salesReport = require('../utils/salesReport');
const bcrypt = require('bcrypt');

// Ces 2 routes sont accessibles à tout utilisateur connecté (pas seulement admin) :
// le classement du jour doit pouvoir ouvrir la fiche de n'importe quel commercial.
router.get('/commercials/:id', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, nom, email, photo_url, odoo_user_id FROM users WHERE id = $1', [req.params.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });

    const statsResult = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities WHERE commercial_id = $1 GROUP BY type`,
      [req.params.id]
    );
    const statsMap = { appel: 0, rdv: 0, devis: 0, commande: 0 };
    statsResult.rows.forEach((r) => { statsMap[r.type] = Number(r.total); });

    const odooUserId = user.rows[0].odoo_user_id;
    if (odooUserId) {
      try {
        const orders = await odoo.execute(
          'sale.order', 'search_read',
          [[['user_id', '=', odooUserId], ...odoo.orderDateDomain(ODOO_START, '2100-01-01 00:00:00')]],
          { fields: ['state', 'amount_total', 'create_date', 'date_order'] }
        );
        const sinceStart = orders.filter((o) => odoo.orderDay(o) >= '2026-09-14');
        statsMap.devis = sinceStart.filter((o) => ['draft', 'sent'].includes(o.state)).length;
        const commandesList = sinceStart.filter((o) => ['sale', 'done'].includes(o.state));
        statsMap.commande = commandesList.length;
        statsMap.ca = Math.round(commandesList.reduce((s, o) => s + (o.amount_total || 0), 0));
      } catch (err) {
        console.error('Erreur Odoo (fiche commercial):', err.message);
      }
    }

    const stats = { rows: Object.entries(statsMap).map(([type, total]) => ({ type, total })) };
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

router.get('/commercials/:id/activity-week', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const type = ['appel', 'rdv', 'devis', 'commande', 'ca'].includes(req.query.type) ? req.query.type : 'appel';
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

    if (['devis', 'commande', 'ca'].includes(type) && result.rows.length > 0) {
      const u = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [id]);
      const odooUserId = u.rows[0]?.odoo_user_id;
      if (odooUserId) {
        try {
          const first = result.rows[0].jour;
          const last = result.rows[result.rows.length - 1].jour;
          const from = new Date(`${first}T00:00:00Z`);
          from.setUTCDate(from.getUTCDate() - 1);
          const orders = await odoo.execute(
            'sale.order', 'search_read',
            [[
              ['user_id', '=', odooUserId],
              ...odoo.orderDateDomain(`${from.toISOString().slice(0, 10)} 00:00:00`, `${last} 23:59:59`),
            ]],
            { fields: ['state', 'create_date', 'date_order', 'amount_total'] }
          );
          const states = type === 'devis' ? ['draft', 'sent'] : ['sale', 'done'];
          result.rows.forEach((row) => {
            const dayOrders = orders.filter((o) => states.includes(o.state) && odoo.orderDay(o) === row.jour);
            row.total = type === 'ca'
              ? Math.round(dayOrders.reduce((s, o) => s + (o.amount_total || 0), 0))
              : dayOrders.length;
          });
        } catch (err) {
          console.error('Erreur Odoo (activity-week):', err.message);
        }
      }
    }

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

router.use(authMiddleware, adminMiddleware);

router.post('/sync-odoo-activities', async (req, res) => {
  try {
    const { syncOdooActivities } = require('../utils/odooActivitySync');
    const since = req.body?.since || req.query.since || null;
    const result = await syncOdooActivities(since);
    res.json({ message: 'Synchronisation Odoo terminee', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
  });

router.get('/report/global/:commercialId', async (req, res) => {
  try {
    const data = await salesReport.getReportData(req.params.commercialId, 'global');
    salesReport.renderReportPdf(res, data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/report/daily/:commercialId', async (req, res) => {
  try {
    const data = await getDailyReportData(req.params.commercialId);
    renderDailyReportPdf(res, data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

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
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE AND a.type = 'appel') as today_appel,
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE AND a.type = 'rdv') as today_rdv,
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE AND a.type = 'devis') as today_devis,
        COUNT(a.id) FILTER (WHERE DATE(a.date_activite) = CURRENT_DATE AND a.type = 'commande') as today_commande,
        COALESCE(MAX(tq.appel), 80) as target_appel,
        COALESCE(MAX(tq.rdv), 2) as target_rdv,
        COALESCE(MAX(tq.devis), 3) as target_devis,
        COALESCE(MAX(tq.commande), 1) as target_commande
      FROM users u
      LEFT JOIN activities a ON a.commercial_id = u.id
      LEFT JOIN (
        SELECT commercial_id,
          MAX(daily_target) FILTER (WHERE type = 'appel') as appel,
          MAX(daily_target) FILTER (WHERE type = 'rdv') as rdv,
          MAX(daily_target) FILTER (WHERE type = 'devis') as devis,
          MAX(daily_target) FILTER (WHERE type = 'commande') as commande
        FROM type_quotas
        GROUP BY commercial_id
      ) tq ON tq.commercial_id = u.id
      WHERE (u.role != 'admin' OR u.role IS NULL) AND u.hidden = FALSE
      GROUP BY u.id, tq.appel, tq.rdv, tq.devis, tq.commande
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
    const user = await pool.query('SELECT id, nom, email, photo_url, odoo_user_id FROM users WHERE id = $1', [req.params.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'Introuvable' });

    const statsResult = await pool.query(
      `SELECT type, COUNT(*) as total FROM activities WHERE commercial_id = $1 GROUP BY type`,
      [req.params.id]
    );
    const statsMap = { appel: 0, rdv: 0, devis: 0, commande: 0 };
    statsResult.rows.forEach((r) => { statsMap[r.type] = Number(r.total); });

    const stats = { rows: Object.entries(statsMap).map(([type, total]) => ({ type, total })) };
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

// Activités d'un commercial pour UN type précis, sur une semaine donnée (offset=0 = semaine en cours, -1 = semaine précédente, etc.)
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
    const quotas = { appel: 80, rdv: 2, devis: 3, commande: 1 };
    result.rows.forEach((r) => { quotas[r.type] = r.daily_target; });
    const caResult = await pool.query('SELECT ca_target FROM users WHERE id = $1', [req.params.id]);
    quotas.ca = Number(caResult.rows[0]?.ca_target || 0);
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

  if (type === 'ca') {
    const value = Number(daily_target);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Objectif invalide' });
    try {
      await pool.query('UPDATE users SET ca_target = $1 WHERE id = $2', [Math.round(value), req.params.id]);
      return res.json({ message: 'Objectif CA mis à jour' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Type invalide' });
  if (daily_target === undefined || daily_target === null || Number(daily_target) < 0) return res.status(400).json({ error: 'Objectif invalide' });

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

const odooStatsCache = new Map();
const ODOO_STATS_CACHE_TTL = 3 * 60 * 1000;

router.get('/odoo-stats', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const cached = odooStatsCache.get(date);
  if (cached && Date.now() - cached.time < ODOO_STATS_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const dateObj = new Date(`${date}T00:00:00Z`);
    const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const orders = await odoo.execute(
      'sale.order',
      'search_read',
      [[
        ['create_date', '>=', `${prevDay.toISOString().slice(0, 10)} 00:00:00`],
        ['create_date', '<=', `${nextDay.toISOString().slice(0, 10)} 23:59:59`],
      ]],
      { fields: ['state', 'amount_total', 'create_date'] }
    );

    const ordersToday = orders.filter((o) => toMoroccoDate(o.create_date) === date);
    const devis = ordersToday.filter((o) => ['draft', 'sent'].includes(o.state)).length;
    const commandesList = ordersToday.filter((o) => ['sale', 'done'].includes(o.state));
    const commandes = commandesList.length;
    const chiffreAffaires = commandesList.reduce((sum, o) => sum + o.amount_total, 0);

    const result = { devis, commandes, chiffreAffaires: Math.round(chiffreAffaires) };
    odooStatsCache.set(date, { data: result, time: Date.now() });
    res.json(result);
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
              r.title, r.image_url, u.nom as commercial_nom, u.photo_url as commercial_photo_url
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
              r.title, r.image_url, u.nom as commercial_nom, u.photo_url as commercial_photo_url
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


router.get('/challenge', async (req, res) => {
  try {
    const challengesResult = await pool.query(
      `SELECT c.*, u.nom as winner_nom FROM challenges c
       LEFT JOIN users u ON u.id = c.winner_id
       WHERE c.ended = FALSE
       ORDER BY c.created_at DESC`
    );

    const challenges = await Promise.all(challengesResult.rows.map(async (challenge) => {
      const runnersResult = await pool.query(
        `SELECT u.id, u.nom, u.photo_url,
           COUNT(a.id) as total,
           COUNT(a.id) FILTER (WHERE a.type = 'appel') as appel,
           COUNT(a.id) FILTER (WHERE a.type = 'rdv') as rdv,
           COUNT(a.id) FILTER (WHERE a.type = 'devis') as devis,
           COUNT(a.id) FILTER (WHERE a.type = 'commande') as commande
         FROM users u
         LEFT JOIN activities a ON a.commercial_id = u.id
           AND a.date_activite >= $1 AND a.date_activite <= NOW()
         WHERE (u.role != 'admin' OR u.role IS NULL) AND u.hidden = FALSE
         GROUP BY u.id
         ORDER BY total DESC`,
        [challenge.created_at]
      );

      const runners = runnersResult.rows.map((r) => ({
        id: r.id,
        nom: r.nom,
        photo_url: r.photo_url,
        total: Number(r.total),
        breakdown: {
          appel: Number(r.appel),
          rdv: Number(r.rdv),
          devis: Number(r.devis),
          commande: Number(r.commande),
        },
        progress: Math.min(Math.round((Number(r.total) / challenge.target) * 100), 100),
        isWinner: r.id === challenge.winner_id,
      }));

      return {
        id: challenge.id,
        gameType: challenge.game_type,
        title: challenge.title,
        target: challenge.target,
        targets: {
          appel: challenge.target_appel,
          rdv: challenge.target_rdv,
          devis: challenge.target_devis,
          commande: challenge.target_commande,
        },
        deadline: challenge.deadline,
        winnerId: challenge.winner_id,
        winnerNom: challenge.winner_nom,
        runners,
      };
    }));

    res.json({ challenges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/challenge', async (req, res) => {
  const { title, deadline, gameType } = req.body;
  const targetAppel = parseInt(req.body.targetAppel, 10) || 0;
  const targetRdv = parseInt(req.body.targetRdv, 10) || 0;
  const targetDevis = parseInt(req.body.targetDevis, 10) || 0;
  const targetCommande = parseInt(req.body.targetCommande, 10) || 0;
  const target = targetAppel + targetRdv + targetDevis + targetCommande;

  if (!title || !deadline || target <= 0) {
    return res.status(400).json({ error: 'Titre, au moins un objectif par type, et deadline requis' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO challenges (title, target, target_appel, target_rdv, target_devis, target_commande, deadline, created_by, game_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, target, targetAppel, targetRdv, targetDevis, targetCommande, deadline, req.userId, ['mountain', 'rocket', 'ocean'].includes(gameType) ? gameType : 'race']
    );
    const challenge = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('new_challenge', { title: challenge.title, gameType: challenge.game_type });
    }

    res.status(201).json(challenge);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Un défi est déjà en cours — termine-le avant d\'en créer un nouveau' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/challenge/:id/end', async (req, res) => {
  try {
    await pool.query('UPDATE challenges SET ended = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Défi terminé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/team-today-quotas', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const commercialsResult = await pool.query(
      `SELECT id, nom, odoo_user_id, ca_target FROM users
       WHERE (role IS NULL OR role NOT IN ('admin', 'manager')) AND hidden = FALSE
       ORDER BY nom ASC`
    );
    const commercials = commercialsResult.rows;
    if (commercials.length === 0) return res.json([]);

    const ids = commercials.map((c) => c.id);

    const quotasResult = await pool.query(
      `SELECT commercial_id, type, daily_target FROM type_quotas WHERE commercial_id = ANY($1::int[])`,
      [ids]
    );
    const quotasMap = {};
    commercials.forEach((c) => { quotasMap[c.id] = { appel: 80, rdv: 2, devis: 3, commande: 1, ca: Number(c.ca_target || 0) }; });
    quotasResult.rows.forEach((r) => { quotasMap[r.commercial_id][r.type] = r.daily_target; });

    const todayResult = await pool.query(
      `SELECT commercial_id, type, COUNT(*) as total FROM activities
       WHERE commercial_id = ANY($1::int[]) AND DATE(date_activite) = CURRENT_DATE
       GROUP BY commercial_id, type`,
      [ids]
    );
    const todayMap = {};
    commercials.forEach((c) => { todayMap[c.id] = { appel: 0, rdv: 0, devis: 0, commande: 0, ca: 0 }; });
    todayResult.rows.forEach((r) => { todayMap[r.commercial_id][r.type] = Number(r.total); });

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());
    const dateObj = new Date(`${todayStr}T00:00:00Z`);
    const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const odooUserIds = commercials.map((c) => c.odoo_user_id).filter(Boolean);

    if (odooUserIds.length > 0) {
      const orders = await odoo.execute(
        'sale.order', 'search_read',
        [[
          ['user_id', 'in', odooUserIds],
          ...odoo.orderDateDomain(`${prevDay.toISOString().slice(0, 10)} 00:00:00`, `${nextDay.toISOString().slice(0, 10)} 23:59:59`),
        ]],
        { fields: ['user_id', 'state', 'create_date', 'date_order', 'amount_total'] }
      );
      commercials.forEach((c) => {
        if (c.odoo_user_id) {
          todayMap[c.id].devis = 0;
          todayMap[c.id].commande = 0;
        }
      });

      const ordersToday = orders.filter((o) => odoo.orderDay(o) === todayStr);
      ordersToday.forEach((o) => {
        const c = commercials.find((c) => c.odoo_user_id === (o.user_id ? o.user_id[0] : null));
        if (!c) return;
        if (['draft', 'sent'].includes(o.state)) todayMap[c.id].devis++;
        if (['sale', 'done'].includes(o.state)) {
          todayMap[c.id].commande++;
          todayMap[c.id].ca += o.amount_total || 0;
        }
      });
    }

    res.json(commercials.map((c) => ({ id: c.id, nom: c.nom, quotas: quotasMap[c.id], today: todayMap[c.id] })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/report/period/:commercialId', authMiddleware, adminMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const period = ['day', 'week', 'month', 'quarter', 'year'].includes(req.query.period) ? req.query.period : 'day';
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const data = await salesReport.getReportData(commercialId, period, date);
    salesReport.renderReportPdf(res, data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Répartition pour les camemberts : appels, RDV, liste d'attente, pipeline
router.get('/commercials/:id/breakdown', async (req, res) => {
  const { id } = req.params;
  const period = ['day', 'week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'day';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());
  const start = new Date(`${today}T00:00:00Z`);
  if (period === 'week') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === 'month') start.setUTCDate(1);
  const startStr = period === 'all' ? '2000-01-01' : start.toISOString().slice(0, 10);

  try {
    const local = await pool.query(
      `SELECT type, sens, statut, COUNT(*)::int AS n
       FROM activities
       WHERE commercial_id = $1 AND type IN ('appel', 'rdv')
         AND DATE(date_activite) BETWEEN $2 AND $3
       GROUP BY type, sens, statut`,
      [id, startStr, today]
    );

    const appelSens = { sortant: 0, entrant: 0, autre: 0 };
    const appelStatut = { repond: 0, ne_repond_pas: 0, autre: 0 };
    const rdvStatut = { present: 0, absent: 0, autre: 0 };
    local.rows.forEach((r) => {
      if (r.type === 'appel') {
        appelSens[r.sens in appelSens ? r.sens : 'autre'] += r.n;
        appelStatut[r.statut in appelStatut ? r.statut : 'autre'] += r.n;
      } else {
        rdvStatut[r.statut in rdvStatut ? r.statut : 'autre'] += r.n;
      }
    });

    let odooData = { linked: false };
    const u = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [id]);
    const odooUserId = u.rows[0]?.odoo_user_id;
    if (odooUserId) {
      try {
        const leads = await odoo.execute(
          'crm.lead', 'search_read',
          [[['user_id', '=', odooUserId]]],
          { fields: ['type', 'active', 'stage_id'], context: { active_test: false } }
        );
        const waiting = { actives: 0, perdues: 0 };
        const pipelineStages = {};
        let pipelinePerdues = 0;
        leads.forEach((l) => {
          if (l.type !== 'opportunity') {
            if (l.active) waiting.actives++; else waiting.perdues++;
          } else if (!l.active) {
            pipelinePerdues++;
          } else {
            const stage = l.stage_id ? l.stage_id[1] : 'Sans étape';
            pipelineStages[stage] = (pipelineStages[stage] || 0) + 1;
          }
        });
        odooData = { linked: true, waiting, pipelineStages, pipelinePerdues };
      } catch (err) {
        console.error('Erreur Odoo (breakdown):', err.message);
      }
    }

    res.json({ period, start: startStr, end: today, appelSens, appelStatut, rdvStatut, odoo: odooData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Toutes les données d'un commercial pour une période (mêmes chiffres que le rapport PDF)
// Petite mémoire côté serveur : la même demande dans les 2 minutes répond tout de suite
const reportDataCache = new Map();
const REPORT_TTL = 2 * 60 * 1000;

router.get('/commercials/:id/report-data', async (req, res) => {
  const period = ['day', 'week', 'month', 'quarter', 'year', 'global'].includes(req.query.period) ? req.query.period : 'day';
  const key = `${req.params.id}|${period}|${req.query.date || ''}`;
  const hit = reportDataCache.get(key);
  if (hit && Date.now() - hit.t < REPORT_TTL) return res.json(hit.data);
  try {
    const data = await salesReport.getReportData(req.params.id, period, req.query.date);
    delete data.sales.orders;
    reportDataCache.set(key, { t: Date.now(), data });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Anciens commerciaux (inactifs dans l'app, visibles seulement par le manager)
router.get('/inactive-commercials', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nom FROM users WHERE inactive = TRUE ORDER BY nom ASC');
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- Gestion des utilisateurs (admin seulement) ----------
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom, email, role, COALESCE(inactive, FALSE) AS inactive
       FROM users ORDER BY COALESCE(inactive, FALSE) ASC, nom ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/users', async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role === 'manager' ? 'manager' : null;

  if (!nom || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe sont obligatoires' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (nom, email, password) VALUES ($1, $2, $3) RETURNING id, nom, email',
      [nom, email, hashed]
    );
    if (role) {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, result.rows[0].id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.userId) return res.status(400).json({ error: 'Tu ne peux pas désactiver ton propre compte' });
  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (target.rows[0].role === 'admin') return res.status(400).json({ error: 'Impossible de désactiver un admin' });
    await pool.query('UPDATE users SET inactive = $1 WHERE id = $2', [Boolean(req.body.inactive), id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/users/:id/password', async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.params.id]);
    res.json({ message: 'Mot de passe changé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;