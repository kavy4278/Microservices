import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api, eventStreamUrl } from '../api.js';
import { Icon } from '../icons.jsx';
import {
  Button, Field, Modal, Spinner, EmptyState, StatCard, Stepper,
  StatusBadge, FoodImage, ExpiryBadge, useToast, fmt, hoursLeft,
} from '../components/ui.jsx';
import Shell from './Shell.jsx';
import PhotoInput from '../components/PhotoInput.jsx';

const localDT = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// Comfortable default expiry when the donor doesn't pick a time (fully editable).
const SAFE_WINDOW_MS = 5 * 3600000;
const fmtWhen = (ts) => {
  const d = new Date(ts), today = new Date();
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === today.toDateString() ? `today at ${t}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${t}`;
};
const NAV = {
  donor: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'post', label: 'Post surplus', icon: 'plus' },
    { key: 'mine', label: 'My listings', icon: 'list' },
    { key: 'claims', label: 'Claims received', icon: 'package' },
    { key: 'alerts', label: 'Notifications', icon: 'bell' },
  ],
  ngo: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'browse', label: 'Find food', icon: 'search' },
    { key: 'claims', label: 'My claims', icon: 'package' },
    { key: 'alerts', label: 'Notifications', icon: 'bell' },
  ],
  rider: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'claims', label: 'My pickups', icon: 'bike' },
    { key: 'alerts', label: 'Notifications', icon: 'bell' },
  ],
  admin: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'mine', label: 'All listings', icon: 'list' },
    { key: 'claims', label: 'All claims', icon: 'package' },
    { key: 'users', label: 'Users', icon: 'users' },
    { key: 'browse', label: 'Search', icon: 'search' },
    { key: 'alerts', label: 'Notifications', icon: 'bell' },
  ],
};

