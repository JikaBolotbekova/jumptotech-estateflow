const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'estateflow',
  password: process.env.PGPASSWORD || 'estateflow',
  database: process.env.PGDATABASE || 'estateflow',
  max: 10,
  idleTimeoutMillis: 30000,
});

async function checkConnection() {
  const result = await pool.query('SELECT 1');
  return result.rowCount === 1;
}

module.exports = { pool, checkConnection };
