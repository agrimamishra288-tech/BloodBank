const router = require('express').Router();
const Joi    = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');

const LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD) || 3;

// ── GET /api/inventory/summary ────────────────────────────────
// Stock per blood group across all banks, with low_stock flag
router.get('/summary', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         blood_group,
         SUM(units_available)::INT          AS total_units,
         MIN(earliest_expiry)               AS earliest_expiry,
         SUM(units_available) < $1          AS low_stock
       FROM vw_available_stock
       GROUP BY blood_group
       ORDER BY blood_group`,
      [LOW_STOCK],
    );

    // Fill in blood groups with zero stock
    const ALL = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
    const map  = Object.fromEntries(rows.map((r) => [r.blood_group, r]));
    const full = ALL.map((bg) => map[bg] || {
      blood_group: bg, total_units: 0, earliest_expiry: null, low_stock: true,
    });

    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/expiring ───────────────────────────────
// Units expiring within N days (default 7)
router.get('/expiring', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const { rows } = await pool.query(
      `SELECT unit_id, blood_group, collection_date, expiry_date,
              days_until_expiry, bank_name, bank_city, bank_contact
       FROM vw_expiring_soon
       WHERE days_until_expiry <= $1
       ORDER BY days_until_expiry`,
      [days],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory ────────────────────────────────────────
// Full list with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { blood_group, status, bank_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    const conds  = [];

    if (blood_group) { params.push(blood_group);    conds.push(`i.blood_group = $${params.length}`); }
    if (status)      { params.push(status);          conds.push(`i.status = $${params.length}`); }
    if (bank_id)     { params.push(Number(bank_id)); conds.push(`i.bank_id = $${params.length}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(Number(limit), offset);

    const { rows } = await pool.query(
      `SELECT i.*, b.name AS bank_name, b.city AS bank_city
       FROM inventory i
       JOIN blood_banks b ON b.bank_id = i.bank_id
       ${where}
       ORDER BY i.expiry_date ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/:id ────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, b.name AS bank_name, b.city AS bank_city, b.contact_phone
       FROM inventory i JOIN blood_banks b ON b.bank_id = i.bank_id
       WHERE i.unit_id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw createError(404, 'Unit not found.');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/inventory ───────────────────────────────────────
// Admin or hospital staff manually add a unit
router.post('/', authenticate, authorize('admin', 'hospital'), async (req, res, next) => {
  const schema = Joi.object({
    bank_id:         Joi.number().integer().required(),
    blood_group:     Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').required(),
    collection_date: Joi.date().iso().default(() => new Date()),
    volume_ml:       Joi.number().integer().min(300).max(550).default(450),
    donation_id:     Joi.number().integer().allow(null),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });

  try {
    // expiry_date is auto-set by trg_inventory_expiry trigger
    const { rows } = await pool.query(
      `INSERT INTO inventory (bank_id, blood_group, collection_date, donation_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [value.bank_id, value.blood_group, value.collection_date, value.donation_id || null],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/inventory/:id/status ──────────────────────────
// Admin only — update a unit's status
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('available','issued','expired','discarded').required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });

  try {
    const { rows } = await pool.query(
      `UPDATE inventory SET status = $1 WHERE unit_id = $2 RETURNING *`,
      [value.status, req.params.id],
    );
    if (!rows.length) throw createError(404, 'Unit not found.');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
