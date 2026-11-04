/**
 * Database Initialization Script
 * Usage:
 *   npm run init-db               → schema + seed + hash passwords
 *   node src/db/init.js --schema-only
 *   node src/db/init.js --seed-only
 */
const { Client } = require('pg');
const fs         = require('fs');
const path       = require('path');
const bcrypt     = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const SEED_FILE   = path.join(__dirname, 'seed.sql');

async function runFile(client, filePath, label) {
  console.log(`\n⏳  Running ${label}…`);
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log(`✅  ${label} complete.`);
}

async function main() {
  const args       = process.argv.slice(2);
  const schemaOnly = args.includes('--schema-only');
  const seedOnly   = args.includes('--seed-only');

  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('🔗  Connected to PostgreSQL');

    if (!seedOnly)   await runFile(client, SCHEMA_FILE, 'schema.sql');

    if (!schemaOnly) {
      await runFile(client, SEED_FILE, 'seed.sql');

      // Seed SQL stores a placeholder; replace with a real bcrypt hash so
      // bcrypt.compare() works correctly during login.
      console.log('\n⏳  Hashing seed passwords (bcrypt, cost 10)…');
      const hash = await bcrypt.hash('Test@1234', 10);
      await client.query('UPDATE users SET password_hash = $1', [hash]);
      console.log('✅  All seed user passwords set to: Test@1234');
    }

    console.log('\n🎉  Database ready!\n');
  } catch (err) {
    console.error('\n❌  Initialization failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
