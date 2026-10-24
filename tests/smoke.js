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
  const donorE = `donor_${sfx}@test.com`, ngoE = `ngo_${sfx}@test.com`, riderE = `rider_${sfx}@test.com`;

  // AC3: Donor registers without phone -> 400 "phone required"
  const noPhone = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'NoPhone',email:`bad_${sfx}@test.com`,password:'donor123',role:'donor'})});
  console.log('donor-no-phone (want 400):', noPhone.status);
  if (noPhone.status !== 400) throw new Error('AC3 failed: donor without phone must return 400');

  // Donor registers with phone
  let r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Donor',email:donorE,password:'donor123',role:'donor',org:'Hotel',phone:'+91 9876543210'})});
  if(!r.body.ok) throw new Error('donor register failed '+JSON.stringify(r.body));
  const dTok = r.body.data.token;

  // NGO registers
  r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'NGO',email:ngoE,password:'ngo1234',role:'ngo'})});
  if(!r.body.ok) throw new Error('ngo register failed '+JSON.stringify(r.body));
  const nTok = r.body.data.token;

  // Rider registers
  r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Rider Dev',email:riderE,password:'rider123',role:'rider'})});
  if(!r.body.ok) throw new Error('rider register failed '+JSON.stringify(r.body));
  const rTok = r.body.data.token;

  // dup email -> 409
  r = await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'X',email:donorE,password:'x123456',role:'donor',phone:'+91 9876543210'})});
  console.log('dup-email status (want 409):', r.status);

  // no token post -> 401
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({})});
  console.log('no-token post (want 401):', r.status);

  // ngo cannot post -> 403
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'x',qty:5,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+4*3600e3).toISOString(),city:'Jaipur',address:'A'})}, nTok);
  console.log('ngo-post (want 403):', r.status);

  // donor posts (AC2)
  r = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'Veg Biryani x40',qty:40,veg:true,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+4*3600e3).toISOString(),city:'Jaipur',address:'MI Road'})}, dTok);
  if(!r.body.ok) throw new Error('post failed '+JSON.stringify(r.body));
  const listing = r.body.data; console.log('posted:', listing._id, 'otp:', listing.otp);

  // expiry guard: <2h rejected
  const bad = await api('/api/listings',{method:'POST',body:JSON.stringify({title:'bad',qty:2,cookedAt:new Date().toISOString(),expiryAt:new Date(Date.now()+30*60e3).toISOString(),city:'Jaipur',address:'A'})}, dTok);
  console.log('short-expiry (want 400):', bad.status);

  // search: exact city
  r = await api('/api/listings?available=1&city=Jaipur',{}, dTok);
  console.log('exact search count:', r.body.data?.length);

  // AC1: search: partial city (e.g. "jaip")
  r = await api('/api/listings?available=1&city=jaip',{}, dTok);
  console.log('partial search count (want >= 1):', r.body.data?.length);
  if (!r.body.data || r.body.data.length === 0) throw new Error('AC1 failed: partial city search returned 0 results');

  // distinct cities endpoint check
  const citiesRes = await api('/api/listings/cities', {}, dTok);
  console.log('distinct cities:', citiesRes.body.data);

  // ngo claims
  r = await api('/api/claims',{method:'POST',body:JSON.stringify({listingId:listing._id})}, nTok);
  if(!r.body.ok) throw new Error('claim failed '+JSON.stringify(r.body));
  const claim = r.body.data.claim; const claimOtp = r.body.data.otp;
  console.log('claimed:', claim._id, 'otp:', claimOtp);

  // AC4: NGO sees donorPhone + OTP on claim
  const ngoClaims = await api('/api/claims', {}, nTok);
  const myClaimNgo = ngoClaims.body.data?.find(c => c._id === claim._id);
  console.log('ngo claim donorPhone:', myClaimNgo?.donorPhone, 'otp:', myClaimNgo?.otp);
  if (!myClaimNgo?.donorPhone) throw new Error('AC4 failed: claimed listing does not expose donorPhone to NGO');

  // double claim -> 409
  const dc = await api('/api/claims',{method:'POST',body:JSON.stringify({listingId:listing._id})}, nTok);
  console.log('double-claim (want 409):', dc.status);

  // wrong otp -> 400
  const wo = await api(`/api/claims/${claim._id}/pickup`,{method:'PATCH',body:JSON.stringify({otp:'0000'})}, rTok);
  console.log('wrong-otp (want 400):', wo.status);

  // AC5: Rider picks up with correct OTP
  r = await api(`/api/claims/${claim._id}/pickup`,{method:'PATCH',body:JSON.stringify({otp:claimOtp})}, rTok);
  console.log('rider pickup:', r.body.ok);
  if (!r.body.ok) throw new Error('rider pickup failed');

  // AC5: Rider sees donor phone on claim
  const riderClaims = await api('/api/claims', {}, rTok);
  const myClaimRider = riderClaims.body.data?.find(c => c._id === claim._id);
  console.log('rider claim donorPhone:', myClaimRider?.donorPhone);
  if (!myClaimRider?.donorPhone) throw new Error('AC5 failed: claimed listing does not expose donorPhone to Rider');

  // AC6: NGO (not the rider) clicks "Mark delivered" -> 403 Forbidden
  const ngoDeliver = await api(`/api/claims/${claim._id}/deliver`,{method:'PATCH'}, nTok);
  console.log('ngo deliver status (want 403):', ngoDeliver.status);
  if (ngoDeliver.status !== 403) throw new Error('AC6 failed: NGO calling deliver did not return 403');

  // AC7: Rider clicks "Mark delivered" on their own pickup -> 200 OK
  r = await api(`/api/claims/${claim._id}/deliver`,{method:'PATCH'}, rTok);
  console.log('rider deliver:', r.body.ok);
  if (!r.body.ok) throw new Error('AC7 failed: rider deliver failed');

  console.log('SMOKE PASS — All Todo-1 acceptance criteria verified');
})().catch(e=>{ console.error('SMOKE FAIL:', e.message); process.exit(1); });
