const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const worldBank = require('../services/worldbank');

const SOURCE_NAME = 'World Bank, World Development Indicators (api.worldbank.org), CC BY 4.0';

// Health-system context for blood demand and donor supply in India.
const DEFAULT_INDICATORS = [
  'SP.POP.TOTL',        // Population, total
  'SH.MED.BEDS.ZS',     // Hospital beds (per 1,000 people)
  'SH.MED.PHYS.ZS',     // Physicians (per 1,000 people)
  'SH.MED.NUMW.P3',     // Nurses and midwives (per 1,000 people)
  'SH.XPD.CHEX.GD.ZS',  // Current health expenditure (% of GDP)
  'SH.XPD.CHEX.PC.CD',  // Current health expenditure per capita (current US$)
  'SH.XPD.OOPC.CH.ZS',  // Out-of-pocket expenditure (% of current health expenditure)
  'SH.ANM.ALLW.ZS',     // Prevalence of anemia among women of reproductive age (%)
  'SH.ANM.CHLD.ZS',     // Prevalence of anemia among children (% of children ages 6-59 months)
  'SH.STA.MMRT',        // Maternal mortality ratio (per 100,000 live births)
  'SH.STA.TRAF.P5',     // Mortality caused by road traffic injury (per 100,000 population)
];

function listSetting(value, fallback) {
  const items = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  return items.length ? items : fallback;
}

function settings() {
  return {
    countries: listSetting(process.env.WORLD_BANK_COUNTRIES, ['IND']).map((code) => code.toUpperCase()),
    indicators: listSetting(process.env.WORLD_BANK_INDICATORS, DEFAULT_INDICATORS),
  };
}

async function fetchAll() {
  const { countries, indicators } = settings();
  const results = [];
  const failures = [];
  for (const country of countries) {
    for (const indicator of indicators) {
      try {
        results.push({ country, ...(await worldBank.fetchIndicator(country, indicator)) });
      } catch (error) {
        failures.push({ country, indicator, error: error.message });
      }
    }
  }
  return { results, failures };
}

// Each indicator is replaced in its own transaction, so a failed fetch leaves its stored rows untouched.
async function importResults(results) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let imported = 0;
  try {
    for (const result of results) {
      if (!result.observations.length) continue;
      const sourceUrl = `https://data.worldbank.org/indicator/${result.indicatorCode}?locations=${result.countryIso2}`;
      await client.query('BEGIN');
      try {
        await client.query(
          'DELETE FROM world_bank_indicators WHERE indicator_code = $1 AND country_code = $2',
          [result.indicatorCode, result.country],
        );
        for (const row of result.observations) {
          await client.query(
            `INSERT INTO world_bank_indicators
               (indicator_code, indicator_name, country_code, country_name, year, value,
                source_name, source_url, source_updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [row.indicatorCode, row.indicatorName, result.country, row.countryName, row.year, row.value,
              SOURCE_NAME, sourceUrl, result.lastUpdated],
          );
        }
        await client.query('COMMIT');
        imported += result.observations.length;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
  return imported;
}

function summary(results) {
  return results.map((result) => {
    const latest = result.observations.reduce((best, row) => (!best || row.year > best.year ? row : best), null);
    return {
      country: result.country,
      indicator: result.indicatorCode,
      name: result.indicatorName,
      years: result.observations.length,
      latest: latest ? { year: latest.year, value: latest.value } : null,
      source_updated_at: result.lastUpdated,
    };
  });
}

async function refreshWorldBankIndicators({ dryRun = false } = {}) {
  const { results, failures } = await fetchAll();
  if (!results.length) throw new Error(`World Bank sync failed for every indicator: ${failures[0]?.error}`);
  const imported = dryRun ? 0 : await importResults(results);
  return { imported_rows: imported, indicators: summary(results), failures };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in backend/.env');
  const dryRun = process.argv.includes('--dry-run');
  const report = await refreshWorldBankIndicators({ dryRun });
  console.log(JSON.stringify({ dry_run: dryRun, ...report }, null, 2));
  if (report.failures.length) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => {
  console.error(`World Bank import failed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { refreshWorldBankIndicators };
