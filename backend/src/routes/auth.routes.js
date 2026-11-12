const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Joi     = require('joi');
const { OAuth2Client } = require('google-auth-library');
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth: getFirebaseAuth } = require('firebase-admin/auth');
const { pool }         = require('../db/pool');
const { authenticate } = require('../middleware/auth.middleware');
const { createError }  = require('../middleware/error.middleware');
const { BLOOD_GROUPS } = require('../middleware/validate.middleware');
const crypto = require('node:crypto');
const googleClient = new OAuth2Client();
const usedMfaChallenges = new Set();
const mfaAttempts = new Map();

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
  email:    Joi.string().email().lowercase(),
  phone:    Joi.string().trim().pattern(/^\+?[\d\s().-]{7,20}$/),
  password: Joi.string().required(),
}).xor('email', 'phone');

const googleSchema = Joi.object({ credential: Joi.string().required() });
const firebaseSchema = Joi.object({ idToken: Joi.string().required() });
const mfaSchema = Joi.object({ challengeToken: Joi.string().required(), code: Joi.string().pattern(/^\d{6}$/).required() });

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function encodeBase32(buffer) {
  let bits = 0; let value = 0; let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}
function decodeBase32(text) {
  let bits = 0; let value = 0; const bytes = [];
  for (const char of text.toUpperCase().replace(/=+$/g, '')) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Invalid authenticator secret');
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}
function totp(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}
function verifyTotp(secret, code) {
  const now = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(totp(secret, now + window));
    const actual = Buffer.from(code);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  });
}
function encryptSecret(secret) {
  const key = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}
function decryptSecret(value) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const key = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
function beginMfa(user) {
  const setupRequired = !user.mfa_enabled || !user.mfa_secret;
  const setupSecret = setupRequired ? encodeBase32(crypto.randomBytes(20)) : undefined;
  const challengeToken = jwt.sign(
    { id: user.user_id, purpose: 'mfa', setupRequired, ...(setupSecret ? { setupSecret } : {}) },
    process.env.JWT_SECRET,
    { expiresIn: '10m', jwtid: crypto.randomUUID() },
  );
  return {
    success: true,
    mfaRequired: true,
    setupRequired,
    challengeToken,
    ...(setupSecret ? {
      setupSecret,
      otpauthUri: `otpauth://totp/${encodeURIComponent(`Hemora:${user.email}`)}?secret=${setupSecret}&issuer=Hemora&algorithm=SHA1&digits=6&period=30`,
    } : {}),
  };
}

function firebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw createError(503, 'Firebase sign-in is not configured on this server yet.');
  const appName = 'hemora-firebase-auth';
  const app = getApps().find((entry) => entry.name === appName)
    || initializeApp({ credential: applicationDefault(), projectId }, appName);
  return getFirebaseAuth(app);
}

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

    res.status(201).json(beginMfa({ ...user, mfa_enabled: false, mfa_secret: null }));
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
    const result = value.phone
      ? await pool.query(
          `SELECT user_id, name, email, password_hash, role, phone, is_active, mfa_enabled, mfa_secret
           FROM users
           WHERE regexp_replace(phone, '[^0-9]', '', 'g') = $1
           ORDER BY user_id
           LIMIT 2`,
          [value.phone.replace(/\D/g, '')],
        )
      : await pool.query(
          `SELECT user_id, name, email, password_hash, role, phone, is_active, mfa_enabled, mfa_secret
           FROM users WHERE email = $1`,
          [value.email],
        );

    const user = result.rows[0];
    if (!user || result.rows.length > 1) throw createError(401, 'Invalid email or password.');
    if (!user.is_active) throw createError(401, 'Account is deactivated. Contact admin.');

    const match = await bcrypt.compare(value.password, user.password_hash);
    if (!match) throw createError(401, 'Invalid email or password.');

    delete user.password_hash;
    res.json(beginMfa(user));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/google ────────────────────────────────────
