require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { testConnection, expireStaleInventory } = require('./db/pool');

const authRoutes      = require('./routes/auth.routes');
const donorRoutes     = require('./routes/donors.routes');
const bankRoutes      = require('./routes/banks.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const donationRoutes  = require('./routes/donations.routes');
const requestRoutes   = require('./routes/requests.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const { errorHandler } = require('./middleware/error.middleware');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/donors',    donorRoutes);
app.use('/api/banks',     bankRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' }),
);

// Global error handler
app.use(errorHandler);

async function start() {
  try {
    await testConnection();
    const expiredAtStartup = await expireStaleInventory();
    if (expiredAtStartup) console.log(`Marked ${expiredAtStartup} expired inventory unit(s).`);
    const expirySweep = setInterval(() => {
      expireStaleInventory().catch((error) => console.error('Inventory expiry check failed:', error.message));
    }, 60 * 60 * 1000);
    expirySweep.unref();
    app.listen(PORT, () => {
      console.log(`🚀 Server → http://localhost:${PORT}`);
      console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch {
    console.error('❌ Cannot connect to database. Check DATABASE_URL in .env');
    process.exit(1);
  }
}

start();
