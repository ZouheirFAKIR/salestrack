const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const courses = await pool.query('SELECT * FROM courses ORDER BY id ASC');
    const attempts = await pool.query(
      `SELECT course_id, MAX(score) as best_score, MAX(max_score) as max_score
       FROM quiz_attempts WHERE commercial_id = $1 GROUP BY course_id`,
      [req.userId]
    );
    const attemptMap = {};
    attempts.rows.forEach((a) => { attemptMap[a.course_id] = a; });

    const result = courses.rows.map((c) => ({
      ...c,
      completed: !!attemptMap[c.id],
      best_score: attemptMap[c.id]?.best_score || null,
      max_score: attemptMap[c.id]?.max_score || null,
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (course.rows.length === 0) return res.status(404).json({ error: 'Cours introuvable' });

    const questions = await pool.query(
      'SELECT id, question, points, order_index FROM quiz_questions WHERE course_id = $1 ORDER BY order_index ASC',
      [req.params.id]
    );
    const questionIds = questions.rows.map((q) => q.id);
    let options = [];
    if (questionIds.length > 0) {
      const optionsResult = await pool.query(
        'SELECT id, question_id, option_text FROM quiz_options WHERE question_id = ANY($1::int[])',
        [questionIds]
      );
      options = optionsResult.rows;
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

router.post('/:id/submit', authMiddleware, async (req, res) => {
  const { answers } = req.body;
  const courseId = req.params.id;

  try {
    const questions = await pool.query(
      'SELECT id, points FROM quiz_questions WHERE course_id = $1',
      [courseId]
    );

    let score = 0;
    let maxScore = 0;

    for (const q of questions.rows) {
      maxScore += q.points;
      const selectedOptionId = answers[q.id];
      if (!selectedOptionId) continue;

      const correctOption = await pool.query(
        'SELECT id FROM quiz_options WHERE question_id = $1 AND is_correct = TRUE',
        [q.id]
      );
      if (correctOption.rows[0] && correctOption.rows[0].id === selectedOptionId) {
        score += q.points;
      }
    }

    await pool.query(
      'INSERT INTO quiz_attempts (commercial_id, course_id, score, max_score) VALUES ($1, $2, $3, $4)',
      [req.userId, courseId, score, maxScore]
    );

    res.json({ score, maxScore, percent: Math.round((score / maxScore) * 100) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;