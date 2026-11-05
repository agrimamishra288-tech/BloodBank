const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const identifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const server = await client.query(`
      SELECT current_database() AS database,
             current_user AS connected_as,
             inet_server_addr()::text AS host_address,
             inet_server_port() AS port,
             version() AS version
    `);

    let dataDirectory = 'Not available to this database user';
    try {
      const location = await client.query('SHOW data_directory');
      dataDirectory = location.rows[0].data_directory;
    } catch { /* PostgreSQL may restrict this setting to administrators. */ }

    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const rowCounts = {};
    for (const { table_name: tableName } of tables) {
      if (!/^[a-z][a-z0-9_]*$/i.test(tableName)) continue;
      const result = await client.query(`SELECT COUNT(*)::INT AS count FROM public.${identifier(tableName)}`);
      rowCounts[tableName] = result.rows[0].count;
    }

    const objectCounts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public')::INT AS views,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public')::INT AS indexes,
        (SELECT COUNT(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal)::INT AS triggers,
        (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public')::INT AS routines
    `);

    const integrity = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM (SELECT lower(email) FROM users GROUP BY lower(email) HAVING COUNT(*) > 1) d)::INT AS duplicate_emails,
        (SELECT COUNT(*) FROM (SELECT user_id FROM donors GROUP BY user_id HAVING COUNT(*) > 1) d)::INT AS duplicate_donor_profiles,
        (SELECT COUNT(*) FROM blood_requests WHERE units_fulfilled < 0 OR units_fulfilled > units_needed)::INT AS invalid_request_totals,
        (SELECT COUNT(*) FROM inventory WHERE status = 'available' AND expiry_date < CURRENT_DATE)::INT AS expired_units_marked_available,
        (SELECT COUNT(*) FROM donors d WHERE d.total_donations <> (SELECT COUNT(*) FROM donations x WHERE x.donor_id = d.donor_id))::INT AS donor_history_count_mismatches
    `);
    const donorHistoryDrift = await client.query(`
      SELECT d.donor_id,
             d.total_donations AS stored_total,
             COUNT(dn.donation_id)::INT AS recorded_total,
             d.last_donation_date::TEXT AS stored_last_date,
             MAX(dn.donation_date)::TEXT AS recorded_last_date
      FROM donors d
      LEFT JOIN donations dn ON dn.donor_id = d.donor_id
      GROUP BY d.donor_id, d.total_donations, d.last_donation_date
      HAVING d.total_donations <> COUNT(dn.donation_id)
          OR d.last_donation_date IS DISTINCT FROM MAX(dn.donation_date)
      ORDER BY d.donor_id
    `);

    const { rows: migrationRows } = await client.query(`
      SELECT to_regclass('public.schema_migrations') IS NOT NULL AS migrations_enabled
    `);

    console.log(JSON.stringify({
      connection: { ...server.rows[0], version: server.rows[0].version.split(' ').slice(0, 2).join(' '), data_directory: dataDirectory },
      schema: { base_tables: tables.length, ...objectCounts.rows[0], migrations_enabled: migrationRows[0].migrations_enabled },
      rows: rowCounts,
      integrity: integrity.rows[0],
      donor_history_mismatches: donorHistoryDrift.rows,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Database status check failed: ${error.message}`);
  process.exitCode = 1;
});
