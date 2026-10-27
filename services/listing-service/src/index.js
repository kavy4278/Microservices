const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
// photoUrl may hold a base64 data URL, so allow a far larger body than the 100kb default
app.use(express.json({ limit: '8mb' }));

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/maindb';
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notify-service:5004';
const EXPIRY_WARN_MS = Number(process.env.EXPIRY_WARN_MS || 60 * 60 * 1000); // 1 hour
const SWEEP_MS = Number(process.env.EXPIRY_SWEEP_MS || 60 * 1000);

const schema = new mongoose.Schema({
  donorId: { type: String, required: true },
  donorName: { type: String, default: '' },
  title: { type: String, required: true, maxlength: 120, trim: true },
  qty: { type: Number, required: true, min: 1, max: 1000 },
  veg: { type: Boolean, default: true },
  cookedAt: { type: Date, required: true },
  expiryAt: { type: Date, required: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  photoUrl: { type: String, default: '' },
  phone: { type: String, default: '' },
  donorPhone: { type: String, default: '' },
  status: { type: String, enum: ['POSTED','CLAIMED','PICKED_UP','DELIVERED','EXPIRED','CANCELLED'], default: 'POSTED' },
  otp: { type: String, default: () => String(Math.floor(1000 + Math.random()*9000)) },
  timeline: { type: Array, default: [] },
  expiryNotified: { type: Boolean, default: false },
}, { timestamps: true });
const Listing = mongoose.model('Listing', schema);

const uid = (req) => req.headers['x-user-id'] || '';
const role = (req) => req.headers['x-user-role'] || '';
const uname = (req) => req.headers['x-user-name'] || '';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function timelineEntry(req, msg, status) {
  return { at: new Date(), by: uid(req), byName: uname(req), msg, status };
}

function postInternal(path, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  fetch(`${NOTIFY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).catch((e) => console.error('notify failed:', e.message)).finally(() => clearTimeout(timer));
}

function notify(payload) { postInternal('/internal/notify', payload); }

function broadcastStatus(d, entry) {
  postInternal('/internal/status', {
    entityType: 'listing',
    entityId: String(d._id),
    status: d.status,
    at: entry.at,
    by: entry.by,
    byName: entry.byName,
    title: d.title,
    city: d.city,
    timeline: entry,
  });
}

app.get('/health', (req,res)=>res.json({ok:true,service:'listing'}));

function validate(body) {
  const { title, qty, cookedAt, expiryAt, city, address } = body;
  if (!title || !qty || !cookedAt || !expiryAt || !city || !address) return 'title,qty,cookedAt,expiryAt,city,address required';
  if (Number(qty) < 1 || Number(qty) > 1000) return 'qty 1-1000';
  const c = new Date(cookedAt), e = new Date(expiryAt), now = new Date();
  if (isNaN(c) || isNaN(e)) return 'bad dates';
  if (c > now) return 'cookedAt cannot be future';
  if (e <= c) return 'expiry must be after cooked';
  return null;
}

// create (donor/admin only — gateway also checks)
app.post('/', async (req,res)=>{
  try {
    const r = role(req);
    if (!['donor','admin'].includes(r)) return res.status(403).json({ok:false,error:'donor only'});
    const err = validate(req.body);
    if (err) return res.status(400).json({ok:false,error:err});
    const donorPhone = req.body.donorPhone || req.body.phone || req.headers['x-user-phone'] || '';
    const entry = timelineEntry(req, 'posted', 'POSTED');
    const doc = await Listing.create({
      donorId: uid(req),
      donorName: req.headers['x-user-name'] || '',
      title: req.body.title,
      qty: Number(req.body.qty),
      veg: !!req.body.veg,
      cookedAt: req.body.cookedAt,
      expiryAt: req.body.expiryAt,
      city: req.body.city,
      address: req.body.address,
      photoUrl: req.body.photoUrl || '',
      phone: donorPhone,
      donorPhone,
      status: 'POSTED',
      timeline: [entry],
    });
    notify({
      roles: ['ngo'],
      type: 'listing_posted',
      title: 'New surplus food nearby',
      body: `"${doc.title}" — ${doc.qty} servings in ${doc.city}.`,
      entityType: 'listing', entityId: String(doc._id), status: 'POSTED',
      actorId: uid(req), actorName: uname(req),
    });
    broadcastStatus(doc, entry);
    res.json({ok:true,data:doc});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

// distinct cities for validated dropdowns / auto-suggest
app.get('/cities', async (req,res)=>{
  try {
    const cities = await Listing.distinct('city');
    res.json({ok:true,data:cities.filter(Boolean).sort()});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

// search
app.get('/', async (req,res)=>{
  try {
    const { city, veg, available, mine } = req.query;
    const q = {};
    if (city && city.trim()) q.city = new RegExp(escapeRegex(city.trim()), 'i');
    if (veg === 'true') q.veg = true;
    if (veg === 'false') q.veg = false;
    if (available === '1') { q.status = 'POSTED'; q.expiryAt = { $gt: new Date() }; }
    if (mine === '1') q.donorId = uid(req);
    let docs = await Listing.find(q).sort({ expiryAt: 1 }).limit(100);
    // distance-aware ordering: exact city match first, then expiry ascending
    if (city && city.trim()) {
      const target = city.trim().toLowerCase();
      docs.sort((a, b) => {
        const aExact = (a.city || '').toLowerCase() === target ? 0 : 1;
        const bExact = (b.city || '').toLowerCase() === target ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return new Date(a.expiryAt) - new Date(b.expiryAt);
      });
    }
    // hide OTP unless owner/admin
    const out = docs.map(d=>{
      const o = d.toObject();
      if (o.donorId !== uid(req) && role(req) !== 'admin') delete o.otp;
      return o;
    });
    res.json({ok:true,data:out});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.get('/:id', async (req,res)=>{
  try {
    const d = await Listing.findById(req.params.id);
    if (!d) return res.status(404).json({ok:false,error:'not found'});
    const o = d.toObject();
    if (o.donorId !== uid(req) && role(req) !== 'admin') delete o.otp;
    res.json({ok:true,data:o});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.put('/:id', async (req,res)=>{
  try {
    const d = await Listing.findById(req.params.id);
    if (!d) return res.status(404).json({ok:false,error:'not found'});
    if (d.donorId !== uid(req) && role(req) !== 'admin') return res.status(403).json({ok:false,error:'not owner'});
    if (d.status !== 'POSTED') return res.status(400).json({ok:false,error:'only POSTED editable'});
    ['title','qty','city','address','veg','expiryAt','photoUrl'].forEach(k=>{ if(req.body[k]!==undefined) d[k]=req.body[k]; });
    if (req.body.expiryAt !== undefined) d.expiryNotified = false;
    await d.save();
    res.json({ok:true,data:d});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.delete('/:id', async (req,res)=>{
  try {
    const d = await Listing.findById(req.params.id);
    if (!d) return res.status(404).json({ok:false,error:'not found'});
    if (d.donorId !== uid(req) && role(req) !== 'admin') return res.status(403).json({ok:false,error:'not owner'});
    const entry = timelineEntry(req, 'cancelled', 'CANCELLED');
    d.status = 'CANCELLED';
    broadcastStatus(d, entry);
    await d.deleteOne();
    res.json({ok:true,data:{deleted:true}});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

// internal status update called by claim-service via direct DB (same maindb) — also expose for gateway
app.patch('/:id/status', async (req,res)=>{
  try {
    const d = await Listing.findById(req.params.id);
    if (!d) return res.status(404).json({ok:false,error:'not found'});
    const allowed = ['POSTED','CLAIMED','PICKED_UP','DELIVERED','EXPIRED','CANCELLED'];
    if (req.body.status && !allowed.includes(req.body.status)) return res.status(400).json({ok:false,error:'invalid status'});
    if (req.body.status && req.body.status !== d.status) {
      d.status = req.body.status;
      const entry = timelineEntry(req, String(req.body.status).toLowerCase().replace('_',' '), req.body.status);
      d.timeline.push(entry);
      await d.save();
      broadcastStatus(d, entry);
      notify({
        userIds: [d.donorId].filter(Boolean),
        type: 'status_update',
        title: 'Listing status updated',
        body: `"${d.title}" is now ${req.body.status.replace('_',' ')}.`,
        entityType: 'listing', entityId: String(d._id), status: d.status,
        actorId: uid(req), actorName: uname(req),
      });
    } else {
      await d.save();
    }
    res.json({ok:true,data:d});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

// ---------------- expiry sweep: mark expired + warn before pickup window closes ----------------
async function sweepExpiry() {
  const now = new Date();
  try {
    const expired = await Listing.find({ status: 'POSTED', expiryAt: { $lte: now } }).select('_id').limit(50);
    for (const row of expired) {
      const entry = { at: now, by: 'system', byName: 'System', msg: 'expired', status: 'EXPIRED' };
      const res = await Listing.updateOne(
        { _id: row._id, status: 'POSTED', expiryAt: { $lte: now } },
        { $set: { status: 'EXPIRED' }, $push: { timeline: entry } },
      );
      if (!res.modifiedCount) continue;
      const d = await Listing.findById(row._id);
      if (!d) continue;
      broadcastStatus(d, entry);
      notify({
        userIds: [d.donorId].filter(Boolean),
        type: 'window_expiring',
        title: 'Listing expired',
        body: `"${d.title}" passed its safe-until time and is no longer available.`,
        entityType: 'listing', entityId: String(d._id), status: 'EXPIRED',
      });
    }

    const soonCutoff = new Date(now.getTime() + EXPIRY_WARN_MS);
    const soon = await Listing.find({
      status: 'POSTED', expiryAt: { $gt: now, $lte: soonCutoff }, expiryNotified: { $ne: true },
    }).select('_id').limit(50);
    for (const row of soon) {
      const res = await Listing.updateOne(
        { _id: row._id, status: 'POSTED', expiryNotified: { $ne: true } },
        { $set: { expiryNotified: true } },
      );
      if (!res.modifiedCount) continue;
      const d = await Listing.findById(row._id);
      if (!d) continue;
      notify({
        userIds: [d.donorId].filter(Boolean),
        roles: ['rider'],
        type: 'window_expiring',
        title: 'Pickup window expiring soon',
        body: `"${d.title}" in ${d.city} must be collected before ${new Date(d.expiryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        entityType: 'listing', entityId: String(d._id), status: 'POSTED',
      });
    }
  } catch (e) {
    console.error('expiry sweep failed:', e.message);
  }
}

mongoose.connect(MONGO_URL)
  .then(() => {
    app.listen(process.env.PORT || 5002, () => console.log('listing up'));
    sweepExpiry();
    setInterval(sweepExpiry, SWEEP_MS).unref();
  })
  .catch(e => { console.error(e); process.exit(1); });