/* --------------------------- Food card --------------------------- */
function FoodCard({ l, children }) {
  return (
    <div className="food">
      <div style={{ position: 'relative' }}>
        <FoodImage src={l.photoUrl} emoji={l.veg === false ? '🍗' : '🥗'} />
        <span style={{ position: 'absolute', top: 12, right: 12 }}><StatusBadge status={l.status} /></span>
      </div>
      <div className="food-body">
        <div className="between">
          <span className="food-title">{l.title}</span>
          {l.status === 'POSTED' && <ExpiryBadge expiry={l.expiryAt} />}
        </div>
        <div className="food-meta">
          <span><Icon name="package" size={15} /> {l.qty} servings</span>
          <span><Icon name="leaf" size={15} /> {l.veg === false ? 'Non-veg' : 'Veg'}</span>
        </div>
        <div className="food-meta">
          <span><Icon name="mapPin" size={15} /> {l.address}, {l.city}</span>
        </div>
        <div className="food-meta">
          <span><Icon name="clock" size={15} /> Pickup by {fmt(l.expiryAt)}</span>
        </div>
        {l.donorName && <div className="food-meta"><span><Icon name="store" size={15} /> {l.donorName}</span></div>}
        {children && <div className="food-foot">{children}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Post form --------------------------- */
function PostForm({ user, onPosted }) {
  const now = new Date();
  const DEFAULT_CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Jaipur', 'Hyderabad', 'Pune', 'Ahmedabad', 'Chennai', 'Kolkata'];
  const [knownCities, setKnownCities] = useState(DEFAULT_CITIES);
  const [cityChoice, setCityChoice] = useState(user.city ? (DEFAULT_CITIES.includes(user.city) ? user.city : '__other__') : DEFAULT_CITIES[0]);
  const [customCity, setCustomCity] = useState(user.city && !DEFAULT_CITIES.includes(user.city) ? user.city : '');

  const [f, setF] = useState({
    title: '', qty: 20, veg: true,
    cookedAt: localDT(new Date(now.getTime() - 30 * 60000)),
    expiryAt: localDT(new Date(now.getTime() + 5 * 3600000)),
    city: user.city || DEFAULT_CITIES[0], address: '', phone: user.phone || '', photoUrl: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    api('/api/listings/cities').then((cities) => {
      if (Array.isArray(cities) && cities.length > 0) {
        setKnownCities(Array.from(new Set([...DEFAULT_CITIES, ...cities])).sort());
      }
    }).catch(() => {});
  }, []);

  const handleCitySelect = (val) => {
    setCityChoice(val);
    if (val === '__other__') {
      setF((prev) => ({ ...prev, city: customCity }));
    } else {
      setF((prev) => ({ ...prev, city: val }));
    }
  };

  const handleCustomCityChange = (e) => {
    const val = e.target.value;
    setCustomCity(val);
    setF((prev) => ({ ...prev, city: val }));
  };

  const [touchedExpiry, setTouchedExpiry] = useState(false);
  const expTs = f.expiryAt ? new Date(f.expiryAt).getTime() : NaN;

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const effectiveCity = (cityChoice === '__other__' ? customCity : cityChoice).trim();
      if (!f.title.trim()) throw new Error('Add a title for the food.');
      if (!effectiveCity || !f.address.trim()) throw new Error('City and pickup address are required.');

      let expiryTs = expTs;
      let payload = { ...f, city: effectiveCity, phone: f.phone };
      if (!touchedExpiry) {
        expiryTs = Date.now() + SAFE_WINDOW_MS;
        payload = { ...payload, expiryAt: localDT(new Date(expiryTs)) };
      }
      if (!Number.isFinite(expiryTs)) {
        throw new Error('Pick a safe-until time.');
      }
      if (expiryTs <= new Date(f.cookedAt).getTime()) throw new Error('Safe-until must be after the cooked time.');

      await api('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          ...payload, qty: Number(f.qty),
          cookedAt: new Date(f.cookedAt).toISOString(),
          expiryAt: new Date(expiryTs).toISOString(),
        }),
      });
      setDone('Posted — the listing is now visible to nearby NGOs.');
      toast('Surplus food posted. Nearby NGOs can now claim it.', { title: 'Listing published' });
      onPosted();
    } catch (e2) { setErr(e2.message); toast(e2.message, { error: true }); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', alignItems: 'start' }}>
      <form className="panel" style={{ padding: 24 }} onSubmit={submit}>
        <h3 className="mb-3">Post surplus food</h3>
        <p className="muted small mb-3">Give nearby NGOs a clear, time-bound offer they can act on.</p>
        <Field label="What food is it?">
          <input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Fresh vegetable biryani" maxLength={120} />
        </Field>
        <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Servings"><input className="input" type="number" min="1" max="1000" value={f.qty} onChange={set('qty')} /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Type">
              <select className="select" value={String(f.veg)} onChange={(e) => setF({ ...f, veg: e.target.value === 'true' })}>
                <option value="true">Vegetarian</option>
                <option value="false">Non-vegetarian</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="Cooked at"><input className="input" type="datetime-local" value={f.cookedAt} onChange={set('cookedAt')} /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="Safe until" hint="Pick when it is no longer fresh — editable anytime">
              <input
                className="input"
                type="datetime-local"
                value={f.expiryAt}
                onChange={(e) => { setTouchedExpiry(true); setF({ ...f, expiryAt: e.target.value }); }}
                aria-label="Safe until"
              />
            </Field>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="City">
              <select className="select" value={cityChoice} onChange={(e) => handleCitySelect(e.target.value)}>
                {knownCities.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__other__">Other…</option>
              </select>
              {cityChoice === '__other__' && (
                <input
                  className="input mt-1"
                  value={customCity}
                  onChange={handleCustomCityChange}
                  placeholder="Enter city name"
                  required
                />
              )}
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="Pickup address"><input className="input" value={f.address} onChange={set('address')} placeholder="SG Highway, Ahmedabad" /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="Contact number"><input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="+91 98765 43210" /></Field>
          </div>
        </div>
        <PhotoInput
          label="Photo"
          value={f.photoUrl}
          onChange={(v) => setF({ ...f, photoUrl: v })}
          hint="Optional — add one from your device or snap it with the camera."
        />
        {err && <p className="form-error mb-2">{err}</p>}
        <Button type="submit" icon="send" disabled={busy}>{busy ? 'Posting…' : 'Publish listing'}</Button>
      </form>

      <div className="panel" style={{ padding: 24 }}>
        <h3 className="mb-3">How your listing works</h3>
        <div className="stack gap-2">
          {[
            ['utensils', 'You post the surplus', 'Quantity, location and a safe pickup window.'],
            ['handHeart', 'An NGO claims it', 'The listing is reserved so nobody double-books.'],
            ['bike', 'A rider collects it', 'They confirm a one-time code at your door.'],
            ['checkCircle', 'It gets delivered', 'The rescue is recorded as meals served.'],
          ].map(([ico, t, d], i) => (
            <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span className="feature-ico" style={{ width: 38, height: 38, margin: 0, borderRadius: 10, flex: '0 0 auto' }}><Icon name={ico} size={18} /></span>
              <div><strong className="small">{t}</strong><div className="muted small">{d}</div></div>
            </div>
          ))}
        </div>
        {done && <p className="badge badge-delivered mt-3" style={{ display: 'block', padding: '10px 12px', borderRadius: 10 }}><Icon name="checkCircle" size={15} /> {done}</p>}
      </div>
    </div>
  );
}

