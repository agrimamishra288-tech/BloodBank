require('dotenv').config();
const app = require('./app');
const { testConnection, expireStaleInventory } = require('./db/pool');
const { refreshPublicDirectory } = require('./db/import-public-directory');
const { refreshWorldBankIndicators } = require('./db/import-world-bank');

const PORT = process.env.PORT || 5000;

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
    const refreshDirectory = () => Promise.all([
      refreshPublicDirectory().catch((error) => {
        console.error('Public directory refresh skipped:', error.message);
      }),
      refreshWorldBankIndicators().catch((error) => {
        console.error('World Bank indicators refresh skipped:', error.message);
      }),
    ]);
    refreshDirectory();
    const refreshHours = Math.max(1, Number(process.env.PUBLIC_DIRECTORY_REFRESH_HOURS) || 24);
    const directoryRefresh = setInterval(refreshDirectory, refreshHours * 60 * 60 * 1000);
    directoryRefresh.unref();
  } catch {
    console.error('❌ Cannot connect to database. Check DATABASE_URL in .env');
    process.exit(1);
  }
}

start();
