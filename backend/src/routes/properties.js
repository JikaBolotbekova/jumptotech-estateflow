const express = require('express');
const { pool } = require('../db');
const { getCache, setCache, deleteCache } = require('../redisClient');

const router = express.Router();

const LIST_CACHE_KEY = 'properties:all';
const itemCacheKey = (id) => `properties:${id}`;
const LIST_TTL_SECONDS = 30;
const ITEM_TTL_SECONDS = 60;

function isValidProperty(body) {
  return (
    typeof body.title === 'string' &&
    body.title.trim().length > 0 &&
    typeof body.price === 'number' &&
    body.price >= 0
  );
}

// GET /api/properties
router.get('/', async (req, res, next) => {
  try {
    const cached = await getCache(LIST_CACHE_KEY);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const { rows } = await pool.query(
      'SELECT id, title, description, price, address, bedrooms, bathrooms, created_at FROM properties ORDER BY id'
    );
    await setCache(LIST_CACHE_KEY, rows, LIST_TTL_SECONDS);
    res.set('X-Cache', 'MISS');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cached = await getCache(itemCacheKey(id));
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const { rows } = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    await setCache(itemCacheKey(id), rows[0], ITEM_TTL_SECONDS);
    res.set('X-Cache', 'MISS');
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/properties
router.post('/', async (req, res, next) => {
  try {
    if (!isValidProperty(req.body)) {
      return res.status(400).json({ error: 'title (string) and price (number) are required' });
    }
    const { title, description = null, price, address = null, bedrooms = null, bathrooms = null } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO properties (title, description, price, address, bedrooms, bathrooms)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, price, address, bedrooms, bathrooms]
    );
    await deleteCache(LIST_CACHE_KEY);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/properties/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidProperty(req.body)) {
      return res.status(400).json({ error: 'title (string) and price (number) are required' });
    }
    const { title, description = null, price, address = null, bedrooms = null, bathrooms = null } = req.body;
    const { rows } = await pool.query(
      `UPDATE properties SET title = $1, description = $2, price = $3, address = $4,
         bedrooms = $5, bathrooms = $6 WHERE id = $7 RETURNING *`,
      [title, description, price, address, bedrooms, bathrooms, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    await deleteCache(LIST_CACHE_KEY, itemCacheKey(id));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/properties/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    await deleteCache(LIST_CACHE_KEY, itemCacheKey(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