/* --------------------------- OTP modal --------------------------- */
function OtpModal({ open, claim, onClose, onSubmit, busy }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  useEffect(() => { if (open) { setDigits(['', '', '', '']); setTimeout(() => refs[0].current?.focus(), 60); } }, [open]);
  const setAt = (i, v) => {
    const d = v.replace(/\D/g, '');
    const next = [...digits];
    if (d.length > 1) { d.split('').forEach((c, k) => { if (i + k < 4) next[i + k] = c; }); setDigits(next); refs[Math.min(i + d.length, 3)].current?.focus(); }
    else { next[i] = d; setDigits(next); if (d && i < 3) refs[i + 1].current?.focus(); }
  };
  const key = (i, e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus(); };
  const code = digits.join('');
  return (
    <Modal open={open} onClose={onClose} title="Confirm pickup">
      <div className="otp-panel">
        <div className="otp-shield"><Icon name="shieldCheck" size={28} /></div>
        <p className="muted small">
          Enter the 4-digit code shown to the donor for <strong>{claim?.listingTitle || 'this listing'}</strong>.
          This confirms the food changed hands.
        </p>
        {claim?.photoUrl && (
          <div className="otp-photo">
            <FoodImage src={claim.photoUrl} emoji={claim.veg === false ? '🍗' : '🥗'} />
            <p className="muted small" style={{ margin: '8px 0 0' }}>Confirm this is the food being handed over.</p>
          </div>
        )}
        {claim?.donorPhone && (
          <p className="small mb-2" style={{ color: 'var(--forest)' }}>
            <Icon name="phone" size={14} /> Contact donor: <a href={`tel:${claim.donorPhone}`} style={{ color: 'inherit', fontWeight: 600 }}>{claim.donorPhone}</a>{claim.donorName ? ` (${claim.donorName})` : ''}
          </p>
        )}
        <div className="otp-inputs">
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} className={`otp-box${d ? ' filled' : ''}`} inputMode="numeric" maxLength={4} value={d}
              onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => key(i, e)} aria-label={`Digit ${i + 1}`} />
          ))}
        </div>
        <Button className="btn-block" icon="check" disabled={code.length < 4 || busy} onClick={() => onSubmit(code)}>
          {busy ? 'Confirming…' : 'Confirm pickup'}
        </Button>
        <button className="btn btn-ghost mt-2" style={{ width: '100%' }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* --------------------------- Claim row --------------------------- */
function ClaimCard({ c, user, role, onPickup, onDeliver, onDelete }) {
  const currentRole = role || user?.role;
  const currentUserId = user?._id || user?.id;
  const steps = ['CLAIMED', 'PICKED_UP', 'DELIVERED'];
  if (c.status === 'CANCELLED') steps.push('CANCELLED');

  const isAssignedRider = currentRole === 'rider' && (!c.riderId || String(c.riderId) === String(currentUserId));
  const canPickup = (currentRole === 'rider' || currentRole === 'admin') && c.status === 'CLAIMED';
  const canDeliver = (currentRole === 'admin' || isAssignedRider) && c.status === 'PICKED_UP';
  const canDelete = currentRole === 'admin';

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="between mb-2">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <div className="claim-thumb"><FoodImage src={c.photoUrl} emoji={c.veg === false ? '🍗' : '🥗'} /></div>
          <strong style={{ fontFamily: 'var(--font-head)' }}>{c.listingTitle || 'Listing'}</strong>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="food-meta mb-3">
        <span><Icon name="package" size={15} /> {c.qty} servings</span>
        <span><Icon name="mapPin" size={15} /> {c.city}</span>
        <span><Icon name="calendar" size={15} /> {fmt(c.createdAt)}</span>
        {c.updatedAt && c.updatedAt !== c.createdAt && <span><Icon name="refresh" size={15} /> {fmt(c.updatedAt)}</span>}
      </div>
      {(c.timeline || []).length > 0 && (
        <div className="claim-timeline mb-3">
          {[...c.timeline].reverse().slice(0, 4).map((t, i) => (
            <div key={`${t.at || i}-${i}`} className="claim-timeline-row">
              <span className="claim-timeline-dot" />
              <span className="small">{t.msg ? String(t.msg).replace(/_/g, ' ') : 'update'}{t.byName ? ` · ${t.byName}` : ''}</span>
              <span className="muted small">{fmt(t.at)}</span>
            </div>
          ))}
        </div>
      )}
      {c.riderId && (
        <div className="mb-2">
          <span className="badge badge-picked" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="bike" size={13} /> Picked up by {c.riderName || 'Rider'}
          </span>
        </div>
      )}
      {(currentRole === 'ngo' || currentRole === 'rider' || currentRole === 'admin') && c.donorPhone && (
        <div className="food-meta mt-1 mb-2" style={{ color: 'var(--forest)' }}>
          <span><Icon name="phone" size={15} /> Contact donor: <a href={`tel:${c.donorPhone}`} style={{ color: 'inherit', fontWeight: 600 }}>{c.donorPhone}</a>{c.donorName ? ` (${c.donorName})` : ''}</span>
        </div>
      )}
      {(c.status === 'CLAIMED' || c.status === 'PICKED_UP') && (
        <div className="mb-3">
          <Stepper steps={steps.slice(0, 3)} current={c.status} />
        </div>
      )}
      {(currentRole === 'donor' || currentRole === 'admin') && c.otp && (
        <div className="mt-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="muted small">Pickup code</span>
          <span className="otp-display" style={{ fontSize: '1.3rem', letterSpacing: '.3em', padding: '6px 14px' }}>{c.otp}</span>
        </div>
      )}
      {(canPickup || canDeliver || canDelete) && (
        <div className="row">
          {canPickup && <Button size="sm" icon="shieldCheck" onClick={() => onPickup(c)}>Verify pickup with OTP</Button>}
          {canDeliver && <Button size="sm" icon="checkCircle" onClick={() => onDeliver(c)}>Mark delivered</Button>}
          {role === 'admin' && <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete?.(c)}>Remove</Button>}
        </div>
      )}
      {c.status === 'CLAIMED' && currentRole === 'ngo' && (
        <p className="muted small"><Icon name="hourglass" size={14} /> Waiting for a rider to collect and verify.</p>
      )}
      {c.status === 'PICKED_UP' && <p className="muted small"><Icon name="bike" size={14} /> On the way — delivery pending.</p>}
      {c.status === 'DELIVERED' && <p className="muted small" style={{ color: 'var(--forest)' }}><Icon name="checkCircle" size={14} /> Delivered. {c.qty} servings reached people.</p>}
    </div>
  );
}

