const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

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
  const { title, description, content_type, content_url, duration_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Le titre est obligatoire' });

  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, content_type, content_url, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, content_type || 'pdf', content_url || null, duration_minutes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { title, description, content_type, content_url, duration_minutes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE courses SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        content_type = COALESCE($3, content_type),
        content_url = COALESCE($4, content_url),
        duration_minutes = COALESCE($5, duration_minutes)
       WHERE id = $6 RETURNING *`,
      [title, description, content_type, content_url, duration_minutes, req.params.id]
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

    res.json({
      user: user.rows[0],
      stats: stats.rows,
      daily: daily.rows,
      daily_target: typeQuotaTotal.rows[0].total_target,
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

module.exports = router;