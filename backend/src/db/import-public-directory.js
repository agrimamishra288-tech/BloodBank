const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const dataGovIn = require('../services/datagovin');

const SNAPSHOT_FILE = path.join(__dirname, 'data/blood-banks-india-2026-11-03.json');
const INDEX_URL = 'https://indiadigital.org/open/data/v1/index.json';
const FALLBACK_SOURCE_URL = 'https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month';
const DATA_GOV_IN_RESOURCE_ID = 'fced6df9-a360-4e08-8ca0-f283fc74ce15';

function slugToTitle(value) {
  return String(value || '').toLowerCase().replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

// data.gov.in field ids vary in punctuation (e.g. `blood_bank_name`, `_pincode`), so match on
// lowercase alphanumerics only.
const DATA_GOV_IN_FIELDS = {
  name: ['bloodbankname', 'nameofbloodbank', 'bloodbank', 'name'],
  state: ['state', 'statename', 'stateut'],
  district: ['district', 'districtname'],
  city: ['city', 'cityname'],
  address: ['address'],
  pin: ['pincode', 'pin', 'pinno'],
  phone: ['contactno', 'contactnumber', 'phone', 'phoneno', 'contact', 'mobile'],
  helpline: ['helpline', 'helplineno'],
  website: ['website', 'websiteurl'],
  category: ['category', 'type'],
  components: ['bloodcomponentavailable', 'bloodcomponentsavailable', 'componentavailable', 'components'],
  apheresis: ['apheresis', 'apheresisavailable'],
  hours: ['servicetime', 'servicetiming', 'servicehours', 'timing'],
  lat: ['latitude', 'lat'],
  lon: ['longitude', 'long', 'lon', 'lng'],
};

function cleanText(value) {
  const text = String(value ?? '').trim();
  return /^(|na|n\/a|n\.a\.?|nil|null|none|-+|0)$/i.test(text) ? '' : text;
}

function yesNo(value) {
  const text = cleanText(value).toLowerCase();
  if (/^(y|yes|true|1|available)$/.test(text)) return true;
  if (/^(n|no|false|not available)$/.test(text)) return false;
  return null;
}

function coordinate(value, limit) {
  const number = Number.parseFloat(cleanText(value));
  return Number.isFinite(number) && number !== 0 && Math.abs(number) <= limit ? number : null;
}

function mapDataGovRecord(record) {
  const byKey = new Map(Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]));
  const pick = (field) => cleanText(DATA_GOV_IN_FIELDS[field].map((key) => byKey.get(key)).find((value) => cleanText(value)));
  const lat = coordinate(pick('lat'), 90);
  const lon = coordinate(pick('lon'), 180);
  return {
    name: pick('name'), state: pick('state'), district: pick('district'), city: pick('city'),
    address: pick('address'), pin: pick('pin'), phone: pick('phone'), helpline: pick('helpline'),
    website: pick('website'), category: pick('category'),
    components: yesNo(pick('components')), apheresis: yesNo(pick('apheresis')), hours: pick('hours'),
    lat: lat !== null && lon !== null ? lat : null,
    lon: lat !== null && lon !== null ? lon : null,
  };
}

async function loadDataGovSnapshot() {
  const resourceId = process.env.DATA_GOV_IN_BLOOD_BANK_RESOURCE_ID?.trim() || DATA_GOV_IN_RESOURCE_ID;
  const resource = await dataGovIn.fetchAllRecords(resourceId);
  if (resource.records.length !== resource.total) {
    throw new Error(`data.gov.in returned ${resource.records.length} of ${resource.total} records; database was not changed.`);
  }
  const rows = resource.records.map(mapDataGovRecord).filter((row) => row.name && row.state);
  if (rows.length < resource.records.length * 0.9) {
    throw new Error(`Only ${rows.length} of ${resource.records.length} data.gov.in records had a name and state; check the field mapping. Fields: ${resource.fields.map((f) => f.id).join(', ')}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: 'blood-banks',
    version: resource.updatedDate || today,
    licence: 'GODL-India',
    attribution: `Source: ${resource.title}, National Health Portal / MoHFW, live from the data.gov.in OGD API under the Government Open Data License - India.`,
    sources: [{ name: `data.gov.in API: ${resourceId}`, url: FALLBACK_SOURCE_URL }],
    caveats: resource.updatedDate ? [`The source was last updated on ${resource.updatedDate}.`] : [],
    fields: resource.fields,
    rows,
  };
}

async function hasApiImport() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      "SELECT 1 FROM public_blood_bank_directory WHERE source_name LIKE '%data.gov.in OGD API%' LIMIT 1",
    );
    return rowCount > 0;
  } finally {
    await client.end();
  }
}

async function loadSnapshot(refresh) {
  const apiRequested = process.argv.includes('--data-gov-in');
  if (apiRequested && !dataGovIn.isConfigured()) throw new Error('DATA_GOV_IN_API_KEY is not set in backend/.env');
  if (dataGovIn.isConfigured() && (refresh || apiRequested)) {
    try {
      return await loadDataGovSnapshot();
    } catch (error) {
      // Never replace newer API rows with the older mirror; keep what is stored and retry next refresh.
      if (apiRequested || await hasApiImport()) throw error;
      console.error(`data.gov.in sync failed, falling back to the mirror snapshot: ${error.message}`);
    }
  }
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
  if (snapshot && process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({
      source: snapshot.sources?.[0]?.name, version: snapshot.version, rows: snapshot.rows.length,
      fields: snapshot.fields?.map((field) => field.id), sample: snapshot.rows.slice(0, 2),
    }, null, 2));
    return;
  }
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
