const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

let connecting;
function connect() {
  if (!connecting) {
    connecting = client.connect().catch((err) => {
      console.error('Redis connection failed:', err.message);
      connecting = undefined;
    });
  }
  return connecting;
}

async function ping() {
  if (!client.isOpen) await connect();
  return client.ping();
}

async function getCache(key) {
  try {
    if (!client.isOpen) await connect();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error(`Redis GET failed for ${key}:`, err.message);
    return null;
  }
}

async function setCache(key, value, ttlSeconds = 30) {
  try {
    if (!client.isOpen) await connect();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error(`Redis SET failed for ${key}:`, err.message);
  }
}

async function deleteCache(...keys) {
  try {
    if (!client.isOpen) await connect();
    if (keys.length) await client.del(keys);
  } catch (err) {
    console.error(`Redis DEL failed for ${keys.join(', ')}:`, err.message);
  }
}

module.exports = { client, connect, ping, getCache, setCache, deleteCache };
