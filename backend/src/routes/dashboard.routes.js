const router = require('express').Router();
const { pool } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD) || 3;

// ── GET /api/dashboard/stats ──────────────────────────────────
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM donors d JOIN users u ON u.user_id = d.user_id WHERE u.is_active = true)::INT AS total_donors,
        (SELECT COUNT(*) FROM vw_eligible_donors)::INT AS eligible_donors,
        (SELECT COUNT(*) FROM blood_banks WHERE is_active = true)::INT AS total_banks,
        (SELECT COALESCE(SUM(units_available),0) FROM vw_available_stock)::INT AS total_units_available,
        (SELECT COUNT(*) FROM vw_expiring_soon)::INT AS units_expiring_7days,
        (SELECT COUNT(*) FROM blood_requests WHERE status = 'pending')::INT AS pending_requests,
        (SELECT COUNT(*) FROM blood_requests WHERE status = 'pending' AND urgency = 'critical')::INT AS critical_requests,
        (SELECT COUNT(*) FROM blood_requests WHERE status = 'fulfilled' AND request_date::date = CURRENT_DATE)::INT AS fulfilled_today,
        (SELECT COUNT(*) FROM donations WHERE donation_date = CURRENT_DATE)::INT AS donations_today
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/stock ──────────────────────────────────
// Stock per blood group with per-bank breakdown
router.get('/stock', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT blood_group, bank_id, bank_name, bank_city, units_available, earliest_expiry
       FROM vw_available_stock ORDER BY blood_group, units_available DESC`,
    );

    // Group by blood_group
    const ALL = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
    const grouped = ALL.map((bg) => {
      const banks = rows.filter((r) => r.blood_group === bg);
      const total = banks.reduce((s, r) => s + Number(r.units_available), 0);
      return { blood_group: bg, total_units: total, low_stock: total < LOW_STOCK, banks };
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/reports/donation-trends ────────────────
router.get('/reports/donation-trends', authenticate, async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const { rows } = await pool.query(
      `SELECT
         gs.day::date     AS date,
         COALESCE(COUNT(d.donation_id), 0)::INT AS donations
       FROM generate_series(
         CURRENT_DATE - ($1 - 1) * INTERVAL '1 day',
         CURRENT_DATE, '1 day'
       ) AS gs(day)
       LEFT JOIN donations d ON d.donation_date = gs.day::date
       GROUP BY gs.day
       ORDER BY gs.day`,
      [days],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/reports/request-summary ────────────────
router.get('/reports/request-summary', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, urgency, COUNT(*)::INT AS count
       FROM blood_requests
       GROUP BY status, urgency
       ORDER BY status, urgency`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/reports/top-donors ─────────────────────
router.get('/reports/top-donors', authenticate, authorize('admin','hospital'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.donor_id, u.name, d.blood_group, d.city,
              d.total_donations, d.last_donation_date
       FROM donors d JOIN users u ON u.user_id = d.user_id
       ORDER BY d.total_donations DESC
       LIMIT 10`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
