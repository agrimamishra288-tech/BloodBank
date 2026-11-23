require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth.routes');
const donorRoutes     = require('./routes/donors.routes');
const bankRoutes      = require('./routes/banks.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const donationRoutes  = require('./routes/donations.routes');
const requestRoutes   = require('./routes/requests.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const referenceRoutes = require('./routes/reference.routes');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

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
app.use('/api/reference', referenceRoutes);

// 404
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' }),
);

// Global error handler
app.use(errorHandler);

// Vercel imports this file and calls the exported app directly.
// The long-running listener lives in src/start.js for local development.
module.exports = app;
