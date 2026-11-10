const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/db');
const { client: redisClient, connect: redisConnect } = require('../src/redisClient');

beforeAll(async () => {
  await redisConnect();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(12, 2) NOT NULL,
      address VARCHAR(255),
      bedrooms SMALLINT,
      bathrooms SMALLINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query('TRUNCATE properties RESTART IDENTITY');
  await pool.query(
    `INSERT INTO properties (title, description, price, address, bedrooms, bathrooms)
     VALUES ('Test Villa', 'A villa used for tests.', 500000, '1 Test Way', 3, 2)`
  );
  await redisClient.flushAll();
});

afterAll(async () => {
  await pool.end();
  if (redisClient.isOpen) await redisClient.quit();
});

describe('GET /api/health', () => {
  it('reports db and redis as up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
    expect(res.body.redis).toBe('up');
  });
});

describe('GET /api/properties', () => {
  it('returns the seeded property on first request (cache MISS)', async () => {
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBe('Test Villa');
  });

  it('returns a cache HIT on the second identical request', async () => {
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
  });
});

describe('POST /api/properties', () => {
  it('creates a new property and invalidates the list cache', async () => {
    const createRes = await request(app)
      .post('/api/properties')
      .send({ title: 'New Condo', price: 199000, bedrooms: 1, bathrooms: 1 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe('New Condo');

    const listRes = await request(app).get('/api/properties');
    expect(listRes.headers['x-cache']).toBe('MISS');
    expect(listRes.body.some((p) => p.title === 'New Condo')).toBe(true);
  });

  it('rejects an invalid payload', async () => {
    const res = await request(app).post('/api/properties').send({ price: 100 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/properties/:id', () => {
  it('returns 404 for a missing property', async () => {
    const res = await request(app).get('/api/properties/999999');
    expect(res.status).toBe(404);
  });

  it('returns a property by id', async () => {
    const res = await request(app).get('/api/properties/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });
});

describe('PUT /api/properties/:id', () => {
  it('updates an existing property', async () => {
    const res = await request(app)
      .put('/api/properties/1')
      .send({ title: 'Updated Villa', price: 550000 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Villa');
  });
});

describe('DELETE /api/properties/:id', () => {
  it('deletes an existing property', async () => {
    const res = await request(app).delete('/api/properties/1');
    expect(res.status).toBe(204);

    const getRes = await request(app).get('/api/properties/1');
    expect(getRes.status).toBe(404);
  });
});
