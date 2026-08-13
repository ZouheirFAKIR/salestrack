const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, async (req, res) => {
  const { type, sens, statut } = req.body;
  if (!type) return res.status(400).json({ error: 'Le type est obligatoire' });

  try {
    const result = await pool.query(
      `INSERT INTO activities (type, sens, statut, commercial_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [type, sens || null, statut || null, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activities WHERE commercial_id = $1 ORDER BY date_activite DESC',
      [req.userId]
    );
    res.json(result.rows);
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

module.exports = router;