// Google Identity Services returns a signed ID token. Verify it here before
// creating a Hemora session; never trust profile details sent by the browser.
router.post('/google', async (req, res, next) => {
  const { error, value } = googleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, message: 'A Google credential is required.' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('your_google_web_client_id')) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured for this app yet.' });
  }

  let claims;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: value.credential, audience: clientId });
    claims = ticket.getPayload();
  } catch {
    return res.status(401).json({ success: false, message: 'Google could not verify this sign-in. Please try again.' });
  }
  if (!claims?.email || claims.email_verified !== true) {
    return res.status(401).json({ success: false, message: 'Google could not verify this email address.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, name, email, role, phone, is_active, mfa_enabled, mfa_secret
       FROM users WHERE email = $1`,
      [claims.email.toLowerCase()],
    );
    const user = rows[0];
    if (!user) throw createError(401, 'No Hemora account uses this Google email yet. Create an account first.');
    if (!user.is_active) throw createError(401, 'Account is deactivated. Contact admin.');

    res.json(beginMfa(user));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/firebase ──────────────────────────────────
// Firebase verifies the Google popup client-side; this endpoint verifies the
// Firebase ID token with Admin SDK before linking an existing Hemora account.
router.post('/firebase', async (req, res, next) => {
  const { error, value } = firebaseSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ success: false, message: 'A Firebase ID token is required.' });

  let auth;
  try {
    auth = firebaseAuth();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(503).json({ success: false, message: 'Firebase Admin credentials are missing or invalid on this server.' });
  }

  let claims;
  try {
    claims = await auth.verifyIdToken(value.idToken, true);
  } catch {
    return res.status(401).json({ success: false, message: 'Firebase could not verify this sign-in. Check the Firebase project settings and try again.' });
  }
  if (claims.firebase?.sign_in_provider !== 'google.com' || !claims.email || claims.email_verified !== true) {
    return res.status(401).json({ success: false, message: 'Use a verified Google account to continue.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, name, email, role, phone, is_active, mfa_enabled, mfa_secret, firebase_uid
       FROM users WHERE firebase_uid = $1 OR email = $2
       ORDER BY (firebase_uid = $1) DESC
       LIMIT 2`,
      [claims.uid, claims.email.toLowerCase()],
    );
    const user = rows[0];
    if (!user || rows.length > 1) throw createError(401, 'No unique Hemora account uses this Google email. Create your Hemora account first.');
    if (!user.is_active) throw createError(401, 'Account is deactivated. Contact admin.');
    if (user.firebase_uid && user.firebase_uid !== claims.uid) {
      throw createError(409, 'This Hemora account is linked to a different Firebase identity. Contact admin.');
    }
    if (!user.firebase_uid) {
      const linked = await pool.query(
        'UPDATE users SET firebase_uid = $1 WHERE user_id = $2 AND firebase_uid IS NULL RETURNING user_id',
        [claims.uid, user.user_id],
      );
      if (!linked.rowCount) throw createError(409, 'This Hemora account was linked during another sign-in. Please try again.');
    }
    delete user.firebase_uid;
    res.json(beginMfa(user));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/mfa/verify ─────────────────────────────────
// First successful password/Google sign-in enrolls an authenticator app.
router.post('/mfa/verify', async (req, res, next) => {
  const { error, value } = mfaSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: 'Enter the six-digit authenticator code.' });

  let challenge;
  try {
    challenge = jwt.verify(value.challengeToken, process.env.JWT_SECRET);
    if (challenge.purpose !== 'mfa' || !challenge.id) throw new Error('Invalid MFA challenge');
  } catch {
    return res.status(401).json({ success: false, message: 'This verification has expired. Sign in again.' });
  }
  if (usedMfaChallenges.has(challenge.jti)) {
    return res.status(401).json({ success: false, message: 'This verification was already used. Sign in again.' });
  }
  if ((mfaAttempts.get(challenge.jti) || 0) >= 5) {
    return res.status(429).json({ success: false, message: 'Too many incorrect codes. Sign in again to retry.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_id, name, email, role, phone, is_active, mfa_enabled, mfa_secret FROM users WHERE user_id = $1',
      [challenge.id],
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ success: false, message: 'This account is unavailable. Sign in again.' });

    if (challenge.setupRequired) {
      if (!challenge.setupSecret || !verifyTotp(challenge.setupSecret, value.code)) {
        mfaAttempts.set(challenge.jti, (mfaAttempts.get(challenge.jti) || 0) + 1);
        return res.status(401).json({ success: false, message: 'That code did not match. Check your authenticator app and try again.' });
      }
      await pool.query('UPDATE users SET mfa_secret = $1, mfa_enabled = TRUE WHERE user_id = $2', [encryptSecret(challenge.setupSecret), user.user_id]);
    } else {
      if (!user.mfa_enabled || !user.mfa_secret || !verifyTotp(decryptSecret(user.mfa_secret), value.code)) {
        mfaAttempts.set(challenge.jti, (mfaAttempts.get(challenge.jti) || 0) + 1);
        return res.status(401).json({ success: false, message: 'That code did not match. Check your authenticator app and try again.' });
      }
    }

    usedMfaChallenges.add(challenge.jti);
    mfaAttempts.delete(challenge.jti);
    delete user.mfa_secret;
    delete user.mfa_enabled;
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
