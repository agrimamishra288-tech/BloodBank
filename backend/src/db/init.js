/**
 * Safe database setup.
 *   npm run init-db               → schema + migrations + seed if empty
 *   npm run init-db:schema        → schema + migrations only
 *   npm run init-db:seed          → migrations + seed if empty
 *
 * Seeding never truncates or replaces existing application data.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const SEED_FILE = path.join(__dirname, 'seed.sql');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runSqlFile(client, filePath, label) {
  console.log(`\nRunning ${label}…`);
  await client.query(fs.readFileSync(filePath, 'utf8'));
  console.log(`${label} complete.`);
}

async function applyMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationFiles = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort()
    : [];

  for (const fileName of migrationFiles) {
    const version = fileName.split('_')[0];
    const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (rowCount) continue;

    console.log(`\nApplying database migration ${fileName}…`);
    await client.query('BEGIN');
    try {
      await runSqlFile(client, path.join(MIGRATIONS_DIR, fileName), fileName);
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [version, fileName],
      );
      await client.query('COMMIT');
      console.log(`Migration ${version} recorded.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}

async function seedIfEmpty(client) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM users
      UNION ALL SELECT 1 FROM blood_banks
      UNION ALL SELECT 1 FROM donors
      UNION ALL SELECT 1 FROM patients
      UNION ALL SELECT 1 FROM inventory
      UNION ALL SELECT 1 FROM blood_requests
    ) AS has_application_data
  `);

  if (rows[0].has_application_data) {
    console.log('\nSeed skipped: this database already contains application data.');
    console.log('Existing records were preserved.');
    return;
  }

  console.log('\nSeeding an empty database…');
  const hash = await bcrypt.hash('Test@1234', 10);
  await client.query('BEGIN');
  try {
    await client.query(fs.readFileSync(SEED_FILE, 'utf8'));
    await client.query('UPDATE users SET password_hash = $1', [hash]);
    await client.query('COMMIT');
    console.log('Seed data loaded; demo accounts use the password listed in the README.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const schemaOnly = args.includes('--schema-only');
  const seedOnly = args.includes('--seed-only');

  if (schemaOnly && seedOnly) throw new Error('Choose either --schema-only or --seed-only, not both.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Configure backend/.env first.');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const connection = await client.query('SELECT current_database() AS name');
    console.log(`Connected to PostgreSQL database "${connection.rows[0].name}".`);

    if (!seedOnly) await runSqlFile(client, SCHEMA_FILE, 'schema.sql');
    await applyMigrations(client);
    if (!schemaOnly) await seedIfEmpty(client);

    console.log('\nDatabase setup finished. Run "npm run db:status" to inspect it.');
  } catch (error) {
    console.error(`\nDatabase setup failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
