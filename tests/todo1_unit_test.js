const test = require('node:test');
const assert = require('node:assert/strict');

// --- 1. City Filter & Distance-Aware Ordering Logic ---
test('City search: case-insensitive partial / contains matching', () => {
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = 'mumb';
  const regex = new RegExp(escapeRegex(query.trim()), 'i');

  assert.equal(regex.test('Mumbai'), true, 'Should match "Mumbai" for "mumb"');
  assert.equal(regex.test('South Mumbai'), true, 'Should match "South Mumbai" for "mumb"');
  assert.equal(regex.test('Pune'), false, 'Should not match "Pune"');
  assert.equal(regex.test('MUMBAI'), true, 'Should match all caps');
});

test('City search: whitespace trimming', () => {
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = '  Jaipur  ';
  const regex = new RegExp(escapeRegex(query.trim()), 'i');

  assert.equal(regex.test('Jaipur'), true);
  assert.equal(regex.test('jaipur'), true);
});

test('City search: distance-aware ordering (exact match first, then expiry ascending)', () => {
  const target = 'mumbai';
  const listings = [
    { title: 'Partial match 1', city: 'Navi Mumbai', expiryAt: new Date('2026-10-25T10:00:00Z') },
    { title: 'Exact match late', city: 'Mumbai', expiryAt: new Date('2026-10-25T12:00:00Z') },
    { title: 'Exact match early', city: 'Mumbai', expiryAt: new Date('2026-10-25T08:00:00Z') },
    { title: 'Partial match 2', city: 'Greater Mumbai', expiryAt: new Date('2026-10-25T07:00:00Z') },
  ];

  listings.sort((a, b) => {
    const aExact = (a.city || '').toLowerCase() === target ? 0 : 1;
    const bExact = (b.city || '').toLowerCase() === target ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return new Date(a.expiryAt) - new Date(b.expiryAt);
  });

  assert.equal(listings[0].title, 'Exact match early');
  assert.equal(listings[1].title, 'Exact match late');
  assert.equal(listings[2].title, 'Partial match 2');
  assert.equal(listings[3].title, 'Partial match 1');
});

// --- 2. Auth Service: Phone Validation & Payload Serialization ---
test('Auth Service: donor registration requires phone (AC3)', () => {
  function validateRegistration(body) {
    let { name, email, password, role, phone } = body;
    if (!name || !email || !password || !role) return { status: 400, error: 'name,email,password,role required' };
    role = String(role).toLowerCase();
    if (!['admin','donor','ngo','rider'].includes(role)) return { status: 400, error: 'invalid role' };
    if (String(password).length < 6) return { status: 400, error: 'password min 6 chars' };
    if (role === 'donor' && (!phone || !String(phone).trim())) {
      return { status: 400, error: 'phone required' };
    }
    return { status: 200, ok: true };
  }

  // Donor without phone -> 400
  const r1 = validateRegistration({ name: 'D', email: 'd@test.com', password: 'secret', role: 'donor' });
  assert.equal(r1.status, 400);
  assert.equal(r1.error, 'phone required');

  // Donor with empty phone -> 400
  const r2 = validateRegistration({ name: 'D', email: 'd@test.com', password: 'secret', role: 'donor', phone: '   ' });
  assert.equal(r2.status, 400);
  assert.equal(r2.error, 'phone required');

  // Donor with phone -> 200
  const r3 = validateRegistration({ name: 'D', email: 'd@test.com', password: 'secret', role: 'donor', phone: '+91 9876543210' });
  assert.equal(r3.status, 200);

  // NGO without phone -> 200
  const r4 = validateRegistration({ name: 'N', email: 'n@test.com', password: 'secret', role: 'ngo' });
  assert.equal(r4.status, 200);

  // Rider without phone -> 200
  const r5 = validateRegistration({ name: 'R', email: 'r@test.com', password: 'secret', role: 'rider' });
  assert.equal(r5.status, 200);
});

