const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/maindb';

const listingSchema = new mongoose.Schema({
  donorId: String, donorName: String, title: String, qty: Number, veg: Boolean,
  cookedAt: Date, expiryAt: Date, city: String, address: String,
  photoUrl: String, status: String, otp: String, phone: String, donorPhone: String,
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

app.get('/health',(req,res)=>res.json({ok:true,service:'claim'}));

app.post('/', async (req,res)=>{
  try{
    const r = role(req);
    if(!['ngo','admin'].includes(r)) return res.status(403).json({ok:false,error:'ngo only'});
    const { listingId } = req.body;
    if(!listingId) return res.status(400).json({ok:false,error:'listingId required'});
    const l = await Listing.findById(listingId);
    if(!l) return res.status(404).json({ok:false,error:'listing not found'});
    if(l.status!=='POSTED') return res.status(409).json({ok:false,error:'already '+l.status});
    if(new Date(l.expiryAt) < new Date()) return res.status(400).json({ok:false,error:'expired'});
    const existing = await Claim.findOne({ listingId, status: { $in:['CLAIMED','PICKED_UP'] } });
    if(existing) return res.status(409).json({ok:false,error:'already claimed'});
    const c = await Claim.create({ listingId, listingTitle:l.title, qty:l.qty, city:l.city, ngoId:uid(req), ngoName:uname(req), timeline:[{at:new Date(),by:uid(req),msg:'claimed'}] });
    l.status='CLAIMED'; await l.save();
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
    // attach OTP for display (lookup listings)
    const out=[];
    for(const c of docs){
      const o=c.toObject(); const l=await Listing.findById(c.listingId);
      o.otp = l?l.otp:undefined; o.listingStatus=l?l.status:undefined;
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
  const c=await Claim.findById(req.params.id);
  if(!c) return res.status(404).json({ok:false,error:'not found'});
  if(c.status!=='CLAIMED') return res.status(400).json({ok:false,error:'not in CLAIMED'});
  const l=await Listing.findById(c.listingId);
  if(!l) return res.status(404).json({ok:false,error:'listing gone'});
  if(String(req.body.otp)!==String(l.otp)) return res.status(400).json({ok:false,error:'wrong OTP'});
  c.status='PICKED_UP'; c.riderId=uid(req); c.riderName=uname(req); c.timeline.push({at:new Date(),by:uid(req),msg:'picked up'});
  await c.save(); l.status='PICKED_UP'; await l.save();
  res.json({ok:true,data:c});
});

app.patch('/:id/deliver', async (req,res)=>{
  const c=await Claim.findById(req.params.id);
  if(!c) return res.status(404).json({ok:false,error:'not found'});
  if(c.status!=='PICKED_UP') return res.status(400).json({ok:false,error:'pick up first'});
  // permission gate: only the assigned rider can mark delivery (admin retains override)
  if(role(req)!=='admin' && String(c.riderId)!==uid(req)){
    return res.status(403).json({ok:false,error:'only the assigned rider can mark delivery'});
  }
  c.status='DELIVERED'; c.timeline.push({at:new Date(),by:uid(req),msg:'delivered'});
  await c.save();
  const l=await Listing.findById(c.listingId); if(l){l.status='DELIVERED'; await l.save();}
  res.json({ok:true,data:c});
});

app.delete('/:id', async (req,res)=>{
  if(role(req)!=='admin') return res.status(403).json({ok:false,error:'admin only'});
  await Claim.findByIdAndDelete(req.params.id);
  res.json({ok:true,data:{deleted:true}});
});

mongoose.connect(MONGO_URL).then(()=>app.listen(process.env.PORT||5003,()=>console.log('claim up'))).catch(e=>{console.error(e);process.exit(1);});
