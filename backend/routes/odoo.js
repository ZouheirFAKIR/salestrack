const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const odoo = require('../utils/odooClient');
const { toMoroccoDate } = odoo;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

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
  const cacheKey = `stats:${commercialId}:${date}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      const result = { linked: false, devis: 0, commandes: 0, chiffreAffaires: 0 };
      setCached(cacheKey, result);
      return res.json(result);
    }

    const dateObj = new Date(`${date}T00:00:00Z`);
    const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const orders = await odoo.execute(
      'sale.order',
      'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['create_date', '>=', `${prevDay.toISOString().slice(0, 10)} 00:00:00`],
        ['create_date', '<=', `${nextDay.toISOString().slice(0, 10)} 23:59:59`],
      ]],
      { fields: ['state', 'amount_total', 'create_date'] }
    );

    const ordersToday = orders.filter((o) => toMoroccoDate(o.create_date) === date);
    const devis = ordersToday.filter((o) => ['draft', 'sent'].includes(o.state)).length;
    const commandesList = ordersToday.filter((o) => ['sale', 'done'].includes(o.state));
    const commandes = commandesList.length;
    const chiffreAffaires = commandesList.reduce((sum, o) => sum + o.amount_total, 0);

    const result = { linked: true, devis, commandes, chiffreAffaires: Math.round(chiffreAffaires * 100) / 100 };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});



router.get('/daily/:commercialId', authMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const days = Math.min(parseInt(req.query.days, 10) || 7, 90);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      return res.json({ linked: false, daily: [] });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const fetchStart = new Date(startDate); fetchStart.setDate(fetchStart.getDate() - 1);
    const startStr = fetchStart.toISOString().slice(0, 10);

    const orders = await odoo.execute(
      'sale.order',
      'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['create_date', '>=', `${startStr} 00:00:00`],
      ]],
      { fields: ['state', 'create_date'] }
    );

    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { jour: key, devis: 0, commande: 0 };
    }

    orders.forEach((o) => {
      const day = toMoroccoDate(o.create_date);
      if (!dayMap[day]) return;
      if (['draft', 'sent'].includes(o.state)) dayMap[day].devis++;
      if (['sale', 'done'].includes(o.state)) dayMap[day].commande++;
    });

    res.json({ linked: true, daily: Object.values(dayMap) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});

router.get('/range/:commercialId', authMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const { start, end, groupBy = 'day' } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'start et end sont requis (format YYYY-MM-DD)' });
  }

  const cacheKey = `range:${commercialId}:${start}:${end}:${groupBy}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      const result = { linked: false, data: [] };
      setCached(cacheKey, result);
      return res.json(result);
    }

    const fetchStartDate = new Date(`${start}T00:00:00Z`); fetchStartDate.setUTCDate(fetchStartDate.getUTCDate() - 1);
    const fetchEndDate = new Date(`${end}T00:00:00Z`); fetchEndDate.setUTCDate(fetchEndDate.getUTCDate() + 1);

    const orders = await odoo.execute(
      'sale.order',
      'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['create_date', '>=', `${fetchStartDate.toISOString().slice(0, 10)} 00:00:00`],
        ['create_date', '<=', `${fetchEndDate.toISOString().slice(0, 10)} 23:59:59`],
      ]],
      { fields: ['state', 'create_date', 'amount_total'] }
    );

    const bucketMap = {};
    const getBucketKey = (dateStr) => (groupBy === 'month' ? dateStr.slice(0, 7) : dateStr.slice(0, 10));

    if (groupBy === 'month') {
      let cursor = new Date(start);
      const endDate = new Date(end);
      while (cursor <= endDate) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        bucketMap[key] = { periode: key, devis: 0, commande: 0, chiffreAffaires: 0 };
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      let cursor = new Date(start);
      const endDate = new Date(end);
      while (cursor <= endDate) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        bucketMap[key] = { periode: key, devis: 0, commande: 0, chiffreAffaires: 0 };
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    orders.forEach((o) => {
      const localDate = toMoroccoDate(o.create_date);
      const key = getBucketKey(localDate);
      if (!bucketMap[key]) return;
      if (['draft', 'sent'].includes(o.state)) bucketMap[key].devis++;
      if (['sale', 'done'].includes(o.state)) {
        bucketMap[key].commande++;
        bucketMap[key].chiffreAffaires += o.amount_total;
      }
    });

    const data = Object.values(bucketMap).sort((a, b) => a.periode.localeCompare(b.periode));
    const result = { linked: true, data };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});


