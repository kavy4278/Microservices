// Seed 4 demo users. Run: node scripts/seed.js (gateway must be up)
const BASE = process.env.API || 'http://localhost:8085';
const users = [
  { name: 'Donor Hotel', email: 'donor@test.com', password: 'donor123', role: 'donor', org: 'Hotel Shree', phone: '+91 98765 43210' },
  { name: 'NGO Seva', email: 'ngo@test.com', password: 'ngo123', role: 'ngo', org: 'Seva Food Bank', phone: '+91 98765 43211' },
  { name: 'Rider Vol', email: 'rider@test.com', password: 'rider123', role: 'rider', phone: '+91 98765 43212' },
  { name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin', phone: '+91 98765 43213' },
];
(async () => {
  for (const u of users) {
    const r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    const j = await r.json().catch(() => ({}));
    console.log(u.email, '->', r.status, j.ok ? 'ok' : (j.error || 'exists?'));
  }
})();
