const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/maindb';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:8080';
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:5001';
const INTERNAL_KEY = process.env.INTERNAL_KEY || process.env.JWT_SECRET || 'devsecret123';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, default: '', index: true },
  role: { type: String, default: '', index: true },
  type: { type: String, default: 'info' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  entityType: { type: String, default: '' },
  entityId: { type: String, default: '' },
  status: { type: String, default: '' },
  actorId: { type: String, default: '' },
  actorName: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
const Notification = mongoose.model('Notify', notificationSchema);

const uid = (req) => req.headers['x-user-id'] || '';
const role = (req) => String(req.headers['x-user-role'] || '').toLowerCase();

function cleanIds(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean)));
}

async function usersForRole(role) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const out = await fetch(`${AUTH_URL}/internal/users?role=${encodeURIComponent(role)}`, {
      headers: { 'x-internal-key': INTERNAL_KEY },
      signal: controller.signal,
    });
    if (!out.ok) throw new Error(`auth-service ${out.status}`);
    const body = await out.json();
    return cleanIds((body.data || []).map((u) => u && u._id));
  } finally {
    clearTimeout(timer);
  }
}

async function pushGateway(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const out = await fetch(`${GATEWAY_URL}/internal/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!out.ok) console.error('broadcast rejected:', out.status);
  } catch (e) {
    // The notification is still stored even when the gateway is unavailable.
    console.error('broadcast failed:', e.message);
  } finally {
    clearTimeout(timer);
  }
}

app.get('/health', (req, res) => res.json({ ok: true, service: 'notify' }));

app.get('/', async (req, res) => {
  try {
    const r = role(req);
    const id = uid(req);
    if (!id) return res.status(401).json({ ok: false, error: 'login required' });
    const q = r ? { $or: [{ userId: id }, { role: r }] } : { userId: id };
    const data = await Notification.find(q).sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/unread-count', async (req, res) => {
  try {
    const r = role(req);
    const id = uid(req);
    if (!id) return res.status(401).json({ ok: false, error: 'login required' });
    const q = { read: false, ...(r ? { $or: [{ userId: id }, { role: r }] } : { userId: id }) };
    res.json({ ok: true, data: { count: await Notification.countDocuments(q) } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.patch('/read-all', async (req, res) => {
  try {
    const r = role(req);
    const id = uid(req);
    if (!id) return res.status(401).json({ ok: false, error: 'login required' });
    const q = { read: false, ...(r ? { $or: [{ userId: id }, { role: r }] } : { userId: id }) };
    const out = await Notification.updateMany(q, { $set: { read: true } });
    res.json({ ok: true, data: { updated: out.modifiedCount || 0 } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Legacy direct-create endpoint (kept for compatibility with older clients).
app.post('/', async (req, res) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ ok: false, error: 'login required' });
    const b = req.body || {};
    const doc = await Notification.create({
      userId: id,
      type: b.type || 'info',
      title: b.title || b.message || 'Notification',
      body: b.body || b.message || '',
      entityType: b.entityType || '',
      entityId: b.entityId ? String(b.entityId) : '',
      status: b.status || '',
      actorId: b.actorId || id,
      actorName: b.actorName || req.headers['x-user-name'] || '',
    });
    await pushGateway({ userIds: [id], event: { event: 'notification', notification: doc.toObject() } });
    res.json({ ok: true, data: doc });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Internal API used by claim-service / listing-service. Role broadcasts are expanded
// into one row per user (so each user owns their read state) and keep a role fallback
// row if auth-service is unavailable. Each row is pushed to the matching SSE clients.
app.post('/internal/notify', async (req, res) => {
  try {
    const b = req.body || {};
    const roles = cleanIds(b.roles).map((r) => r.toLowerCase()).filter((r) => ['admin', 'donor', 'ngo', 'rider'].includes(r));
    const directIds = cleanIds(b.userIds);
    if (!directIds.length && !roles.length) return res.status(400).json({ ok: false, error: 'userIds or roles required' });
    const targetIds = new Set(directIds);
    const fallbackRoles = [];
    await Promise.all(roles.map(async (r) => {
      try {
        const ids = await usersForRole(r);
        if (ids.length) ids.forEach((id) => targetIds.add(id));
        else fallbackRoles.push(r);
      } catch (e) {
        console.error(`role lookup failed for ${r}:`, e.message);
        fallbackRoles.push(r);
      }
    }));
    const base = {
      type: b.type || 'info',
      title: b.title || 'Notification',
      body: b.body || '',
      entityType: b.entityType || '',
      entityId: b.entityId ? String(b.entityId) : '',
      status: b.status || '',
      actorId: b.actorId || '',
      actorName: b.actorName || '',
    };
    const docs = [];
    for (const userId of targetIds) docs.push(await Notification.create({ ...base, userId, role: '' }));
    for (const r of fallbackRoles) docs.push(await Notification.create({ ...base, userId: '', role: r }));
    if (!docs.length) return res.status(400).json({ ok: false, error: 'no recipients found' });
    await Promise.all(docs.map((doc) => pushGateway({
      userIds: doc.userId ? [doc.userId] : [],
      roles: doc.role ? [doc.role] : [],
      event: { event: 'notification', notification: doc.toObject() },
    })));
    res.json({ ok: true, data: docs });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Broadcast a status change to every connected client (donor, NGO, rider, admin).
app.post('/internal/status', async (req, res) => {
  try {
    const b = req.body || {};
    const event = {
      event: 'status_changed',
      entityType: b.entityType || '',
      entityId: b.entityId ? String(b.entityId) : '',
      status: b.status || '',
      at: b.at || new Date().toISOString(),
      by: b.by || '',
      byName: b.byName || '',
      title: b.title || '',
      city: b.city || '',
      timeline: b.timeline || null,
    };
    await pushGateway({ all: true, event });
    res.json({ ok: true, data: { broadcast: true } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

mongoose.connect(MONGO_URL)
  .then(() => app.listen(process.env.PORT || 5004, () => console.log('notify up')))
  .catch((e) => { console.error(e); process.exit(1); });
