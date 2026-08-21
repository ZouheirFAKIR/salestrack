const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rewards ORDER BY cost ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/balance', async (req, res) => {
  try {
    const earnedResult = await pool.query(
      `SELECT COALESCE(SUM(best_score), 0) as earned FROM (
         SELECT DISTINCT ON (course_id) score as best_score
         FROM quiz_attempts
         WHERE commercial_id = $1
         ORDER BY course_id, score DESC, completed_at DESC
       ) t`,
      [req.userId]
    );
    const spentResult = await pool.query(
      'SELECT COALESCE(SUM(cost_at_redemption), 0) as spent FROM reward_redemptions WHERE commercial_id = $1',
      [req.userId]
    );
    const earned = Number(earnedResult.rows[0].earned);
    const spent = Number(spentResult.rows[0].spent);
    res.json({ earned, spent, balance: earned - spent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.id, rr.cost_at_redemption, rr.redeemed_at, r.title, r.image_url
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr.reward_id
       WHERE rr.commercial_id = $1
       ORDER BY rr.redeemed_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/redeem', async (req, res) => {
  try {
    const rewardResult = await pool.query('SELECT * FROM rewards WHERE id = $1', [req.params.id]);
    if (rewardResult.rows.length === 0) return res.status(404).json({ error: 'Récompense introuvable' });
    const reward = rewardResult.rows[0];

    const earnedResult = await pool.query(
      `SELECT COALESCE(SUM(best_score), 0) as earned FROM (
         SELECT DISTINCT ON (course_id) score as best_score
         FROM quiz_attempts
         WHERE commercial_id = $1
         ORDER BY course_id, score DESC, completed_at DESC
       ) t`,
      [req.userId]
    );
    const spentResult = await pool.query(
      'SELECT COALESCE(SUM(cost_at_redemption), 0) as spent FROM reward_redemptions WHERE commercial_id = $1',
      [req.userId]
    );
    const balance = Number(earnedResult.rows[0].earned) - Number(spentResult.rows[0].spent);

    if (balance < reward.cost) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    await pool.query(
      'INSERT INTO reward_redemptions (commercial_id, reward_id, cost_at_redemption) VALUES ($1, $2, $3)',
      [req.userId, reward.id, reward.cost]
    );

    res.status(201).json({ message: 'Récompense échangée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;