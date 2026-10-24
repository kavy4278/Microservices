const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
// listings carry a downscaled photo as a base64 data URL — the 100kb default would 413 it
app.use(express.json({ limit: '8mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret123';
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:5001';
const LISTING_URL = process.env.LISTING_URL || 'http://listing-service:5002';
const CLAIM_URL = process.env.CLAIM_URL || 'http://claim-service:5003';
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notify-service:5004';

app.get('/health', (req, res) => res.json({ ok: true, gateway: true, services: { auth: AUTH_URL, listing: LISTING_URL, claim: CLAIM_URL, notify: NOTIFY_URL } }));

function authMiddleware(req, res, next) {
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) return next();
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'login required' });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.userId = p.id; req.userRole = p.role; req.userName = p.name || ''; req.userPhone = p.phone || '';
    next();
  } catch (e) { return res.status(401).json({ ok: false, error: 'invalid token' }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) return res.status(403).json({ ok: false, error: 'role ' + req.userRole + ' not allowed' });
    next();
  };
}

// generic fetch proxy: forwards method+query+body, injects identity headers
async function proxy(base, rewrite, req, res) {
  try {
    const target = base + req.originalUrl.replace(rewrite, '');
    const headers = { 'Content-Type': 'application/json' };
    if (req.userId) {
      headers['x-user-id'] = req.userId;
      headers['x-user-role'] = req.userRole;
      if (req.userName) headers['x-user-name'] = req.userName;
      if (req.userPhone) headers['x-user-phone'] = req.userPhone;
    }
    if (req.path === '/api/users') headers['x-user-role'] = 'admin';
    const out = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
    });
    const text = await out.text();
    res.status(out.status);
    try { res.json(JSON.parse(text)); } catch { res.send(text); }
  } catch (e) { res.status(502).json({ ok: false, error: 'upstream failed: ' + e.message }); }
}

app.use(authMiddleware);
app.use('/api/auth', (req, res) => proxy(AUTH_URL, '/api/auth', req, res));
app.use('/api/listings', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return requireRole('donor', 'admin')(req, res, () => proxy(LISTING_URL, '/api/listings', req, res));
  proxy(LISTING_URL, '/api/listings', req, res);
});
app.use('/api/claims', (req, res) => proxy(CLAIM_URL, '/api/claims', req, res));
app.use('/api/notify', (req, res) => proxy(NOTIFY_URL, '/api/notify', req, res));
app.get('/api/users', requireRole('admin'), (req, res) => proxy(AUTH_URL, '/api', req, res));

app.listen(process.env.PORT || 8080, () => console.log('gateway up 8080'));
