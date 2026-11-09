const router = require('express').Router();
const Joi    = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');

// GET /api/banks/directory — public reference snapshot, separate from
// operational Hemora banks and their inventory.
router.get('/directory', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (req.query.search?.trim()) {
      params.push(`%${req.query.search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length} OR district ILIKE $${params.length} OR state ILIKE $${params.length} OR pincode ILIKE $${params.length})`);
    }
    if (req.query.state?.trim()) {
      params.push(`%${req.query.state.trim()}%`);
      conditions.push(`state ILIKE $${params.length}`);
    }
    if (req.query.city?.trim()) {
      params.push(`%${req.query.city.trim()}%`);
      conditions.push(`city ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await pool.query(
      `SELECT COUNT(*)::INT AS total FROM public_blood_bank_directory ${where}`,
      params,
    );
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT external_id, name, address, city, district, state, pincode,
              contact_phone, helpline, website, category, has_components,
              has_apheresis, service_hours, latitude, longitude,
              source_updated_at, snapshot_version, source_name, source_url
       FROM public_blood_bank_directory ${where}
       ORDER BY state, city, name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({
      success: true,
      total: count.rows[0].total,
      page,
      limit,
      data: rows,
      source: {
        name: 'Blood Bank Directory, National Health Portal / NIHFW / MoHFW via data.gov.in',
        url: 'https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month',
        snapshot_version: '2026-11-03',
        source_updated_at: '2022-07-12',
        note: 'Reference listings only. Contact the centre to confirm details; live stock is not included.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/banks ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { city } = req.query;
    const params   = [];
    const where    = city ? (params.push(`%${city}%`), `WHERE b.city ILIKE $1`) : '';

    const { rows } = await pool.query(
      `SELECT b.*,
         COALESCE(SUM(s.units_available), 0)::INT AS total_units_available
       FROM blood_banks b
       LEFT JOIN vw_available_stock s ON s.bank_id = b.bank_id
       ${where}
       GROUP BY b.bank_id
       ORDER BY b.name`,
      params,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/banks/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM blood_banks WHERE bank_id = $1', [req.params.id]);
    if (!rows.length) throw createError(404, 'Blood bank not found.');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/banks/:id/stock ──────────────────────────────────
router.get('/:id/stock', async (req, res, next) => {
  try {
    const LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD) || 3;

    const { rows: stock } = await pool.query(
      `SELECT blood_group, units_available, earliest_expiry,
              units_available < $2 AS low_stock
       FROM vw_available_stock WHERE bank_id = $1
       ORDER BY blood_group`,
      [req.params.id, LOW_STOCK],
    );

    const { rows: expiring } = await pool.query(
      `SELECT * FROM vw_expiring_soon WHERE bank_id = $1`,
      [req.params.id],
    );

    res.json({ success: true, data: { stock, expiring } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/banks ───────────────────────────────────────────
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  const schema = Joi.object({
    name:          Joi.string().trim().required(),
    address:       Joi.string().trim().required(),
    city:          Joi.string().trim().required(),
    state:         Joi.string().trim().required(),
    pincode:       Joi.string().trim().allow('', null),
    contact_phone: Joi.string().trim().required(),
    contact_email: Joi.string().email().allow('', null),
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });

  try {
    const { rows } = await pool.query(
      `INSERT INTO blood_banks (name, address, city, state, pincode, contact_phone, contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [value.name, value.address, value.city, value.state, value.pincode, value.contact_phone, value.contact_email],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/banks/:id ──────────────────────────────────────
router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM blood_banks WHERE bank_id = $1', [req.params.id]);
    if (!existing.length) return next(createError(404, 'Blood bank not found.'));

    const allowed = ['name','address','city','state','pincode','contact_phone','contact_email','is_active'];
    const fields  = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values     = [...fields.map((f) => req.body[f]), req.params.id];
    const { rows: updated } = await pool.query(
      `UPDATE blood_banks SET ${setClauses} WHERE bank_id = $${values.length} RETURNING *`,
      values,
    );
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
