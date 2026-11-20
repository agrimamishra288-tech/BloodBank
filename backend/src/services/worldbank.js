// Read-only client for the World Bank Indicators API (no key required).
// Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
const API_BASE = 'https://api.worldbank.org/v2';
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

async function fetchPage(countryCode, indicatorCode, page) {
  const url = new URL(`${API_BASE}/country/${encodeURIComponent(countryCode)}/indicator/${encodeURIComponent(indicatorCode)}`);
  url.search = new URLSearchParams({ format: 'json', per_page: String(PAGE_SIZE), page: String(page) });

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`World Bank API returned HTTP ${response.status} for ${indicatorCode}.`);
      const body = await response.json();
      // Errors come back as [{ message: [{ id, key, value }] }] with HTTP 200.
      if (!Array.isArray(body) || body[0]?.message) {
        const detail = body?.[0]?.message?.[0]?.value || 'unexpected response';
        throw Object.assign(new Error(`World Bank API error for ${indicatorCode}: ${detail}`), { fatal: true });
      }
      return { meta: body[0], rows: Array.isArray(body[1]) ? body[1] : [] };
    } catch (error) {
      if (error.fatal) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

// Returns every yearly observation of one indicator for one country, skipping empty years.
async function fetchIndicator(countryCode, indicatorCode) {
  const first = await fetchPage(countryCode, indicatorCode, 1);
  const rows = [...first.rows];
  const pages = Math.min(Number(first.meta.pages) || 1, MAX_PAGES);
  for (let page = 2; page <= pages; page += 1) {
    rows.push(...(await fetchPage(countryCode, indicatorCode, page)).rows);
  }

  const observations = rows
    .filter((row) => row.value !== null && row.value !== undefined && /^\d{4}$/.test(String(row.date)))
    .map((row) => ({
      indicatorCode: row.indicator?.id || indicatorCode,
      indicatorName: row.indicator?.value || indicatorCode,
      countryCode: row.countryiso3code || countryCode,
      countryName: row.country?.value || countryCode,
      countryIso2: row.country?.id || countryCode,
      year: Number(row.date),
      value: Number(row.value),
    }))
    .filter((row) => Number.isFinite(row.value));

  return {
    indicatorCode,
    indicatorName: observations[0]?.indicatorName || rows[0]?.indicator?.value || indicatorCode,
    countryIso2: observations[0]?.countryIso2 || countryCode,
    lastUpdated: /^\d{4}-\d{2}-\d{2}$/.test(first.meta.lastupdated || '') ? first.meta.lastupdated : null,
    observations,
  };
}

module.exports = { fetchIndicator };
