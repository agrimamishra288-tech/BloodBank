const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const TABLE_SQL = path.join(__dirname, 'migrations/006_licensed_blood_banks.sql');
const PUBLISHER = 'Health and Family Welfare Department, Government of Tamil Nadu';

// JSON exports downloaded from data.gov.in ("Export in Other Format" -> JSON).
// To refresh one, download it again and replace its file in data/.
const DATASETS = [
  {
    key: 'tn-private',
    file: 'tn-private-blood-banks-data-gov-in.json',
    title: 'Details of Private Blood Banks',
    url: 'https://www.data.gov.in/resource/details-private-blood-banks',
    state: 'Tamil Nadu',
    ownership: 'Private',
  },
  {
    key: 'tn-government',
    file: 'tn-government-blood-banks-data-gov-in.json',
    title: 'Details of State Government Blood Banks',
    url: 'https://www.data.gov.in/resource/details-state-government-blood-banks',
    state: 'Tamil Nadu',
    ownership: 'Government',
  },
];

const FIELDS = {
  serial: ['sno', 'srno', 'slno'],
  name: ['nameofthebloodbank', 'nameofbloodbank', 'bloodbankname', 'name'],
  licence: ['licencenumber', 'licensenumber', 'licenceno', 'licenseno'],
  issued: ['dated', 'dateofissue', 'issuedate'],
  validUntil: ['validupto', 'validtill', 'validity'],
};

const normalizeLabel = (label) => String(label || '').toLowerCase().replace(/[^a-z]/g, '');

function clean(value) {
  return String(value ?? '').replace(/\uFFFD/g, ' ').replace(/\s+/g, ' ').trim();
}

function columnIndexes(fields) {
  const labels = fields.map((field) => normalizeLabel(field.label));
  const indexes = {};
  for (const [key, candidates] of Object.entries(FIELDS)) {
    indexes[key] = labels.findIndex((label) => candidates.includes(label));
  }
  if (indexes.name < 0) throw new Error(`No blood bank name column among: ${fields.map((f) => f.label).join(', ')}`);
  return indexes;
}

function isoDate(value) {
  const match = clean(value).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

// The source packs name and address into one cell, either on separate lines or comma-separated,
// sometimes with an "M/s." prefix and a "(Run by ... Trust)" note; text after the note is address.
function splitNameAndAddress(raw) {
  let text = String(raw ?? '').replace(/\uFFFD/g, ' ').replace(/\r/g, '');
  let operatedBy = null;
  text = text.replace(/\(\s*(?:run|managed|owned)\s+by\s+([^)]+)\)/i, (_, operator) => {
    operatedBy = clean(operator);
    return '\n';
  });
  text = text.replace(/^\s*M\/s\.?\s*/i, '');

  const lines = text.split('\n').map(clean).filter((line) => /[a-z0-9]/i.test(line));
  let name;
  let rest;
  if (lines.length > 1) {
    [name, ...rest] = lines;
    rest = rest.join(', ');
  } else {
    const single = lines[0] || '';
    const comma = single.indexOf(',');
    name = comma > 0 ? single.slice(0, comma) : single;
    rest = comma > 0 ? single.slice(comma + 1) : '';
  }

  const trim = (value) => clean(value).replace(/^[,.\s]+|[,.\s]+$/g, '');
  name = trim(name);
  const address = trim(rest).replace(/\s*,\s*/g, ', ') || null;

  const pinMatches = [...(address || name).matchAll(/\b(\d{3})\s?(\d{3})\b/g)];
  const pin = pinMatches.length ? pinMatches[pinMatches.length - 1] : null;
  const pincode = pin ? `${pin[1]}${pin[2]}` : null;

  let city = null;
  const location = address || '';
  const beforePin = pin ? location.slice(0, location.lastIndexOf(pin[0])) : location;
  const lastPart = beforePin.split(',').map(trim).filter(Boolean).pop();
  if (lastPart) city = trim(lastPart.replace(/[-–]\s*$/, '')) || null;
  if (city && /\d/.test(city)) city = null;

  return { name, address, city, pincode, operatedBy };
}

function loadDataset(dataset) {
  const body = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', dataset.file), 'utf8'));
  if (!Array.isArray(body.fields) || !Array.isArray(body.data)) {
    throw new Error(`${dataset.file} is not a data.gov.in JSON export (expected "fields" and "data").`);
  }
  const col = columnIndexes(body.fields);
  const at = (row, key) => (col[key] >= 0 ? row[col[key]] : null);

  const seen = new Set();
  const rows = [];
  for (const row of body.data) {
    const parsed = splitNameAndAddress(at(row, 'name'));
    if (!parsed.name) continue;
    const licence = clean(at(row, 'licence')) || null;
    let externalId = `${dataset.key}:${licence || clean(at(row, 'serial'))}`;
    if (seen.has(externalId)) externalId = `${externalId}:${clean(at(row, 'serial')) || rows.length + 1}`;
    seen.add(externalId);
    rows.push({
      externalId,
      ...parsed,
      licence,
      issued: isoDate(at(row, 'issued')),
      validUntil: isoDate(at(row, 'validUntil')),
    });
  }
  return rows;
}

async function importDatasets(datasets) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Idempotent; lets the import run on databases where init-db has not been re-run.
    await client.query(fs.readFileSync(TABLE_SQL, 'utf8'));
    for (const { dataset, rows } of datasets) {
      const sourceName = `data.gov.in, ${dataset.title} (${PUBLISHER}), Government Open Data License - India`;
      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM licensed_blood_banks WHERE dataset_key = $1', [dataset.key]);
        for (const row of rows) {
          await client.query(
            `INSERT INTO licensed_blood_banks
               (external_id, dataset_key, name, address, city, state, pincode, ownership, operated_by,
                licence_number, licence_issued_on, licence_valid_until, source_name, source_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [row.externalId, dataset.key, row.name, row.address, row.city, dataset.state, row.pincode,
              dataset.ownership, row.operatedBy, row.licence, row.issued, row.validUntil, sourceName, dataset.url],
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');

  const datasets = DATASETS.map((dataset) => ({ dataset, rows: loadDataset(dataset) }));
  if (!dryRun) await importDatasets(datasets);

  console.log(JSON.stringify({
    dry_run: dryRun,
    datasets: datasets.map(({ dataset, rows }) => ({
      key: dataset.key,
      title: dataset.title,
      ownership: dataset.ownership,
      rows: rows.length,
      with_pincode: rows.filter((row) => row.pincode).length,
      with_valid_until: rows.filter((row) => row.validUntil).length,
      sample: rows.slice(0, 2),
    })),
  }, null, 2));
}

if (require.main === module) main().catch((error) => {
  console.error(`Licensed blood bank import failed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { splitNameAndAddress, loadDataset, DATASETS };
