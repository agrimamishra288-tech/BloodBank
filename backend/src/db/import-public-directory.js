const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SNAPSHOT_FILE = path.join(__dirname, 'data/blood-banks-india-2026-11-03.json');
const INDEX_URL = 'https://indiadigital.org/open/data/v1/index.json';
const FALLBACK_SOURCE_URL = 'https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month';

function slugToTitle(value) {
  return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function externalId(record) {
  const naturalKey = [record.name, record.city, record.state, record.pin, record.address]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
  return crypto.createHash('sha256').update(naturalKey).digest('hex');
}

function sourceDate(snapshot) {
  const caveat = snapshot.caveats?.find((item) => /source was last updated on/i.test(item)) || '';
  return caveat.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null;
}

function toValues(record, snapshot) {
  return [
    externalId(record), String(record.name || '').trim(), record.address || null,
    record.city || null, record.district || null, slugToTitle(record.state),
    record.pin || null, record.phone || null, record.helpline || null,
    record.website || null, record.category || null, record.components ?? null,
    record.apheresis ?? null, record.hours || null, record.lat ?? null,
    record.lon ?? null, sourceDate(snapshot), snapshot.version,
    snapshot.attribution || 'Public Blood Bank Directory',
    snapshot.sources?.[0]?.url || FALLBACK_SOURCE_URL,
  ];
}

async function loadSnapshot(refresh) {
  if (!refresh) return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

  const indexResponse = await fetch(INDEX_URL, { signal: AbortSignal.timeout(20_000) });
  if (!indexResponse.ok) throw new Error(`Directory index download failed (${indexResponse.status}).`);
  const index = await indexResponse.json();
  const dataset = index.datasets?.find((item) => item.id === 'blood-banks');
  if (!dataset || !/^\d{4}-\d{2}-\d{2}$/.test(dataset.version) || !dataset.json
      || !String(dataset.licence).includes('GODL-India')) {
    throw new Error('The directory publisher metadata or licence could not be verified; refresh stopped.');
  }
  const dataUrl = new URL(dataset.json);
  if (dataUrl.protocol !== 'https:' || dataUrl.hostname !== 'indiadigital.org' || !dataUrl.pathname.startsWith('/open/data/v1/')) {
    throw new Error('The directory publisher returned an unexpected download URL; refresh stopped.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT MAX(snapshot_version)::TEXT AS version FROM public_blood_bank_directory');
    if (rows[0]?.version === dataset.version) {
      console.log(JSON.stringify({ updated: false, snapshot_version: dataset.version, reason: 'Already current with the publisher snapshot.' }, null, 2));
      return null;
    }
  } finally {
    await client.end();
  }

  const dataResponse = await fetch(dataUrl, { signal: AbortSignal.timeout(30_000) });
  if (!dataResponse.ok) throw new Error(`Directory download failed (${dataResponse.status}).`);
  const snapshot = await dataResponse.json();
  if (snapshot.id !== 'blood-banks' || snapshot.version !== dataset.version || !Array.isArray(snapshot.rows)
      || snapshot.rows.length !== dataset.rows || snapshot.rows.length === 0
      || !String(snapshot.licence).includes('GODL-India')) {
    throw new Error('Downloaded directory failed version, row-count, or licence checks; database was not changed.');
  }
  return snapshot;
}

async function importSnapshot(snapshot) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length === 0) throw new Error('The public directory snapshot has no rows.');
  if (!String(snapshot.licence).includes('GODL-India')) throw new Error('Unexpected data licence; import stopped.');

  const sourceUrl = snapshot.sources?.[0]?.url || FALLBACK_SOURCE_URL;

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
      await client.query('CREATE TEMP TABLE current_public_banks (external_id TEXT PRIMARY KEY) ON COMMIT DROP');
      for (let start = 0; start < snapshot.rows.length; start += chunkSize) {
        const chunk = snapshot.rows.slice(start, start + chunkSize);
        const values = chunk.flatMap((row) => toValues(row, snapshot));
        const idValues = chunk.map((row) => externalId(row));
        await client.query(
          `INSERT INTO current_public_banks (external_id) VALUES ${idValues.map((_, i) => `($${i + 1})`).join(',')}
           ON CONFLICT DO NOTHING`,
          idValues,
        );
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
      await client.query(
        'DELETE FROM public_blood_bank_directory WHERE source_url = $1 AND external_id NOT IN (SELECT external_id FROM current_public_banks)',
        [sourceUrl],
      );
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
    console.log(JSON.stringify({ imported_snapshot_rows: snapshot.rows.length, source: snapshot.attribution, ...result.rows[0] }, null, 2));
  } finally {
    await client.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');
  const snapshot = await loadSnapshot(process.argv.includes('--refresh'));
  if (snapshot) await importSnapshot(snapshot);
}

if (require.main === module) main().catch((error) => {
  console.error(`Public directory import failed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = {
  refreshPublicDirectory: async () => {
    const snapshot = await loadSnapshot(true);
    if (snapshot) await importSnapshot(snapshot);
  },
};