/* --------------------------- Overview view --------------------------- */
function OverviewView({ user, data, loading, meals, onRefresh, onNavigate }) {
  let cards = [];
  let recent = [];
  if (user.role === 'donor') {
    const mine = data.mine || [];
    cards = [
      ['list', 'My listings', mine.length],
      ['package', 'Awaiting pickup', mine.filter((l) => l.status === 'POSTED' || l.status === 'CLAIMED').length],
      ['checkCircle', 'Delivered', mine.filter((l) => l.status === 'DELIVERED').length],
      ['handHeart', 'Meals rescued', meals],
    ];
    recent = mine.slice(0, 4);
  } else if (user.role === 'ngo') {
    const claims = data.claims || [];
    cards = [
      ['search', 'Food available now', (data.available || []).length],
      ['package', 'Active claims', claims.filter((c) => c.status === 'CLAIMED' || c.status === 'PICKED_UP').length],
      ['checkCircle', 'Delivered', claims.filter((c) => c.status === 'DELIVERED').length],
      ['handHeart', 'Meals received', meals],
    ];
    recent = (data.available || []).slice(0, 4);
  } else if (user.role === 'rider') {
    const claims = data.claims || [];
    cards = [
      ['bike', 'Open pickups', claims.filter((c) => c.status === 'CLAIMED').length],
      ['route', 'In transit', claims.filter((c) => c.status === 'PICKED_UP').length],
      ['checkCircle', 'Delivered', claims.filter((c) => c.status === 'DELIVERED').length],
      ['handHeart', 'Meals moved', meals],
    ];
    recent = claims.filter((c) => c.status !== 'DELIVERED').slice(0, 4);
  } else {
    const all = data.all || [];
    cards = [
      ['list', 'Total listings', all.length],
      ['package', 'Available now', all.filter((l) => l.status === 'POSTED').length],
      ['checkCircle', 'Delivered', all.filter((l) => l.status === 'DELIVERED').length],
      ['users', 'Members', (data.users || []).length],
    ];
    recent = all.slice(0, 4);
  }
  return (
    <div className="stack gap-2" style={{ gap: 22 }}>
      <div className="stat-grid">
        {cards.map(([ico, label, val]) => <StatCard key={label} icon={ico} label={label} value={val} />)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', alignItems: 'start' }}>
        <div className="panel" style={{ padding: 22 }}>
          <div className="between mb-3">
            <h3>{user.role === 'rider' ? 'Your active runs' : user.role === 'admin' ? 'Recent listings' : 'Recent activity'}</h3>
            <Button size="sm" variant="secondary" icon="refresh" onClick={onRefresh}>Refresh</Button>
          </div>
          {loading ? <Spinner /> : recent.length === 0 ? (
            <EmptyState icon={user.role === 'rider' ? 'bike' : 'package'} title="Nothing here yet">
              {user.role === 'donor' ? 'Post your first surplus listing to get started.' : user.role === 'admin' ? 'No listings have been created yet.' : 'New food will appear here as it is posted.'}
            </EmptyState>
          ) : (
            <div className="stack gap-2">
              {recent.map((x) => (
                <div key={x._id} className="between" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <strong className="small">{x.title || x.listingTitle}</strong>
                    <div className="muted small">{x.qty} servings · {x.city}</div>
                  </div>
                  <StatusBadge status={x.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ padding: 22 }}>
          <h3 className="mb-3">Quick actions</h3>
          <div className="stack gap-2">
            {user.role === 'donor' && <Button className="btn-block" icon="plus" onClick={() => onNavigate('post')}>Post surplus food</Button>}
            {(user.role === 'ngo' || user.role === 'admin') && <Button className="btn-block" icon="search" onClick={() => onNavigate('browse')}>Find food nearby</Button>}
            <Button variant="secondary" className="btn-block" icon="package" onClick={() => onNavigate('claims')}>
              {user.role === 'rider' ? 'View my pickups' : user.role === 'donor' ? 'Claims received' : 'View claims'}
            </Button>
            <div className="card" style={{ background: 'var(--sage)', border: 0, boxShadow: 'none' }}>
              <div className="row" style={{ gap: 10 }}>
                <Icon name="handHeart" size={20} style={{ color: 'var(--forest)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>{meals} servings</div>
                  <div className="muted small">delivered through your {user.role === 'rider' ? 'runs' : 'listings'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Browse view --------------------------- */
function BrowseView({
  user,
  items,
  loading,
  filters,
  setFilters,
  cityDropdownOpen,
  setCityDropdownOpen,
  onSearch,
  onClaim,
}) {
  const canClaim = user.role === 'ngo';
  const citiesWithFood = Array.from(new Set((items || []).map((l) => l.city).filter(Boolean))).sort();
  const matchingCities = citiesWithFood.filter((c) =>
    c.toLowerCase().includes((filters.city || '').toLowerCase())
  );

  const selectCity = (cityName) => {
    const next = { ...filters, city: cityName };
    setFilters(next);
    setCityDropdownOpen(false);
    onSearch(next);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
            <Field label="City">
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <input
                  className="input"
                  placeholder="Filter by city (e.g. Ahmedabad or Amdavad)"
                  value={filters.city}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({ ...prev, city: val }));
                    setCityDropdownOpen(true);
                  }}
                  onFocus={() => setCityDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setCityDropdownOpen(false), 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onSearch(); }
                    if (e.key === 'Escape') setCityDropdownOpen(false);
                  }}
                />
                {cityDropdownOpen && matchingCities.length > 0 && (
                  <div className="city-dropdown">
                    {matchingCities.map((c) => (
                      <div
                        key={c}
                        className="city-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectCity(c);
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>
          <div style={{ minWidth: 150 }}>
            <Field label="Food type">
              <select className="select" value={filters.veg} onChange={(e) => setFilters((prev) => ({ ...prev, veg: e.target.value }))}>
                <option value="">All food</option>
                <option value="true">Vegetarian</option>
                <option value="false">Non-vegetarian</option>
              </select>
            </Field>
          </div>
          <div style={{ paddingBottom: 14 }}><Button icon="search" onClick={() => onSearch()}>Search</Button></div>
        </div>
        {citiesWithFood.length > 0 && (
          <div className="mt-2" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="muted small" style={{ fontWeight: 600 }}>Cities with food:</span>
            <button
              type="button"
              className={`chip ${!filters.city ? 'active' : ''}`}
              onClick={() => selectCity('')}
            >
              All
            </button>
            {citiesWithFood.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${(filters.city || '').toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                onClick={() => selectCity(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState
          icon="search"
          title="No food matches yet"
          action={
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => {
                const reset = { city: '', veg: '' };
                setFilters(reset);
                onSearch(reset);
              }}
            >
              Clear filters
            </Button>
          }
        >
          Try a different city or food type. New listings appear here the moment they’re posted.
        </EmptyState>
      ) : (
        <div className="food-grid">
          {items.map((l) => (
            <FoodCard key={l._id} l={l}>
              {canClaim && l.status === 'POSTED' && <Button size="sm" icon="handHeart" onClick={() => onClaim(l._id)}>Claim</Button>}
            </FoodCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Listings view --------------------------- */
function ListingsView({ user, data, loading, onNavigate, onDelListing }) {
  const items = user.role === 'admin' ? (data.all || []) : (data.mine || []);
  const canDelete = user.role === 'donor' || user.role === 'admin';
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="between">
        <p className="muted small">{items.length} listing{items.length === 1 ? '' : 's'}{user.role === 'donor' ? ' posted by you' : ''}</p>
        {user.role === 'donor' && <Button size="sm" icon="plus" onClick={() => onNavigate('post')}>Post surplus</Button>}
      </div>
      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon="list" title="No listings yet" action={user.role === 'donor' && <Button icon="plus" onClick={() => onNavigate('post')}>Post your first listing</Button>}>
          {user.role === 'donor' ? 'Your posted surplus food will appear here.' : 'Listings created across the network will appear here.'}
        </EmptyState>
      ) : (
        <div className="food-grid">
          {items.map((l) => (
            <FoodCard key={l._id} l={l}>
              {l.otp && (
                <span className="row" style={{ gap: 8 }}>
                  <span className="muted small">Code</span>
                  <span className="mono badge badge-sage" style={{ letterSpacing: '.2em' }}>{l.otp}</span>
                </span>
              )}
              {canDelete && <Button size="sm" variant="danger" icon="xCircle" style={{ marginLeft: 'auto' }} onClick={() => onDelListing(l)}>Delete</Button>}
            </FoodCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Claims view --------------------------- */
function ClaimsView({ user, data, loading, onPickup, onDeliver, onDelClaim }) {
  const claims = data.claims || [];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <p className="muted small">
        {user.role === 'rider' ? 'Pickups assigned to the network. Verify the code at the donor, then mark delivery.'
          : user.role === 'ngo' ? 'Food you have claimed. A rider will collect it using the shared code.'
          : user.role === 'donor' ? 'Claims NGOs have made on your listings. Share the code with the rider at pickup.'
          : 'Every claim across the network.'}
      </p>
      {loading ? <Spinner /> : claims.length === 0 ? (
        <EmptyState icon="package" title="No claims yet">
          {user.role === 'ngo' ? 'Claim a listing from Find food to see it here.' : 'Claims will appear here as NGOs reserve food.'}
        </EmptyState>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))' }}>
          {claims.map((c) => (
            <ClaimCard key={c._id} c={c} user={user} role={user.role} onPickup={onPickup} onDeliver={onDeliver} onDelete={onDelClaim} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Users view --------------------------- */
function UsersView({ data, loading }) {
  const users = data.users || [];
  const roleBadge = { admin: 'badge-expired', donor: 'badge-posted', ngo: 'badge-claimed', rider: 'badge-picked' };
  return (
    <div className="stack" style={{ gap: 18 }}>
      <p className="muted small">{users.length} member{users.length === 1 ? '' : 's'} in the network</p>
      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organisation</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td className="muted">{u.email}</td>
                  <td><span className={`badge ${roleBadge[u.role] || 'badge-outline'}`}>{u.role}</span></td>
                  <td className="muted">{u.org || '—'}</td>
                  <td className="muted">{fmt(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Alerts view --------------------------- */
function AlertsView({ data, loading }) {
  const events = [];
  (data.notes || []).forEach((n) => {
    const icon = n.type === 'delivery_confirmed' ? 'checkCircle'
      : n.type === 'delivery_assigned' || n.type === 'pickup_ready' ? 'bike'
        : n.type === 'window_expiring' ? 'clock'
          : n.type === 'listing_claimed' || n.type === 'listing_posted' ? 'handHeart' : 'bell';
    events.push({
      id: n._id || `${n.type}-${n.createdAt}-${Math.random()}`,
      at: n.createdAt || n.updatedAt,
      msg: n.title || n.message || n.type || 'Activity',
      body: n.body || '',
      icon,
      unread: !n.read,
    });
  });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <p className="muted small">Activity across your Crumbly network.</p>
      {loading ? <Spinner /> : events.length === 0 ? (
        <EmptyState icon="bell" title="No activity yet">New listings, claims and deliveries will show up here.</EmptyState>
      ) : (
        <div className="panel" style={{ padding: 8 }}>
          {events.slice(0, 40).map((n) => (
            <div key={n.id} className="row" style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', background: n.unread ? 'var(--sage)' : 'transparent', borderRadius: n.unread ? 10 : 0 }}>
              <span className="feature-ico" style={{ width: 36, height: 36, margin: 0, borderRadius: 10, flex: '0 0 auto' }}><Icon name={n.icon} size={17} /></span>
              <div className="grow">
                <div className="small" style={{ textTransform: 'capitalize', fontWeight: n.unread ? 700 : 400 }}>{n.msg}</div>
                {n.body && <div className="muted small">{n.body}</div>}
                <div className="muted small">{fmt(n.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- App --------------------------- */
export default function AppHome({ user, onLogout }) {
  const toast = useToast();
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ mine: [], available: [], all: [], claims: [], users: [], notes: [] });
  const [filters, setFilters] = useState({ city: '', veg: '' });
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [otpClaim, setOtpClaim] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const refreshTimer = useRef(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true); else setRefreshing(true);
    const role = user.role;
    const next = {};
    try {
      if (role === 'donor') next.mine = await api('/api/listings?mine=1');
      else if (role === 'admin') { next.all = await api('/api/listings'); next.available = await api('/api/listings?available=1'); }
      else next.available = await api('/api/listings?available=1');
    } catch (e) { toast(e.message, { error: true }); }
    try { next.claims = await api('/api/claims'); } catch { /* noop */ }
    if (role === 'admin') { try { next.users = await api('/api/users'); } catch { /* noop */ } }
    try { next.notes = await api('/api/notify'); } catch { /* noop */ }
    setData((prev) => ({ ...prev, ...next }));
    if (next.notes) setUnread((next.notes || []).filter((n) => !n.read).length);
    setLoading(false); setRefreshing(false);
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => load(false), 450);
  }, [load]);

  const applyStatusChange = useCallback((ev) => {
    if (!ev || !ev.entityId) return;
    const patch = (arr) => (arr || []).map((x) => {
      if (x._id !== ev.entityId) return x;
      return {
        ...x,
        status: ev.status || x.status,
        updatedAt: ev.at || x.updatedAt,
        timeline: ev.timeline ? [...(x.timeline || []), ev.timeline] : x.timeline,
      };
    });
    setData((prev) => {
      if (ev.entityType === 'listing') {
        return { ...prev, mine: patch(prev.mine), available: patch(prev.available), all: patch(prev.all) };
      }
      if (ev.entityType === 'claim') return { ...prev, claims: patch(prev.claims) };
      return prev;
    });
  }, []);

  const search = async (customFilters) => {
    const f = customFilters || filters;
    const qs = new URLSearchParams({ available: '1', city: f.city || '', veg: f.veg || '' }).toString();
    try {
      setData((d) => ({ ...d, available: [] }));
      setLoading(true);
      const r = await api('/api/listings?' + qs);
      setData((d) => ({ ...d, available: r }));
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      setLoading(false);
    }
  };

  // Live notifications + status updates over one authenticated SSE connection.
  useEffect(() => {
    const url = eventStreamUrl();
    if (!url || typeof EventSource === 'undefined') return undefined;
    const es = new EventSource(url);

    es.addEventListener('notification', (e) => {
      try {
        const n = JSON.parse(e.data);
        setData((prev) => {
          const notes = prev.notes || [];
          if (n._id && notes.some((x) => x._id === n._id)) return prev;
          return { ...prev, notes: [n, ...notes].slice(0, 100) };
        });
        setUnread((u) => u + 1);
        toast(n.body || n.title || 'New notification', { title: n.title || 'Notification' });
      } catch { /* ignore malformed event */ }
    });

    es.addEventListener('status_changed', (e) => {
      try { applyStatusChange(JSON.parse(e.data)); scheduleRefresh(); } catch { /* ignore malformed event */ }
    });

    es.onerror = () => { /* EventSource reconnects automatically */ };

    return () => {
      es.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [applyStatusChange, scheduleRefresh, toast]);

  // Opening the notifications tab clears the unread badge (persisted server-side).
  useEffect(() => {
    if (view !== 'alerts' || unread === 0) return undefined;
    let alive = true;
    api('/api/notify/read-all', { method: 'PATCH' })
      .then(() => {
        if (!alive) return;
        setUnread(0);
        setData((prev) => ({ ...prev, notes: (prev.notes || []).map((n) => ({ ...n, read: true })) }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [view, unread]);

  const post = async () => { setView('mine'); load(false); };
  const claim = async (id) => {
    try { await api('/api/claims', { method: 'POST', body: JSON.stringify({ listingId: id }) }); toast('Listing claimed. A rider will confirm the pickup code.', { title: 'Claimed' }); load(false); }
    catch (e) { toast(e.message, { error: true }); }
  };
  const doPickup = async (otp) => {
    setBusy(true);
    try { await api('/api/claims/' + otpClaim._id + '/pickup', { method: 'PATCH', body: JSON.stringify({ otp }) }); toast('Pickup verified. Food is on the way.', { title: 'Confirmed' }); setOtpClaim(null); load(false); }
    catch (e) { toast(e.message, { error: true }); }
    finally { setBusy(false); }
  };
  const deliver = async (c) => {
    try {
      await api('/api/claims/' + c._id + '/deliver', { method: 'PATCH' });
      toast('Delivered. ' + c.qty + ' servings reached people.', { title: 'Rescue complete' });
      load(false);
    } catch (e) {
      if (e.message && (e.message.toLowerCase().includes('rider') || e.message.includes('403'))) {
        toast('Only the rider assigned to this pickup can confirm delivery.', { error: true });
      } else {
        toast(e.message, { error: true });
      }
    }
  };
  const delListing = async (l) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try { await api('/api/listings/' + l._id, { method: 'DELETE' }); toast('Listing deleted.', { title: 'Removed' }); load(false); }
    catch (e) { toast(e.message, { error: true }); }
  };
  const delClaim = async (c) => {
    if (!window.confirm('Remove this claim record?')) return;
    try { await api('/api/claims/' + c._id, { method: 'DELETE' }); toast('Claim removed.'); load(false); }
    catch (e) { toast(e.message, { error: true }); }
  };

  const meals = (data.claims || []).filter((c) => c.status === 'DELIVERED').reduce((a, c) => a + (c.qty || 0), 0);
  const nav = NAV[user.role] || NAV.donor;
  const title = (nav.find((n) => n.key === view) || nav[0]).label;

  const body = () => {
    switch (view) {
      case 'post': return <PostForm user={user} onPosted={post} />;
      case 'browse': return (
        <BrowseView
          user={user}
          items={data.available || []}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          cityDropdownOpen={cityDropdownOpen}
          setCityDropdownOpen={setCityDropdownOpen}
          onSearch={search}
          onClaim={claim}
        />
      );
      case 'mine': return <ListingsView user={user} data={data} loading={loading} onNavigate={setView} onDelListing={delListing} />;
      case 'claims': return <ClaimsView user={user} data={data} loading={loading} onPickup={setOtpClaim} onDeliver={deliver} onDelClaim={delClaim} />;
      case 'users': return <UsersView data={data} loading={loading} />;
      case 'alerts': return <AlertsView data={data} loading={loading} />;
      default: return <OverviewView user={user} data={data} loading={loading} meals={meals} onRefresh={() => load(false)} onNavigate={setView} />;
    }
  };

  return (
    <>
      <Shell user={user} nav={nav} active={view} onNav={setView} onLogout={onLogout} onHome={() => setView('overview')}
        title={title} onRefresh={() => load(false)} refreshing={refreshing} unread={unread}>
        {body()}
      </Shell>
      <OtpModal open={!!otpClaim} claim={otpClaim} onClose={() => setOtpClaim(null)} onSubmit={doPickup} busy={busy} />
    </>
  );
}
