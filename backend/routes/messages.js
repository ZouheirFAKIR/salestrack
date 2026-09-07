const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Liste de tous les contacts possibles + dernier message + non-lus
router.get('/conversations', async (req, res) => {
  const myId = req.userId;
  try {
    const result = await pool.query(
      `SELECT u.id, u.nom, u.photo_url,
         lm.content as last_message,
         lm.created_at as last_message_at,
         lm.sender_id as last_sender_id,
         COALESCE(unread.count, 0) as unread_count
       FROM users u
       LEFT JOIN LATERAL (
         SELECT content, created_at, sender_id FROM messages
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id)
         ORDER BY created_at DESC LIMIT 1
       ) lm ON true
       LEFT JOIN (
         SELECT sender_id, COUNT(*) as count FROM messages
         WHERE receiver_id = $1 AND read = FALSE
         GROUP BY sender_id
       ) unread ON unread.sender_id = u.id
       WHERE u.id != $1::integer AND u.hidden = FALSE
       ORDER BY lm.created_at DESC NULLS LAST, u.nom ASC`,
      [myId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Total de messages non lus (pour le badge sur l'icône flottante)
router.get('/unread/count', async (req, res) => {
  const myId = req.userId;
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND read = FALSE`,
      [myId]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fil de discussion avec un utilisateur précis (marque aussi comme lu)
router.get('/:userId', async (req, res) => {
  const myId = req.userId;
  const otherId = req.params.userId;
  try {
    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, content, created_at, read
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [myId, otherId]
    );

    await pool.query(
      `UPDATE messages SET read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE`,
      [otherId, myId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Envoyer un message
router.post('/:userId', async (req, res) => {
  const myId = req.userId;
  const otherId = req.params.userId;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message vide' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [myId, otherId, content.trim()]
    );
    const message = result.rows[0];

    const io = req.app.get('io');
    console.log('[chat-backend] io existe ?', !!io, '| envoi vers user:' + otherId, 'et user:' + myId);
    if (io) {
      io.to(`user:${otherId}`).emit('new_message', message);
      io.to(`user:${myId}`).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;