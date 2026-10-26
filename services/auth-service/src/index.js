const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret123';
const INTERNAL_KEY = process.env.INTERNAL_KEY || JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/authdb';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','donor','ngo','rider'], required: true },
  org: { type: String, default: '' },
  phone: { type: String, default: '' },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const sign = (u) => jwt.sign({ id: u._id.toString(), role: u.role, name: u.name, phone: u.phone || '' }, JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, org: u.org, phone: u.phone || '' });

app.get('/health', (req, res) => res.json({ ok: true, service: 'auth' }));

// internal: notify-service expands role broadcasts into per-user notifications
app.get('/internal/users', async (req, res) => {
  try {
    if (String(req.headers['x-internal-key'] || '') !== String(INTERNAL_KEY)) return res.status(403).json({ ok: false, error: 'forbidden' });
    const role = String(req.query.role || '').toLowerCase();
    const q = ['admin', 'donor', 'ngo', 'rider'].includes(role) ? { role } : {};
    const users = await User.find(q).select('_id role').limit(2000);
    res.json({ ok: true, data: users });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/register', async (req, res) => {
  try {
    let { name, email, password, role, org, phone } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ ok: false, error: 'name,email,password,role required' });
    role = String(role).toLowerCase();
    if (!['admin','donor','ngo','rider'].includes(role)) return res.status(400).json({ ok: false, error: 'invalid role' });
    email = String(email).toLowerCase().trim();
    if (String(password).length < 6) return res.status(400).json({ ok: false, error: 'password min 6 chars' });
    if (role === 'donor' && (!phone || !String(phone).trim())) {
      return res.status(400).json({ ok: false, error: 'phone required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ ok: false, error: 'email already registered' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const u = await User.create({ name: String(name).trim(), email, passwordHash, role, org: org || '', phone: phone ? String(phone).trim() : '' });
    res.json({ ok: true, data: { token: sign(u), user: pub(u) } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'email+password required' });
    const u = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!u) return res.status(401).json({ ok: false, error: 'invalid credentials' });
    const ok = await bcrypt.compare(String(password), u.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: 'invalid credentials' });
    res.json({ ok: true, data: { token: sign(u), user: pub(u) } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/me', async (req, res) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'no token' });
    const p = jwt.verify(token, JWT_SECRET);
    const u = await User.findById(p.id);
    if (!u) return res.status(401).json({ ok: false, error: 'user gone' });
    res.json({ ok: true, data: pub(u) });
  } catch (e) { res.status(401).json({ ok: false, error: 'invalid token' }); }
});

// internal: gateway passes x-user-role; only admin can list
app.get('/users', async (req, res) => {
  if (req.headers['x-user-role'] !== 'admin') return res.status(403).json({ ok: false, error: 'admin only' });
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(100);
  res.json({ ok: true, data: users });
});

mongoose.connect(MONGO_URL).then(() => {
  app.listen(process.env.PORT || 5001, () => console.log('auth up'));
}).catch(e => { console.error(e); process.exit(1); });
