const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/maindb';
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notify-service:5004';

const listingSchema = new mongoose.Schema({
  donorId: String, donorName: String, title: String, qty: Number, veg: Boolean,
  cookedAt: Date, expiryAt: Date, city: String, address: String,
  photoUrl: String, status: String, otp: String, phone: String, donorPhone: String,
  timeline: { type: Array, default: [] },
}, { timestamps: true, collection: 'listings' });
const Listing = mongoose.model('Listing', listingSchema);

const claimSchema = new mongoose.Schema({
  listingId: { type: String, required: true },
  listingTitle: { type: String, default: '' },
  qty: { type: Number, default: 0 },
  city: { type: String, default: '' },
  ngoId: { type: String, required: true },
  ngoName: { type: String, default: '' },
  riderId: { type: String, default: '' },
  riderName: { type: String, default: '' },
  status: { type: String, enum: ['CLAIMED','PICKED_UP','DELIVERED','CANCELLED'], default: 'CLAIMED' },
  timeline: { type: Array, default: [] },
}, { timestamps: true });
const Claim = mongoose.model('Claim', claimSchema);

const uid = (req)=>req.headers['x-user-id'];
const role = (req)=>req.headers['x-user-role'];
const uname = (req)=>req.headers['x-user-name']||'';

function timelineEntry(req, msg, status) {
  return { at: new Date(), by: uid(req) || '', byName: uname(req) || '', msg, status };
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
function broadcastStatus(payload) { postInternal('/internal/status', payload); }

function statusChange(entityType, entity, req, entry, extra = {}) {
  broadcastStatus({
    entityType,
    entityId: String(entity._id),
    status: entity.status,
    at: entry.at,
    by: entry.by,
    byName: entry.byName,
    title: extra.title || entity.listingTitle || entity.title || '',
    city: extra.city || entity.city || '',
    timeline: entry,
  });
}

app.get('/health',(req,res)=>res.json({ok:true,service:'claim'}));

app.post('/', async (req,res)=>{
  try{
    const r = role(req);
    if (r !== 'ngo') return res.status(403).json({ok:false,error:'ngo only'});
    const { listingId } = req.body;
    if(!listingId) return res.status(400).json({ok:false,error:'listingId required'});
    const l = await Listing.findById(listingId);
    if(!l) return res.status(404).json({ok:false,error:'listing not found'});
    if(l.status!=='POSTED') return res.status(409).json({ok:false,error:'already '+l.status});
    if(new Date(l.expiryAt) < new Date()) return res.status(400).json({ok:false,error:'expired'});
    const existing = await Claim.findOne({ listingId, status: { $in:['CLAIMED','PICKED_UP'] } });
    if(existing) return res.status(409).json({ok:false,error:'already claimed'});
    const entry = timelineEntry(req, 'claimed', 'CLAIMED');
    const c = await Claim.create({
      listingId, listingTitle:l.title, qty:l.qty, city:l.city,
      ngoId:uid(req), ngoName:uname(req), status:'CLAIMED', timeline:[entry],
    });
    l.status='CLAIMED';
    l.timeline.push({ ...entry, by: uid(req) || '', byName: uname(req) || '' });
    await l.save();

    notify({
      userIds: [l.donorId, uid(req)].filter(Boolean),
      type: 'listing_claimed',
      title: 'Listing claimed',
      body: `${uname(req) || 'An NGO'} claimed "${l.title}" — ${l.qty} servings.`,
      entityType: 'listing', entityId: String(l._id), status: 'CLAIMED',
      actorId: uid(req), actorName: uname(req),
    });
    notify({
      roles: ['rider'],
      type: 'delivery_assigned',
      title: 'New pickup available',
      body: `"${l.title}" in ${l.city || 'your city'} is ready to be collected.`,
      entityType: 'claim', entityId: String(c._id), status: 'CLAIMED',
      actorId: uid(req), actorName: uname(req),
    });
    statusChange('listing', l, req, { ...entry }, { title: l.title, city: l.city });
    statusChange('claim', c, req, { ...entry }, { title: l.title, city: l.city });

    res.json({ok:true,data:{claim:c,otp:l.otp}});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.get('/', async (req,res)=>{
  try{
    const r=role(req), id=uid(req);
    let q={};
    if(r==='ngo') q.ngoId=id;
    else if(r==='rider') q={ $or:[ { status: { $in:['CLAIMED','PICKED_UP'] } }, { riderId:id } ] };
    // donor sees claims for own listings:
    if(r==='donor'){
      const mine = await Listing.find({donorId:id}).select('_id');
      q.listingId={ $in: mine.map(m=>m._id.toString()) };
    }
    const docs = await Claim.find(q).sort({createdAt:-1}).limit(100);
    // attach OTP/photo for display (lookup listings)
    const out=[];
    for(const c of docs){
      const o=c.toObject(); const l=await Listing.findById(c.listingId);
      o.otp = l?l.otp:undefined;
      o.listingStatus=l?l.status:undefined;
      o.photoUrl = l ? l.photoUrl : undefined;
      o.veg = l ? l.veg : undefined;
      if (['ngo', 'rider', 'admin'].includes(r)) {
        const phone = l ? (l.donorPhone || l.phone || '') : '';
        if (phone) o.donorPhone = phone;
        const donorName = l ? (l.donorName || '') : '';
        if (donorName) o.donorName = donorName;
      }
      out.push(o);
    }
    res.json({ok:true,data:out});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.patch('/:id/pickup', async (req,res)=>{
  try{
    if(!['rider','admin'].includes(role(req))) return res.status(403).json({ok:false,error:'rider only'});
    const c=await Claim.findById(req.params.id);
    if(!c) return res.status(404).json({ok:false,error:'not found'});
    if(c.status!=='CLAIMED') return res.status(400).json({ok:false,error:'not in CLAIMED'});
    const l=await Listing.findById(c.listingId);
    if(!l) return res.status(404).json({ok:false,error:'listing gone'});
    if(String(req.body.otp)!==String(l.otp)) return res.status(400).json({ok:false,error:'wrong OTP'});
    const entry = timelineEntry(req, 'picked up', 'PICKED_UP');
    c.status='PICKED_UP'; c.riderId=uid(req); c.riderName=uname(req); c.timeline.push(entry);
    await c.save();
    l.status='PICKED_UP'; l.timeline.push(entry); await l.save();

    notify({
      userIds: [l.donorId, c.ngoId, c.riderId].filter(Boolean),
      type: 'pickup_ready',
      title: 'Pickup confirmed',
      body: `"${l.title}" was picked up by ${uname(req) || 'a rider'}.`,
      entityType: 'claim', entityId: String(c._id), status: 'PICKED_UP',
      actorId: uid(req), actorName: uname(req),
    });
    statusChange('listing', l, req, entry, { title: l.title, city: l.city });
    statusChange('claim', c, req, entry, { title: l.title, city: l.city });

    res.json({ok:true,data:c});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.patch('/:id/deliver', async (req,res)=>{
  try{
    const c=await Claim.findById(req.params.id);
    if(!c) return res.status(404).json({ok:false,error:'not found'});
    if(c.status!=='PICKED_UP') return res.status(400).json({ok:false,error:'pick up first'});
    // permission gate: only the assigned rider can mark delivery (admin retains override)
    if(role(req)!=='admin' && String(c.riderId)!==uid(req)){
      return res.status(403).json({ok:false,error:'only the assigned rider can mark delivery'});
    }
    const l=await Listing.findById(c.listingId);
    const entry = timelineEntry(req, 'delivered', 'DELIVERED');
    c.status='DELIVERED'; c.timeline.push(entry);
    await c.save();
    if(l){l.status='DELIVERED'; l.timeline.push(entry); await l.save();}

    notify({
      userIds: [l && l.donorId, c.ngoId, c.riderId].filter(Boolean),
      type: 'delivery_confirmed',
      title: 'Delivery confirmed',
      body: `"${c.listingTitle || (l && l.title) || 'Your rescue'}" was delivered — ${c.qty} servings reached people.`,
      entityType: 'claim', entityId: String(c._id), status: 'DELIVERED',
      actorId: uid(req), actorName: uname(req),
    });
    if(l) statusChange('listing', l, req, entry, { title: l.title, city: l.city });
    statusChange('claim', c, req, entry, { title: c.listingTitle, city: c.city });

    res.json({ok:true,data:c});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.delete('/:id', async (req,res)=>{
  try{
    if(role(req)!=='admin') return res.status(403).json({ok:false,error:'admin only'});
    await Claim.findByIdAndDelete(req.params.id);
    res.json({ok:true,data:{deleted:true}});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

mongoose.connect(MONGO_URL).then(()=>app.listen(process.env.PORT||5003,()=>console.log('claim up'))).catch(e=>{console.error(e);process.exit(1);});
