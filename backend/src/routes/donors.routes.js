const router  = require('express').Router();
const Joi     = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');
const { BLOOD_GROUPS } = require('../middleware/validate.middleware');

// ── Joi schemas ───────────────────────────────────────────────
const updateSchema = Joi.object({
  city:         Joi.string().trim(),
  state:        Joi.string().trim(),
  address:      Joi.string().trim().allow('', null),
  is_available: Joi.boolean(),
  age:          Joi.number().integer().min(18).max(65),
  gender:       Joi.string().valid('M', 'F', 'O'),
});

// ── GET /api/donors ───────────────────────────────────────────
// Filters: blood_group, city, eligible=true/false, page, limit
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { blood_group, city, eligible, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build dynamic WHERE clauses
    const conditions = [];
    const params     = [];

    if (blood_group) {
      params.push(blood_group);
      conditions.push(`d.blood_group = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      conditions.push(`d.city ILIKE $${params.length}`);
    }
    if (eligible === 'true') {
      conditions.push(`(d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')`);
    }
    if (eligible === 'false') {
      conditions.push(`(d.last_donation_date IS NOT NULL AND d.last_donation_date > CURRENT_DATE - INTERVAL '90 days')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Number(limit));
    params.push(offset);

    const canViewDonorIdentity = ['admin', 'hospital'].includes(req.user.role);
    const { rows } = await pool.query(
      `SELECT
         d.donor_id, d.blood_group,
         CASE WHEN ${canViewDonorIdentity} THEN d.age ELSE NULL END AS age,
         CASE WHEN ${canViewDonorIdentity} THEN d.gender ELSE NULL END AS gender,
         d.city, d.state,
         CASE WHEN ${canViewDonorIdentity} THEN d.last_donation_date ELSE NULL END AS last_donation_date,
         CASE WHEN ${canViewDonorIdentity} THEN d.total_donations ELSE NULL END AS total_donations,
         d.is_available,
         CASE WHEN ${canViewDonorIdentity} THEN u.name ELSE 'Donor #' || d.donor_id::TEXT END AS name,
         CASE WHEN ${canViewDonorIdentity} THEN u.email ELSE NULL END AS email,
         CASE WHEN ${canViewDonorIdentity} THEN u.phone ELSE NULL END AS phone,
         u.is_active,
         CASE WHEN ${canViewDonorIdentity} THEN
           (d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')
         ELSE NULL END AS eligible
       FROM donors d
       JOIN users u ON u.user_id = d.user_id
       ${where}
       ORDER BY u.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // Total count for pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM donors d JOIN users u ON u.user_id = d.user_id ${where}`,
      params.slice(0, params.length - 2),
    );

    res.json({
      success: true,
      total: Number(countRes.rows[0].count),
      page:  Number(page),
      limit: Number(limit),
      data:  rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/donors/:id ───────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const canViewDonorIdentity = ['admin', 'hospital'].includes(req.user.role);
    const { rows } = await pool.query(
      `SELECT d.donor_id, d.user_id, d.blood_group,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN d.age ELSE NULL END AS age,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN d.gender ELSE NULL END AS gender,
              d.city, d.state,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN d.last_donation_date ELSE NULL END AS last_donation_date,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN d.total_donations ELSE NULL END AS total_donations,
              d.is_available,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN u.name ELSE 'Donor #' || d.donor_id::TEXT END AS name,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN u.email ELSE NULL END AS email,
              CASE WHEN ${canViewDonorIdentity} OR d.user_id = $2 THEN u.phone ELSE NULL END AS phone,
              u.is_active
       FROM donors d JOIN users u ON u.user_id = d.user_id
       WHERE d.donor_id = $1`,
      [req.params.id, req.user.id],
    );
    if (!rows.length) throw createError(404, 'Donor not found.');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/donors/:id ───────────────────────────────────────
// Donor themselves OR admin can update
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    // Load donor to check ownership
    const { rows: existing } = await pool.query(
      'SELECT user_id FROM donors WHERE donor_id = $1',
      [req.params.id],
    );
    if (!existing.length) throw createError(404, 'Donor not found.');

    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.id) {
      throw createError(403, 'You can only update your own profile.');
    }

    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map((d) => d.message) });
    }

    const fields = Object.keys(value);
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update.' });

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values     = [...Object.values(value), req.params.id];

    const { rows } = await pool.query(
      `UPDATE donors SET ${setClauses} WHERE donor_id = $${values.length} RETURNING *`,
      values,
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/donors/:id ────────────────────────────────────
// Admin only — soft delete (deactivates user account)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users u
       SET is_active = false
       FROM donors d
       WHERE d.donor_id = $1 AND u.user_id = d.user_id
       RETURNING d.donor_id`,
      [req.params.id],
    );
    if (!rows.length) throw createError(404, 'Donor not found.');
    res.json({ success: true, message: 'Donor deactivated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/donors/:id/donations ────────────────────────────
router.get('/:id/donations', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'donor') {
      const { rows: owner } = await pool.query(
        'SELECT 1 FROM donors WHERE donor_id = $1 AND user_id = $2',
        [req.params.id, req.user.id],
      );
      if (!owner.length) throw createError(403, 'You can only view your own donation history.');
    } else if (!['admin', 'hospital'].includes(req.user.role)) {
      throw createError(403, 'You do not have access to donation history.');
    }
    const { rows } = await pool.query(
      `SELECT dn.*, b.name AS bank_name, b.city AS bank_city
       FROM donations dn
       JOIN blood_banks b ON b.bank_id = dn.bank_id
       WHERE dn.donor_id = $1
       ORDER BY dn.donation_date DESC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
