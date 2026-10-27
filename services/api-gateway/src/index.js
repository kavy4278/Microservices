const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
// listings carry a downscaled photo as a base64 data URL — the 100kb default would 413 it
app.use(express.json({ limit: '8mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret123';
const INTERNAL_KEY = process.env.INTERNAL_KEY || JWT_SECRET;
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:5001';
const LISTING_URL = process.env.LISTING_URL || 'http://listing-service:5002';
const CLAIM_URL = process.env.CLAIM_URL || 'http://claim-service:5003';
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notify-service:5004';

app.get('/health', (req, res) => res.json({ ok: true, gateway: true, services: { auth: AUTH_URL, listing: LISTING_URL, claim: CLAIM_URL, notify: NOTIFY_URL } }));

/* ------------------------- live SSE connections ------------------------- */
// userId -> Set<{ res, role }> so multiple tabs per user all receive events.
const sseClients = new Map();

function addClient(userId, role, res) {
  const entry = { res, role: String(role || '').toLowerCase() };
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(entry);
  return entry;
}

function removeClient(userId, entry) {
  const set = sseClients.get(userId);
  if (!set) return;
  set.delete(entry);
  if (set.size === 0) sseClients.delete(userId);
}

function writeEvent(res, event) {
  const name = event && event.event ? event.event : 'message';
  res.write(`event: ${name}\ndata: ${JSON.stringify(event)}\n\n`);
}

function broadcast({ userIds = [], roles = [], all = false, event = {} } = {}) {
  const idSet = new Set((Array.isArray(userIds) ? userIds : []).map((v) => String(v)));
  const roleSet = new Set((Array.isArray(roles) ? roles : []).map((v) => String(v).toLowerCase()));
  let sent = 0;
  for (const [userId, set] of sseClients) {
    for (const entry of set) {
      if (all || idSet.has(userId) || roleSet.has(entry.role)) {
        try { writeEvent(entry.res, event); sent += 1; } catch { /* connection closed */ }
      }
    }
  }
  return sent;
}

// SSE endpoint — EventSource cannot send an Authorization header, so it may pass
// ?token=<jwt> instead. This route is intentionally registered before authMiddleware.
app.get('/api/notify/stream', (req, res) => {
  const header = req.headers.authorization || '';
  const token = (header.startsWith('Bearer ') ? header.slice(7) : '') || String(req.query.token || '');
  if (!token) return res.status(401).json({ ok: false, error: 'login required' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, error: 'invalid token' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  const entry = addClient(String(payload.id), payload.role, res);
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, userId: payload.id, role: payload.role || '' })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* handled by close */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(String(payload.id), entry);
    try { res.end(); } catch { /* already closed */ }
  });
});

// Internal fan-out called by notify-service. Protected by a shared key so the
// public gateway port cannot be used to inject live events.
app.post('/internal/broadcast', (req, res) => {
  if (String(req.headers['x-internal-key'] || '') !== String(INTERNAL_KEY)) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  const sent = broadcast(req.body || {});
  res.json({ ok: true, data: { sent } });
});

/* ------------------------------ auth/proxy ------------------------------ */
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
