const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/maindb';
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
  status: { type: String, enum: ['POSTED','CLAIMED','PICKED_UP','DELIVERED','EXPIRED','CANCELLED'], default: 'POSTED' },
  otp: { type: String, default: () => String(Math.floor(1000 + Math.random()*9000)) },
}, { timestamps: true });
const Listing = mongoose.model('Listing', schema);

const uid = (req) => req.headers['x-user-id'];
const role = (req) => req.headers['x-user-role'];

app.get('/health', (req,res)=>res.json({ok:true,service:'listing'}));

function validate(body) {
  const { title, qty, cookedAt, expiryAt, city, address } = body;
  if (!title || !qty || !cookedAt || !expiryAt || !city || !address) return 'title,qty,cookedAt,expiryAt,city,address required';
  if (Number(qty) < 1 || Number(qty) > 1000) return 'qty 1-1000';
  const c = new Date(cookedAt), e = new Date(expiryAt), now = new Date();
  if (isNaN(c) || isNaN(e)) return 'bad dates';
  if (c > now) return 'cookedAt cannot be future';
  if (e < new Date(now.getTime() + 2*3600*1000)) return 'expiryAt must be >= now+2h';
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
    const doc = await Listing.create({ ...req.body, qty: Number(req.body.qty), veg: !!req.body.veg, donorId: uid(req), donorName: req.headers['x-user-name']||'' });
    res.json({ok:true,data:doc});
  } catch(e){res.status(500).json({ok:false,error:e.message});}
});

// search
app.get('/', async (req,res)=>{
  try {
    const { city, veg, available, mine } = req.query;
    const q = {};
    if (city) q.city = new RegExp('^'+city.trim()+'$','i');
    if (veg === 'true') q.veg = true;
    if (veg === 'false') q.veg = false;
    if (available === '1') { q.status = 'POSTED'; q.expiryAt = { $gt: new Date() }; }
    if (mine === '1') q.donorId = uid(req);
    const docs = await Listing.find(q).sort({ expiryAt: 1 }).limit(100);
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
  const d = await Listing.findById(req.params.id);
  if (!d) return res.status(404).json({ok:false,error:'not found'});
  const o = d.toObject();
  if (o.donorId !== uid(req) && role(req) !== 'admin') delete o.otp;
  res.json({ok:true,data:o});
});

app.put('/:id', async (req,res)=>{
  const d = await Listing.findById(req.params.id);
  if (!d) return res.status(404).json({ok:false,error:'not found'});
  if (d.donorId !== uid(req) && role(req) !== 'admin') return res.status(403).json({ok:false,error:'not owner'});
  if (d.status !== 'POSTED') return res.status(400).json({ok:false,error:'only POSTED editable'});
  ['title','qty','city','address','veg','expiryAt'].forEach(k=>{ if(req.body[k]!==undefined) d[k]=req.body[k]; });
  await d.save();
  res.json({ok:true,data:d});
});

app.delete('/:id', async (req,res)=>{
  const d = await Listing.findById(req.params.id);
  if (!d) return res.status(404).json({ok:false,error:'not found'});
  if (d.donorId !== uid(req) && role(req) !== 'admin') return res.status(403).json({ok:false,error:'not owner'});
  await d.deleteOne();
  res.json({ok:true,data:{deleted:true}});
});

// internal status update called by claim-service via direct DB (same maindb) — also expose for gateway
app.patch('/:id/status', async (req,res)=>{
  const d = await Listing.findById(req.params.id);
  if (!d) return res.status(404).json({ok:false,error:'not found'});
  if (req.body.status) d.status = req.body.status;
  await d.save();
  res.json({ok:true,data:d});
});

mongoose.connect(MONGO_URL).then(()=>app.listen(process.env.PORT||5002,()=>console.log('listing up'))).catch(e=>{console.error(e);process.exit(1);});
