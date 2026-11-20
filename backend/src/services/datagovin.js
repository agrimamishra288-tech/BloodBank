// Read-only client for the data.gov.in Open Government Data (OGD) API.
// Docs: https://data.gov.in/ogpl_apis — GET /resource/{id}?api-key=&format=json&limit=&offset=
const API_BASE = 'https://api.data.gov.in/resource/';
const PAGE_SIZE = 500;
const MAX_PAGES = 200;

function apiKey() {
  const key = process.env.DATA_GOV_IN_API_KEY?.trim();
  if (!key) throw new Error('DATA_GOV_IN_API_KEY is not set in backend/.env');
  return key;
}

function isConfigured() {
  return Boolean(process.env.DATA_GOV_IN_API_KEY?.trim());
}

async function fetchPage(resourceId, offset, limit) {
  const url = new URL(`${API_BASE}${encodeURIComponent(resourceId)}`);
  url.search = new URLSearchParams({ 'api-key': apiKey(), format: 'json', limit: String(limit), offset: String(offset) });

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' } });
      if (response.status === 401 || response.status === 403) {
        throw Object.assign(new Error(`data.gov.in rejected the API key (${response.status}).`), { fatal: true });
      }
      if (!response.ok) throw new Error(`data.gov.in returned HTTP ${response.status}.`);
      const body = await response.json();
      if (body.status && body.status !== 'ok') throw new Error(`data.gov.in error: ${body.message || body.status}`);
      if (!Array.isArray(body.records)) throw new Error('data.gov.in response has no records array.');
      return body;
    } catch (error) {
      if (error.fatal) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

function toIsoDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber) && String(value).trim() !== ''
    ? new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber)
    : new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

// Fetches every record of a resource, following offset pagination.
async function fetchAllRecords(resourceId, { pageSize = PAGE_SIZE } = {}) {
  const first = await fetchPage(resourceId, 0, pageSize);
  const total = Number(first.total) || first.records.length;
  const records = [...first.records];

  for (let page = 1; records.length < total && page < MAX_PAGES; page += 1) {
    const next = await fetchPage(resourceId, records.length, pageSize);
    if (!next.records.length) break;
    records.push(...next.records);
  }

  return {
    resourceId,
    title: first.title || first.index_name || resourceId,
    total,
    records,
    fields: Array.isArray(first.field) ? first.field : [],
    updatedDate: toIsoDate(first.updated_date) || toIsoDate(first.updated),
    createdDate: toIsoDate(first.created_date) || toIsoDate(first.created),
    sourceUrl: first.source ? `https://${String(first.source).replace(/^https?:\/\//, '')}` : null,
  };
}

module.exports = { fetchAllRecords, isConfigured, toIsoDate };
