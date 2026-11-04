const router = require('express').Router();
const Joi    = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');

// ── POST /api/donations ───────────────────────────────────────
// Record a donation — calls sp_register_donation which:
//   1. Checks 90-day eligibility
//   2. Inserts into donations
//   3. Trigger: increments donor.total_donations + updates last_donation_date
//   4. Inserts one inventory unit (trigger auto-sets expiry = +42 days)
router.post('/', authenticate, authorize('admin', 'hospital', 'donor'), async (req, res, next) => {
  const schema = Joi.object({
    donor_id:  Joi.number().integer().required(),
    bank_id:   Joi.number().integer().required(),
    volume_ml: Joi.number().integer().min(300).max(550).default(450),
    notes:     Joi.string().trim().max(500).allow('', null),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map((d) => d.message),
    });
  }

  try {
    // If logged-in user is a donor, they can only record their own donation
    if (req.user.role === 'donor') {
      const { rows } = await pool.query(
        'SELECT donor_id FROM donors WHERE user_id = $1',
        [req.user.id],
      );
      if (!rows.length || rows[0].donor_id !== value.donor_id) {
        throw createError(403, 'Donors can only record their own donations.');
      }
    }

    // Call the stored function — raises EXCEPTION if not eligible or donor not found
    const result = await pool.query(
      `SELECT sp_register_donation($1, $2, $3, $4) AS donation_id`,
      [value.donor_id, value.bank_id, value.volume_ml, value.notes || null],
    );
    const donation_id = result.rows[0].donation_id;

    // Fetch the full donation record to return
    const { rows } = await pool.query(
      `SELECT dn.*, b.name AS bank_name, b.city AS bank_city
       FROM donations dn
       JOIN blood_banks b ON b.bank_id = dn.bank_id
       WHERE dn.donation_id = $1`,
      [donation_id],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Surface eligibility errors from the stored procedure as 400
    if (err.message && err.message.includes('not yet eligible')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// ── GET /api/donations ────────────────────────────────────────
// Admin/hospital see all; donor sees only their own
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let where = '';

    if (req.user.role === 'donor') {
      const { rows } = await pool.query(
        'SELECT donor_id FROM donors WHERE user_id = $1',
        [req.user.id],
      );
      if (rows.length) {
        params.push(rows[0].donor_id);
        where = `WHERE dn.donor_id = $${params.length}`;
      }
    }

    params.push(Number(limit), offset);
    const { rows } = await pool.query(
      `SELECT dn.*, u.name AS donor_name, d.blood_group, b.name AS bank_name, b.city AS bank_city
       FROM donations dn
       JOIN donors d ON d.donor_id = dn.donor_id
       JOIN users  u ON u.user_id  = d.user_id
       JOIN blood_banks b ON b.bank_id = dn.bank_id
       ${where}
       ORDER BY dn.donation_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
