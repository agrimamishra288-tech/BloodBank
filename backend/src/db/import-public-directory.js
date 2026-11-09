const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SNAPSHOT_FILE = path.join(__dirname, 'data/blood-banks-india-2026-11-03.json');
const SOURCE_NAME = 'National Health Portal / NIHFW / MoHFW via data.gov.in; cleaned by IndiaDigital';
const SOURCE_URL = 'https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month';
const SOURCE_UPDATED_AT = '2022-07-12';

function slugToTitle(value) {
  return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function externalId(record) {
  const naturalKey = [record.name, record.city, record.state, record.pin, record.address]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
  return crypto.createHash('sha256').update(naturalKey).digest('hex');
}

function toValues(record, version) {
  return [
    externalId(record), String(record.name || '').trim(), record.address || null,
    record.city || null, record.district || null, slugToTitle(record.state),
    record.pin || null, record.phone || null, record.helpline || null,
    record.website || null, record.category || null, record.components ?? null,
    record.apheresis ?? null, record.hours || null, record.lat ?? null,
    record.lon ?? null, SOURCE_UPDATED_AT, version, SOURCE_NAME, SOURCE_URL,
  ];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length === 0) throw new Error('The public directory snapshot has no rows.');
  if (snapshot.licence !== 'CC-BY-4.0 + GODL-India') throw new Error('Unexpected data licence; import stopped.');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const table = await client.query("SELECT to_regclass('public.public_blood_bank_directory') AS name");
    if (!table.rows[0].name) throw new Error('Run npm run init-db:schema before importing the directory.');

    const columns = [
      'external_id','name','address','city','district','state','pincode','contact_phone',
      'helpline','website','category','has_components','has_apheresis','service_hours',
      'latitude','longitude','source_updated_at','snapshot_version','source_name','source_url',
    ];
    const chunkSize = 200;
    await client.query('BEGIN');
    try {
      for (let start = 0; start < snapshot.rows.length; start += chunkSize) {
        const chunk = snapshot.rows.slice(start, start + chunkSize);
        const values = chunk.flatMap((row) => toValues(row, snapshot.version));
        const rowSql = chunk.map((_, rowIndex) => {
          const first = rowIndex * columns.length + 1;
          return `(${columns.map((__, columnIndex) => `$${first + columnIndex}`).join(', ')})`;
        }).join(',\n');
        await client.query(
          `INSERT INTO public_blood_bank_directory (${columns.join(', ')}) VALUES ${rowSql}
           ON CONFLICT (external_id) DO UPDATE SET
             name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
             district = EXCLUDED.district, state = EXCLUDED.state, pincode = EXCLUDED.pincode,
             contact_phone = EXCLUDED.contact_phone, helpline = EXCLUDED.helpline,
             website = EXCLUDED.website, category = EXCLUDED.category,
             has_components = EXCLUDED.has_components, has_apheresis = EXCLUDED.has_apheresis,
             service_hours = EXCLUDED.service_hours, latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude, source_updated_at = EXCLUDED.source_updated_at,
             snapshot_version = EXCLUDED.snapshot_version, source_name = EXCLUDED.source_name,
             source_url = EXCLUDED.source_url, imported_at = NOW()`,
          values,
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    const result = await client.query(`
      SELECT COUNT(*)::INT AS count,
             COUNT(DISTINCT state)::INT AS states,
             MAX(snapshot_version)::TEXT AS snapshot_version,
             MAX(source_updated_at)::TEXT AS source_updated_at
      FROM public_blood_bank_directory
    `);
    console.log(JSON.stringify({ imported_snapshot_rows: snapshot.rows.length, ...result.rows[0] }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Public directory import failed: ${error.message}`);
  process.exitCode = 1;
});
