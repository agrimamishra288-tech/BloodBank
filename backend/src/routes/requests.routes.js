const router = require('express').Router();
const Joi    = require('joi');
const { pool }         = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');
const { BLOOD_GROUPS } = require('../middleware/validate.middleware');

// Blood-group → which groups can donate to it (for the UI compatibility note)
const COMPAT_NOTE = {
  'A+':  'A+, A-, O+, O-', 'A-':  'A-, O-',
  'B+':  'B+, B-, O+, O-', 'B-':  'B-, O-',
  'AB+': 'All groups (universal recipient)', 'AB-': 'AB-, A-, B-, O-',
  'O+':  'O+, O-',          'O-':  'O- only (universal donor)',
};

// ── GET /api/requests ─────────────────────────────────────────
// All requests sorted by urgency (critical → urgent → normal), then date
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, urgency, blood_group, city, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    const conds  = [];

    if (status)      { params.push(status);      conds.push(`r.status = $${params.length}`); }
    if (urgency)     { params.push(urgency);     conds.push(`r.urgency = $${params.length}`); }
    if (blood_group) { params.push(blood_group); conds.push(`r.blood_group = $${params.length}`); }
    if (city)        { params.push(`%${city}%`); conds.push(`r.city ILIKE $${params.length}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(Number(limit), offset);
    const canViewPatientDetails = ['admin', 'hospital'].includes(req.user.role);

    const { rows } = await pool.query(
      `SELECT
         r.request_id, r.requested_by, r.blood_group, r.units_needed,
         r.units_fulfilled, r.city, r.urgency, r.status, r.request_date,
         r.updated_at,
         CASE WHEN ${canViewPatientDetails} THEN r.notes ELSE NULL END AS notes,
         CASE WHEN ${canViewPatientDetails} THEN p.name ELSE 'Patient request' END AS patient_name,
         p.hospital_name,
         p.hospital_city,
         CASE WHEN ${canViewPatientDetails} THEN p.contact_phone ELSE NULL END AS patient_contact,
         CASE WHEN ${canViewPatientDetails} THEN p.gender ELSE NULL END AS patient_gender,
         CASE WHEN ${canViewPatientDetails} THEN p.age ELSE NULL END AS patient_age,
         CASE WHEN ${canViewPatientDetails} THEN u.name ELSE 'Hospital team' END AS requested_by_name
       FROM blood_requests r
       JOIN patients p ON p.patient_id = r.patient_id
       JOIN users    u ON u.user_id    = r.requested_by
       ${where}
       ORDER BY
         CASE r.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         r.request_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/requests ────────────────────────────────────────
// Creates patient + blood request in one transaction
router.post('/', authenticate, async (req, res, next) => {
  const schema = Joi.object({
    patient_name:    Joi.string().trim().required(),
    patient_age:     Joi.number().integer().min(0).allow(null),
    patient_gender:  Joi.string().valid('M','F','O').allow(null),
    patient_blood_group: Joi.string().valid(...BLOOD_GROUPS).required(),
    hospital_name:   Joi.string().trim().required(),
    hospital_city:   Joi.string().trim().required(),
    hospital_state:  Joi.string().trim().required(),
    contact_phone:   Joi.string().trim().allow('', null),
    blood_group:     Joi.string().valid(...BLOOD_GROUPS).required(),
    units_needed:    Joi.number().integer().min(1).required(),
    urgency:         Joi.string().valid('normal','urgent','critical').default('normal'),
    notes:           Joi.string().trim().max(500).allow('', null),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert patient
    const pResult = await client.query(
      `INSERT INTO patients (name, age, gender, blood_group, hospital_name, hospital_city, hospital_state, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [value.patient_name, value.patient_age, value.patient_gender, value.patient_blood_group,
       value.hospital_name, value.hospital_city, value.hospital_state, value.contact_phone],
    );

    // 2. Insert blood request
    const rResult = await client.query(
      `INSERT INTO blood_requests (patient_id, requested_by, blood_group, units_needed, city, urgency, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [pResult.rows[0].patient_id, req.user.id, value.blood_group,
       value.units_needed, value.hospital_city, value.urgency, value.notes || null],
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data:    { ...rResult.rows[0], patient: pResult.rows[0] },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/requests/:id ─────────────────────────────────────
router.get('/:id', authenticate, authorize('admin','hospital'), async (req, res, next) => {
  try {
    const { rows: req_rows } = await pool.query(
      `SELECT r.*, p.name AS patient_name, p.hospital_name, p.hospital_city,
              p.contact_phone AS patient_contact, p.age AS patient_age, p.gender AS patient_gender,
              p.blood_group AS patient_blood_group, u.name AS requested_by_name
       FROM blood_requests r
       JOIN patients p ON p.patient_id = r.patient_id
       JOIN users    u ON u.user_id    = r.requested_by
       WHERE r.request_id = $1`,
      [req.params.id],
    );
    if (!req_rows.length) throw createError(404, 'Request not found.');

    // Fetch matched donors
    const { rows: matches } = await pool.query(
      `SELECT rdm.*, u.name AS donor_name, d.blood_group, d.city, u.phone
       FROM request_donor_matches rdm
       JOIN donors d ON d.donor_id = rdm.donor_id
       JOIN users  u ON u.user_id  = d.user_id
       WHERE rdm.request_id = $1`,
      [req.params.id],
    );

    res.json({ success: true, data: { ...req_rows[0], matches } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/requests/:id/match ───────────────────────────────
// CORE FEATURE — calls fn_find_matching_donors and fn_find_matching_units
router.get('/:id/match', authenticate, authorize('admin','hospital'), async (req, res, next) => {
  try {
    const { rows: reqRows } = await pool.query(
      `SELECT r.blood_group, r.city, r.units_needed, r.status, r.request_id,
              p.name AS patient_name, p.hospital_name
       FROM blood_requests r JOIN patients p ON p.patient_id = r.patient_id
       WHERE r.request_id = $1`,
      [req.params.id],
    );
    if (!reqRows.length) throw createError(404, 'Request not found.');
    const request = reqRows[0];

    // Run both matching functions in parallel
    const [donorRes, unitRes] = await Promise.all([
      pool.query(`SELECT * FROM fn_find_matching_donors($1, $2)`, [request.blood_group, request.city]),
      pool.query(`SELECT * FROM fn_find_matching_units($1)`,      [request.blood_group]),
    ]);

    // Auto-insert notified matches for top donors (upsert, ignore conflicts)
    const topDonors = donorRes.rows.slice(0, Math.min(request.units_needed * 2, 10));
    for (const d of topDonors) {
      await pool.query(
        `INSERT INTO request_donor_matches (request_id, donor_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [request.request_id, d.donor_id],
      );
    }

    // Update request status to 'matched' if still pending
    if (request.status === 'pending' && topDonors.length > 0) {
      await pool.query(
        `UPDATE blood_requests SET status = 'matched' WHERE request_id = $1 AND status = 'pending'`,
        [request.request_id],
      );
    }

    res.json({
      success: true,
      data: {
        request,
        matching_donors:     donorRes.rows,
        available_units:     unitRes.rows,
        matched_donor_count: topDonors.length,
        compatibility_note:  `Blood group ${request.blood_group} can receive from: ${COMPAT_NOTE[request.blood_group] || '—'}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/requests/:id/notify/:donor_id ───────────────────
// Admin or hospital staff manually notify a donor
router.post('/:id/notify/:donor_id', authenticate, authorize('admin','hospital'), async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO request_donor_matches (request_id, donor_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.donor_id],
    );
    await pool.query(
      `UPDATE blood_requests SET status = 'matched' WHERE request_id = $1 AND status = 'pending'`,
      [req.params.id],
    );
    res.json({ success: true, message: 'Match recorded. External donor notification is not configured.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/requests/:id/fulfill ───────────────────────────
// Admin only — calls sp_fulfill_request stored procedure
router.post('/:id/fulfill', authenticate, authorize('admin'), async (req, res, next) => {
  const schema = Joi.object({
    unit_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });

  try {
    // sp_fulfill_request is a PROCEDURE — use CALL
    await pool.query(`CALL sp_fulfill_request($1, $2)`, [Number(req.params.id), value.unit_ids]);

    const { rows } = await pool.query(
      `SELECT r.*, p.name AS patient_name FROM blood_requests r
       JOIN patients p ON p.patient_id = r.patient_id
       WHERE r.request_id = $1`,
      [req.params.id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.message && (err.message.includes('No valid') || err.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// ── PATCH /api/requests/:id/status ───────────────────────────
router.patch('/:id/status', authenticate, authorize('admin','hospital'), async (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending','matched','partially_fulfilled','fulfilled','cancelled').required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, errors: error.details.map((d) => d.message) });

  try {
    const { rows } = await pool.query(
      `UPDATE blood_requests SET status = $1 WHERE request_id = $2 RETURNING *`,
      [value.status, req.params.id],
    );
    if (!rows.length) throw createError(404, 'Request not found.');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
