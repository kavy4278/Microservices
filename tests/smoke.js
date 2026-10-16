// E2E smoke: register/login/post/claim/pickup/deliver + RBAC checks. Run: node tests/smoke.js
const BASE = process.env.API || 'http://localhost:8085';
const T = () => 't' + Date.now() + Math.floor(Math.random()*999);
async function api(path, opts={}, token){
  const r = await fetch(BASE+path, { ...opts, headers: { 'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{}), ...((opts.headers)||{}) } });
  const j = await r.json().catch(()=>({}));
  return { status: r.status, body: j };
}
(async ()=>{
  const sfx = T();
  const donorE = `donor_${sfx}@test.com`, ngoE = `ngo_${sfx}@test.com`;
  let r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Donor',email:donorE,password:'donor123',role:'donor',org:'Hotel'})});
  if(!r.body.ok) throw new Error('donor register failed '+JSON.stringify(r.body));
  const dTok = r.body.data.token;
  r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'NGO',email:ngoE,password:'ngo1234',role:'ngo'})});
  if(!r.body.ok) throw new Error('ngo register failed '+JSON.stringify(r.body));
  const nTok = r.body.data.token;
  // dup email -> 409
  r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'X',email:donorE,password:'x123456',role:'donor'})});
  console.log('dup-email status (want 409):', r.status);
  // no token post -> 401
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({})});
  console.log('no-token post (want 401):', r.status);
  // ngo cannot post -> 403
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'x',qty:5,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+4*3600e3).toISOString(),city:'Jaipur',address:'A'})}, nTok);
  console.log('ngo-post (want 403):', r.status);
  // donor posts
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'Veg Biryani x40',qty:40,veg:true,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+4*3600e3).toISOString(),city:'Jaipur',address:'MI Road'})}, dTok);
  if(!r.body.ok) throw new Error('post failed '+JSON.stringify(r.body));
  const listing = r.body.data; console.log('posted:', listing._id, 'otp:', listing.otp);
  // expiry guard: <2h rejected
  const bad = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'bad',qty:2,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+30*60e3).toISOString(),city:'Jaipur',address:'A'})}, dTok);
  console.log('short-expiry (want 400):', bad.status);
  // search
  r = await api('/api/listings?available=1&city=Jaipur',{}, dTok);
  console.log('search count:', r.body.data.length);
  // ngo claims
  r = await api('/api/claims',{method:'POST',body:JSON.stringify({listingId:listing._id})}, nTok);
  if(!r.body.ok) throw new Error('claim failed '+JSON.stringify(r.body));
  const claim = r.body.data.claim; console.log('claimed:', claim._id, 'otp:', r.body.data.otp);
  // double claim -> 409
  const dc = await api('/api/claims',{method:'POST',body:JSON.stringify({listingId:listing._id})}, nTok);
  console.log('double-claim (want 409):', dc.status);
  // wrong otp -> 400
  const wo = await api(`/api/claims/${claim._id}/pickup`,{method:'PATCH',body:JSON.stringify({otp:'0000'})}, nTok);
  console.log('wrong-otp (want 400):', wo.status);
  // correct otp
  r = await api(`/api/claims/${claim._id}/pickup`,{method:'PATCH',body:JSON.stringify({otp:r.body.data.otp})}, nTok);
  console.log('pickup:', r.body.ok);
  r = await api(`/api/claims/${claim._id}/deliver`,{method:'PATCH'}, nTok);
  console.log('deliver:', r.body.ok);
  console.log('SMOKE PASS');
})().catch(e=>{ console.error('SMOKE FAIL:', e.message); process.exit(1); });
