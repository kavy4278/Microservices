// Creates the demo accounts advertised in README / projectrun.md / the UI, then proves they
// can actually sign in (that is exactly what the UI demo chips do). Idempotent — safe to re-run.
// Run: node tests/seed.js
const BASE = process.env.API || 'http://localhost:8085';

const ACCOUNTS = [
  { name: 'Demo Donor', email: 'donor@test.com', password: 'donor123', role: 'donor', org: 'Hotel Saffron', phone: '+91 98765 43210' },
  { name: 'Demo NGO',   email: 'ngo@test.com',   password: 'ngo123',   role: 'ngo',   org: 'Hope Foundation', phone: '+91 98765 43211' },
  { name: 'Demo Rider', email: 'rider@test.com', password: 'rider123', role: 'rider', org: '', phone: '+91 98765 43212' },
  { name: 'Demo Admin', email: 'admin@test.com', password: 'admin123', role: 'admin', org: 'AnnBachao', phone: '+91 98765 43213' },
];

async function api(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

(async () => {
  const h = await api('/health');
  if (!h.body.ok) throw new Error('gateway not healthy at ' + BASE);

  let created = 0, present = 0;
  for (const a of ACCOUNTS) {
    const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(a) });
    if (r.body.ok) { created++; console.log('  created  ' + a.email + ' (' + a.role + ')'); continue; }
    if (r.status === 409) { present++; console.log('  exists   ' + a.email); continue; }
    throw new Error('seed ' + a.email + ' failed: ' + JSON.stringify(r.body));
  }

  for (const a of ACCOUNTS) {
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: a.email, password: a.password }) });
    if (!r.body.ok) throw new Error('sign-in check failed for ' + a.email + ': ' + JSON.stringify(r.body));
  }

  console.log('SEED OK — created ' + created + ', already present ' + present + ', sign-in verified for ' + ACCOUNTS.length + ' accounts');
})().catch((e) => { console.error('SEED FAIL:', e.message); process.exit(1); });
