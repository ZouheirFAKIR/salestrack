const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [String(email || '').trim()]);
    const user = result.rows[0];

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (user.inactive) {
      return res.status(403).json({ error: 'Ce compte est désactivé. Contacte ton administrateur.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id, nom: user.nom, email: user.email,
        phone: user.phone, role: user.role, photo_url: user.photo_url,
        is_admin_access: user.is_admin_access,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;