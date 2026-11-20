const router = require('express').Router();
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth.middleware');

// Read-only views over the externally sourced reference tables (data.gov.in, Tamil Nadu
// licence lists, World Bank). These are directories and statistics, not live blood stock.

router.use(authenticate);

const FILTERS = {
  source: 'source_table',
  state: 'state',
  ownership: 'ownership',
  facility_type: 'facility_type',
  blood_products: 'blood_products',
  licence_status: 'licence_status',
};

function buildWhere(query) {
  const conditions = [];
  const params = [];
  for (const [param, column] of Object.entries(FILTERS)) {
    const value = String(query[param] ?? '').trim();
    if (!value) continue;
    params.push(value);
    conditions.push(`${column} = $${params.length}`);
  }
  const search = String(query.search ?? '').trim();
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(name ILIKE ${p} OR city ILIKE ${p} OR district ILIKE ${p} OR address ILIKE ${p} OR pincode ILIKE ${p})`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

// GET /api/reference/blood-banks — filterable list across all public blood bank sources
router.get('/blood-banks', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const { where, params } = buildWhere(req.query);

    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*)::INT AS total FROM vw_blood_bank_reference ${where}`, params,
    );
    const { rows } = await pool.query(
      `SELECT * FROM vw_blood_bank_reference ${where}
       ORDER BY state, city NULLS LAST, name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ success: true, total, page, limit, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reference/summary — counts per filter value, source metadata, and state list
router.get('/summary', async (_req, res, next) => {
  try {
    const { rows: facets } = await pool.query(
      `SELECT 'ownership' AS facet, ownership AS value, COUNT(*)::INT AS count FROM vw_blood_bank_reference GROUP BY ownership
       UNION ALL SELECT 'facility_type', facility_type, COUNT(*)::INT FROM vw_blood_bank_reference GROUP BY facility_type
       UNION ALL SELECT 'blood_products', blood_products, COUNT(*)::INT FROM vw_blood_bank_reference GROUP BY blood_products
       UNION ALL SELECT 'licence_status', licence_status, COUNT(*)::INT FROM vw_blood_bank_reference WHERE licence_status IS NOT NULL GROUP BY licence_status
       ORDER BY facet, count DESC`,
    );
    const { rows: sources } = await pool.query(
      `SELECT source_table, source_name, MIN(source_url) AS source_url, COUNT(*)::INT AS count,
              MAX(source_updated_at) AS source_updated_at, MAX(imported_at) AS imported_at
       FROM vw_blood_bank_reference
       GROUP BY source_table, source_name
       ORDER BY count DESC`,
    );
    const { rows: states } = await pool.query(
      `SELECT state, COUNT(*)::INT AS count FROM vw_blood_bank_reference
       WHERE state IS NOT NULL GROUP BY state ORDER BY state`,
    );

    const grouped = {};
    for (const { facet, value, count } of facets) (grouped[facet] ||= []).push({ value, count });
    res.json({ success: true, data: { facets: grouped, sources, states } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reference/world-bank — yearly series per indicator and country
router.get('/world-bank', async (req, res, next) => {
  try {
    const country = String(req.query.country || 'IND').trim().toUpperCase();
    const { rows } = await pool.query(
      `SELECT indicator_code, indicator_name, country_code, country_name, year, value,
              source_name, source_url, source_updated_at, imported_at
       FROM world_bank_indicators
       WHERE country_code = $1
       ORDER BY indicator_name, year`,
      [country],
    );

    const indicators = new Map();
    for (const row of rows) {
      if (!indicators.has(row.indicator_code)) {
        indicators.set(row.indicator_code, {
          indicator_code: row.indicator_code,
          indicator_name: row.indicator_name,
          country_code: row.country_code,
          country_name: row.country_name,
          source_name: row.source_name,
          source_url: row.source_url,
          source_updated_at: row.source_updated_at,
          imported_at: row.imported_at,
          series: [],
        });
      }
      indicators.get(row.indicator_code).series.push({ year: row.year, value: row.value });
    }
    res.json({ success: true, data: [...indicators.values()] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
