/**
 * Quick end-to-end check against a running API.
 *   npm run smoke
 * Override with BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD.
 */
const baseUrl = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const email = process.env.SMOKE_EMAIL || 'admin@bloodbank.in';
const password = process.env.SMOKE_PASSWORD || 'Test@1234';

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, options);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  const health = await request('/api/health');
  console.log(`health: ${health.status} (${baseUrl})`);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.token) throw new Error('login response did not contain a token');
  console.log(`login: ${login.user?.role || 'unknown'} role`);

  const stats = await request('/api/dashboard/stats', {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  const data = stats.data || {};
  console.log(
    `stats: ${data.total_donors} donors, ${data.total_units_available} units, ${data.pending_requests} pending requests`,
  );
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
