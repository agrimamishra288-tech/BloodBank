const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Joi     = require('joi');
const { pool }         = require('../db/pool');
const { authenticate } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');
const { BLOOD_GROUPS } = require('../middleware/validate.middleware');

// ── Joi schemas ───────────────────────────────────────────────
const registerSchema = Joi.object({
  name:        Joi.string().trim().min(2).max(100).required(),
  email:       Joi.string().email().lowercase().required(),
  password:    Joi.string().min(6).required(),
  role:        Joi.string().valid('donor', 'hospital', 'admin').default('donor'),
  phone:       Joi.string().trim().max(20).allow('', null),
  // donor-only fields
  blood_group: Joi.when('role', {
    is:        'donor',
    then:      Joi.string().valid(...BLOOD_GROUPS).required(),
    otherwise: Joi.string().valid(...BLOOD_GROUPS).allow(null),
  }),
  age:         Joi.when('role', { is: 'donor', then: Joi.number().integer().min(18).max(65).required(), otherwise: Joi.any() }),
  gender:      Joi.when('role', { is: 'donor', then: Joi.string().valid('M', 'F', 'O').required(), otherwise: Joi.any() }),
  city:        Joi.when('role', { is: 'donor', then: Joi.string().trim().required(), otherwise: Joi.string().trim().allow('', null) }),
  state:       Joi.when('role', { is: 'donor', then: Joi.string().trim().required(), otherwise: Joi.string().trim().allow('', null) }),
  address:     Joi.string().trim().allow('', null),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

function signToken(user) {
  return jwt.sign(
    { id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res, next) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map((d) => d.message),
    });
  }

  const { name, email, password, role, phone, blood_group, age, gender, city, state, address } = value;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);

    // Insert user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, role, phone, created_at`,
      [name, email, hash, role, phone || null],
    );
    const user = userResult.rows[0];

    // Insert donor profile if role is 'donor'
    let donor = null;
    if (role === 'donor') {
      const donorResult = await client.query(
        `INSERT INTO donors (user_id, blood_group, age, gender, city, state, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [user.user_id, blood_group, age, gender, city, state, address || null],
      );
      donor = donorResult.rows[0];
    }

    await client.query('COMMIT');

    const token = signToken(user);
    res.status(201).json({ success: true, token, user: { ...user, donor } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  error.details.map((d) => d.message),
    });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, name, email, password_hash, role, phone, is_active
       FROM users WHERE email = $1`,
      [value.email],
    );

    const user = result.rows[0];
    if (!user) throw createError(401, 'Invalid email or password.');
    if (!user.is_active) throw createError(401, 'Account is deactivated. Contact admin.');

    const match = await bcrypt.compare(value.password, user.password_hash);
    if (!match) throw createError(401, 'Invalid email or password.');

    delete user.password_hash;
    const token = signToken(user);
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `SELECT user_id, name, email, role, phone, is_active, created_at
       FROM users WHERE user_id = $1`,
      [req.user.id],
    );
    if (!userResult.rows.length) throw createError(404, 'User not found.');

    const user = userResult.rows[0];

    // Attach donor profile if applicable
    if (user.role === 'donor') {
      const donorResult = await pool.query(
        `SELECT * FROM donors WHERE user_id = $1`,
        [user.user_id],
      );
      user.donor = donorResult.rows[0] || null;
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
