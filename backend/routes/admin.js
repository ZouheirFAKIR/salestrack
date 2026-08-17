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

module.exports = router;