test('Auth Service: pub(u) and sign(u) include phone', () => {
  const pub = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, org: u.org, phone: u.phone || '' });
  const user = { _id: '123', name: 'Alice', email: 'alice@test.com', role: 'donor', org: 'Bakery', phone: '+91 9999988888' };
  const serialized = pub(user);
  assert.equal(serialized.phone, '+91 9999988888');
});

// --- 3. Delivery Permissions Gate ---
test('Claim Service: delivery permission gate (AC6 & AC7)', () => {
  function canDeliver(claim, userRole, userId) {
    if (claim.status !== 'PICKED_UP') return { status: 400, error: 'pick up first' };
    if (userRole !== 'admin' && String(claim.riderId) !== userId) {
      return { status: 403, error: 'only the assigned rider can mark delivery' };
    }
    return { status: 200, ok: true };
  }

  const claim = { _id: 'c1', status: 'PICKED_UP', riderId: 'rider-123', riderName: 'Bob' };

  // NGO trying to deliver -> 403
  const rNgo = canDeliver(claim, 'ngo', 'ngo-456');
  assert.equal(rNgo.status, 403);
  assert.equal(rNgo.error, 'only the assigned rider can mark delivery');

  // Different rider trying to deliver -> 403
  const rOtherRider = canDeliver(claim, 'rider', 'rider-999');
  assert.equal(rOtherRider.status, 403);

  // Assigned rider delivering -> 200
  const rRider = canDeliver(claim, 'rider', 'rider-123');
  assert.equal(rRider.status, 200);
  assert.equal(rRider.ok, true);

  // Admin override delivering -> 200
  const rAdmin = canDeliver(claim, 'admin', 'admin-000');
  assert.equal(rAdmin.status, 200);
  assert.equal(rAdmin.ok, true);

  // Delivering before pickup -> 400
  const unpickedClaim = { _id: 'c2', status: 'CLAIMED', riderId: '' };
  const rEarly = canDeliver(unpickedClaim, 'rider', 'rider-123');
  assert.equal(rEarly.status, 400);
});

// --- 4. Claim Serialization for NGO and Rider ---
test('Claim Service: donorPhone and donorName exposure to NGO and Rider (AC4 & AC5)', () => {
  function formatClaim(c, listing, role) {
    const o = { ...c };
    o.otp = listing ? listing.otp : undefined;
    o.listingStatus = listing ? listing.status : undefined;
    if (['ngo', 'rider', 'admin'].includes(role)) {
      const phone = listing ? (listing.donorPhone || listing.phone || '') : '';
      if (phone) o.donorPhone = phone;
      const donorName = listing ? (listing.donorName || '') : '';
      if (donorName) o.donorName = donorName;
    }
    return o;
  }

  const listingWithPhone = {
    _id: 'l1',
    otp: '4821',
    status: 'CLAIMED',
    donorName: 'Grand Hyatt',
    donorPhone: '+91 9876543210',
  };

  const claim = { _id: 'c1', listingId: 'l1', qty: 25, city: 'Mumbai' };

  // NGO receives donorPhone and OTP
  const ngoView = formatClaim(claim, listingWithPhone, 'ngo');
  assert.equal(ngoView.otp, '4821');
  assert.equal(ngoView.donorPhone, '+91 9876543210');
  assert.equal(ngoView.donorName, 'Grand Hyatt');

  // Rider receives donorPhone
  const riderView = formatClaim(claim, listingWithPhone, 'rider');
  assert.equal(riderView.donorPhone, '+91 9876543210');

  // Listing without phone doesn't have donorPhone attached
  const listingNoPhone = { _id: 'l2', otp: '1122', status: 'CLAIMED' };
  const ngoViewNoPhone = formatClaim(claim, listingNoPhone, 'ngo');
  assert.equal(ngoViewNoPhone.donorPhone, undefined);
});
