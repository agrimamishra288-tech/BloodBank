const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment variables.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep a reasonable pool size for a university project
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors (e.g. connection dropped)
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Test that the database is reachable.
 * Called once at server startup.
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() AS now');
    console.log(`✅ PostgreSQL connected — server time: ${result.rows[0].now}`);
  } finally {
    client.release();
  }
}

async function expireStaleInventory() {
  const result = await pool.query(`
    UPDATE inventory
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'available' AND expiry_date < CURRENT_DATE
  `);
  return result.rowCount;
}

module.exports = { pool, testConnection, expireStaleInventory };
