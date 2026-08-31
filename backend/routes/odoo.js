const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const odoo = require('../utils/odooClient');

router.get('/commercials', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom, email, odoo_user_id FROM users
       WHERE role != 'admin' OR role IS NULL
       ORDER BY nom ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await odoo.execute(
      'res.users',
      'search_read',
      [[['login', 'like', '@yealead.com'], ['active', '=', true]]],
      { fields: ['id', 'name', 'login'] }
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});

router.post('/mapping', authMiddleware, adminMiddleware, async (req, res) => {
  const { commercialId, odooUserId } = req.body;
  try {
    await pool.query(
      'UPDATE users SET odoo_user_id = $1 WHERE id = $2',
      [odooUserId || null, commercialId]
    );
    res.json({ message: 'Association enregistrée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/stats/:commercialId', authMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      return res.json({ linked: false, devis: 0, commandes: 0, chiffreAffaires: 0 });
    }

    const orders = await odoo.execute(
      'sale.order',
      'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['date_order', '>=', `${date} 00:00:00`],
        ['date_order', '<=', `${date} 23:59:59`],
      ]],
      { fields: ['state', 'amount_total'] }
    );

    const devis = orders.filter((o) => ['draft', 'sent'].includes(o.state)).length;
    const commandesList = orders.filter((o) => ['sale', 'done'].includes(o.state));
    const commandes = commandesList.length;
    const chiffreAffaires = commandesList.reduce((sum, o) => sum + o.amount_total, 0);

    res.json({ linked: true, devis, commandes, chiffreAffaires: Math.round(chiffreAffaires) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});

module.exports = router;