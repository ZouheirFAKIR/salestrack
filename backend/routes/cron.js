const express = require('express');
const router = express.Router();
const pool = require('../db');

function verifyCronSecret(req, res, next) {
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

router.get('/daily-winner', verifyCronSecret, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.commercial_id, COUNT(*) as total
       FROM activities a
       JOIN users u ON u.id = a.commercial_id
       WHERE DATE(a.date_activite) = CURRENT_DATE
         AND (u.role != 'admin' OR u.role IS NULL) AND u.hidden = FALSE
       GROUP BY a.commercial_id
       ORDER BY total DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ message: "Aucune activité aujourd'hui, pas de champion à annoncer" });
    }

    const { commercial_id, total } = result.rows[0];

    const insertResult = await pool.query(
      `INSERT INTO daily_winners (commercial_id, win_date, activity_count)
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (win_date) DO NOTHING
       RETURNING id`,
      [commercial_id, total]
    );

    if (insertResult.rows.length === 0) {
      return res.json({ message: 'Le champion du jour a déjà été annoncé' });
    }

    res.json({ message: 'Champion du jour annoncé', commercial_id, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;