router.get('/activities-daily/:commercialId', authMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const days = Math.min(parseInt(req.query.days, 10) || 7, 30);
  const endStr = req.query.end || new Date().toISOString().slice(0, 10);
  const cacheKey = `activities-daily:${commercialId}:${endStr}:${days}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      return res.json({ linked: false, daily: [], categories: [] });
    }

    const endDate = new Date(`${endStr}T00:00:00Z`);
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    const startStr = startDate.toISOString().slice(0, 10);

    const rangeStart = new Date(endDate);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 180);

    const raw = await odoo.execute(
      'mail.activity',
      'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['date_deadline', '>=', rangeStart.toISOString().slice(0, 10)],
        ['date_deadline', '<=', endStr],
      ]],
      { fields: ['activity_type_id', 'date_deadline', 'active', 'activity_cancel'], context: { active_test: false } }
    );
    const records = raw.filter((r) => !(r.active === false && r.activity_cancel));

    const allTimeCount = {};
    records.forEach((r) => {
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      allTimeCount[label] = (allTimeCount[label] || 0) + 1;
    });

    const allCategories = Object.entries(allTimeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);

    const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
    const categorySlugs = {};
    allCategories.forEach((label) => { categorySlugs[label] = slugify(label); });

    const weekRecords = records.filter((r) => r.date_deadline >= startStr && r.date_deadline <= endStr);

    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { jour: key };
      allCategories.forEach((label) => { dayMap[key][categorySlugs[label]] = 0; });
    }

    weekRecords.forEach((r) => {
      const day = r.date_deadline;
      if (!dayMap[day]) return;
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      dayMap[day][categorySlugs[label]]++;
    });

    const categories = allCategories.map((label) => ({ key: categorySlugs[label], label }));

    const result = { linked: true, daily: Object.values(dayMap), categories };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});

router.get('/activities/:commercialId', authMiddleware, async (req, res) => {
  const { commercialId } = req.params;
  const cacheKey = `activities:${commercialId}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const userResult = await pool.query('SELECT odoo_user_id FROM users WHERE id = $1', [commercialId]);
    const odooUserId = userResult.rows[0]?.odoo_user_id;

    if (!odooUserId) {
      return res.json({ linked: false, planned: 0, overdue: 0, byCategory: [] });
    }

    const records = await odoo.execute(
      'mail.activity',
      'search_read',
      [[['user_id', '=', odooUserId]]],
      { fields: ['activity_type_id', 'date_deadline', 'state', 'active', 'activity_cancel'], context: { active_test: false } }
    );

    const done = records.filter((r) => r.active === false && !r.activity_cancel).length;
    const cancelled = records.filter((r) => r.active === false && r.activity_cancel).length;
    const planned = records.filter((r) => r.active !== false && (r.state === 'planned' || r.state === 'today')).length;
    const overdue = records.filter((r) => r.active !== false && r.state === 'overdue').length;

    const categoryMap = {};
    records.forEach((r) => {
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      if (!categoryMap[label]) categoryMap[label] = { type: label, planned: 0, overdue: 0, done: 0, cancelled: 0 };
      if (r.active === false && r.activity_cancel) categoryMap[label].cancelled++;
      else if (r.active === false) categoryMap[label].done++;
      else if (r.state === 'overdue') categoryMap[label].overdue++;
      else categoryMap[label].planned++;
    });

    const result = {
      linked: true,
      total: records.length,
      planned,
      overdue,
      done,
      cancelled,
      byCategory: Object.values(categoryMap).sort(
        (a, b) => (b.planned + b.overdue + b.done + b.cancelled) - (a.planned + a.overdue + a.done + a.cancelled)
      ),
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de connexion à Odoo' });
  }
});

module.exports = router;