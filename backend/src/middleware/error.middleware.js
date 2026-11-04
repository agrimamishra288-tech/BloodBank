/**
 * Global error handling middleware.
 * Must be registered LAST in Express (after all routes).
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    if (err.stack) console.error(err.stack);
  }

  // ── Joi Validation Error ──────────────────────────────────
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.details ? err.details.map((d) => d.message) : [err.message],
    });
  }

  // ── JWT Errors ───────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
  }

  // ── PostgreSQL Errors ────────────────────────────────────
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          message: 'A record with this value already exists.',
          detail: err.detail || undefined,
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          message: 'Referenced record does not exist.',
          detail: err.detail || undefined,
        });
      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          message: 'Value violates a database constraint.',
          detail: err.detail || undefined,
        });
      case '23502': // not_null_violation
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${err.column || 'unknown'}.`,
        });
      default:
        break;
    }
  }

  // ── Custom application errors (thrown with err.status) ───
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // ── Fallback: 500 Internal Server Error ──────────────────
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

/**
 * Helper: create a simple HTTP error with a status code
 * Usage: throw createError(404, 'Donor not found')
 */
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };
