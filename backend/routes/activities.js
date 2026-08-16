const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, async (req, res) => {
  const { type, sens, statut, description } = req.body;
  const qty = Math.max(1, Math.min(parseInt(req.body.nombre, 10) || 1, 100));

  if (!type) return res.status(400).json({ error: 'Le type est obligatoire' });

  try {
    const result = await pool.query(
      `INSERT INTO activities (type, sens, statut, commercial_id, date_activite, batch_id, description)
       SELECT $1, $2, $3, $4, NOW(), gen_random_uuid(), $6
       FROM generate_series(1, $5::int)
       RETURNING *`,
      [type, sens || null, statut || null, req.userId, qty, description || null]
    );
    res.status(201).json({ count: result.rows.length, activities: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        batch_id, type, sens, statut, description, image_url,
        MIN(date_activite) as date_activite,
        COUNT(*) as nombre,
        array_agg(id) as ids
       FROM activities 
       WHERE commercial_id = $1
       GROUP BY batch_id, type, sens, statut, description, image_url
       ORDER BY MIN(date_activite) DESC`,
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

// Mettre à jour la description/image d'un batch entier
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

// Supprimer un batch entier
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

module.exports = router;