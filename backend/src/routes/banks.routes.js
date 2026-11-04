const router = require('express').Router();
const Joi    = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');

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
