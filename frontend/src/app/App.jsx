import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import {
  Button, Field, Modal, Spinner, EmptyState, StatCard, Stepper,
  StatusBadge, FoodImage, ExpiryBadge, useToast, fmt, hoursLeft,
} from '../components/ui.jsx';
import Shell from './Shell.jsx';

const localDT = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
  const [f, setF] = useState({
    title: '', qty: 20, veg: true,
    cookedAt: localDT(new Date(now.getTime() - 30 * 60000)),
    expiryAt: localDT(new Date(now.getTime() + 5 * 3600000)),
    city: user.city || '', address: '', photoUrl: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (!f.title.trim()) throw new Error('Add a title for the food.');
      if (!f.city.trim() || !f.address.trim()) throw new Error('City and pickup address are required.');
      const exp = new Date(f.expiryAt).getTime();
      if (exp < Date.now() + 2 * 3600000) throw new Error('Pickup window must end at least 2 hours from now.');
      await api('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          ...f, qty: Number(f.qty),
          cookedAt: new Date(f.cookedAt).toISOString(),
          expiryAt: new Date(f.expiryAt).toISOString(),
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
            <Field label="Safe until" hint="At least 2 hours from now">
              <input className="input" type="datetime-local" value={f.expiryAt} onChange={set('expiryAt')} />
            </Field>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="City"><input className="input" value={f.city} onChange={set('city')} placeholder="e.g. Mumbai" /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="Pickup address"><input className="input" value={f.address} onChange={set('address')} placeholder="Street, area" /></Field>
          </div>
        </div>
        <Field label="Photo URL" hint="Optional — helps NGOs recognise the food">
          <input className="input" value={f.photoUrl} onChange={set('photoUrl')} placeholder="https://…" />
        </Field>
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
function ClaimCard({ c, role, onPickup, onDeliver, onDelete }) {
  const steps = ['CLAIMED', 'PICKED_UP', 'DELIVERED'];
  if (c.status === 'CANCELLED') steps.push('CANCELLED');
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="between mb-2">
        <strong style={{ fontFamily: 'var(--font-head)' }}>{c.listingTitle || 'Listing'}</strong>
        <StatusBadge status={c.status} />
      </div>
      <div className="food-meta mb-3">
        <span><Icon name="package" size={15} /> {c.qty} servings</span>
        <span><Icon name="mapPin" size={15} /> {c.city}</span>
        <span><Icon name="calendar" size={15} /> {fmt(c.createdAt)}</span>
      </div>
      {(c.status === 'CLAIMED' || c.status === 'PICKED_UP') && (
        <div className="mb-3">
          <Stepper steps={steps.slice(0, 3)} current={c.status} />
        </div>
      )}
      {(role === 'donor' || role === 'admin') && c.otp && (
        <div className="mt-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="muted small">Pickup code</span>
          <span className="otp-display" style={{ fontSize: '1.3rem', letterSpacing: '.3em', padding: '6px 14px' }}>{c.otp}</span>
        </div>
      )}
      {(role === 'rider' || role === 'ngo' || role === 'admin') && (
        <div className="row">
          {c.status === 'CLAIMED' && <Button size="sm" icon="shieldCheck" onClick={() => onPickup(c)}>Verify pickup with OTP</Button>}
          {c.status === 'PICKED_UP' && <Button size="sm" icon="checkCircle" onClick={() => onDeliver(c)}>Mark delivered</Button>}
          {role === 'admin' && <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete?.(c)}>Remove</Button>}
        </div>
      )}
      {c.status === 'CLAIMED' && role === 'ngo' && (
        <p className="muted small"><Icon name="hourglass" size={14} /> Waiting for a rider to collect and verify.</p>
      )}
      {c.status === 'PICKED_UP' && <p className="muted small"><Icon name="bike" size={14} /> On the way — delivery pending.</p>}
      {c.status === 'DELIVERED' && <p className="muted small" style={{ color: 'var(--forest)' }}><Icon name="checkCircle" size={14} /> Delivered. {c.qty} servings reached people.</p>}
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
  const [otpClaim, setOtpClaim] = useState(null);
  const [busy, setBusy] = useState(false);

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
    setLoading(false); setRefreshing(false);
  }, [user.role]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const search = async () => {
    const qs = new URLSearchParams({ available: '1', city: filters.city, veg: filters.veg }).toString();
    try { setData((d) => ({ ...d, available: [] })); setLoading(true); const r = await api('/api/listings?' + qs); setData((d) => ({ ...d, available: r })); }
    catch (e) { toast(e.message, { error: true }); }
    finally { setLoading(false); }
  };

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
    try { await api('/api/claims/' + c._id + '/deliver', { method: 'PATCH' }); toast('Delivered. ' + c.qty + ' servings reached people.', { title: 'Rescue complete' }); load(false); }
    catch (e) { toast(e.message, { error: true }); }
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

  /* -------- Overview -------- */
  const Overview = () => {
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
              <Button size="sm" variant="secondary" icon="refresh" onClick={() => load(false)}>Refresh</Button>
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
              {user.role === 'donor' && <Button className="btn-block" icon="plus" onClick={() => setView('post')}>Post surplus food</Button>}
              {(user.role === 'ngo' || user.role === 'admin') && <Button className="btn-block" icon="search" onClick={() => setView('browse')}>Find food nearby</Button>}
              <Button className="btn-block btn-secondary" icon="package" onClick={() => setView('claims')}>
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
  };

  /* -------- Browse -------- */
  const Browse = () => {
    const items = data.available || [];
    const canClaim = user.role === 'ngo' || user.role === 'admin';
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div className="panel" style={{ padding: 16 }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Field label="City"><input className="input" placeholder="Filter by city" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && search()} /></Field>
            </div>
            <div style={{ minWidth: 150 }}>
              <Field label="Food type">
                <select className="select" value={filters.veg} onChange={(e) => setFilters({ ...filters, veg: e.target.value })}>
                  <option value="">All food</option>
                  <option value="true">Vegetarian</option>
                  <option value="false">Non-vegetarian</option>
                </select>
              </Field>
            </div>
            <div style={{ paddingBottom: 14 }}><Button icon="search" onClick={search}>Search</Button></div>
          </div>
        </div>
        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState icon="search" title="No food matches yet" action={<Button variant="secondary" icon="refresh" onClick={() => { setFilters({ city: '', veg: '' }); setTimeout(search, 0); }}>Clear filters</Button>}>
            Try a different city or food type. New listings appear here the moment they’re posted.
          </EmptyState>
        ) : (
          <div className="food-grid">
            {items.map((l) => (
              <FoodCard key={l._id} l={l}>
                {canClaim && l.status === 'POSTED' && <Button size="sm" icon="handHeart" onClick={() => claim(l._id)}>Claim</Button>}
              </FoodCard>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* -------- My / All listings -------- */
  const Listings = () => {
    const items = user.role === 'admin' ? (data.all || []) : (data.mine || []);
    const canDelete = user.role === 'donor' || user.role === 'admin';
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div className="between">
          <p className="muted small">{items.length} listing{items.length === 1 ? '' : 's'}{user.role === 'donor' ? ' posted by you' : ''}</p>
          {user.role === 'donor' && <Button size="sm" icon="plus" onClick={() => setView('post')}>Post surplus</Button>}
        </div>
        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState icon="list" title="No listings yet" action={user.role === 'donor' && <Button icon="plus" onClick={() => setView('post')}>Post your first listing</Button>}>
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
                {canDelete && <Button size="sm" variant="danger" icon="xCircle" style={{ marginLeft: 'auto' }} onClick={() => delListing(l)}>Delete</Button>}
              </FoodCard>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* -------- Claims -------- */
  const Claims = () => {
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
              <ClaimCard key={c._id} c={c} role={user.role} onPickup={setOtpClaim} onDeliver={deliver} onDelete={delClaim} />
            ))}
          </div>
        )}
      </div>
    );
  };

  /* -------- Users -------- */
  const Users = () => {
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
  };

  /* -------- Notifications -------- */
  const Alerts = () => {
    const events = [];
    (data.claims || []).forEach((c) => {
      (c.timeline || []).forEach((t, i) => events.push({
        id: `${c._id}-t${i}`, at: t.at,
        msg: `${c.listingTitle || 'Listing'} — ${t.msg}`,
        icon: t.msg === 'delivered' ? 'checkCircle' : t.msg === 'picked up' ? 'bike' : 'handHeart',
      }));
      if (!(c.timeline || []).length) events.push({ id: c._id, at: c.createdAt, msg: `Claim on ${c.listingTitle || 'a listing'}`, icon: 'handHeart' });
    });
    (data.notes || []).forEach((n) => events.push({ id: n._id || Math.random(), at: n.createdAt, msg: n.message || n.type || 'Activity', icon: 'bell' }));
    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    return (
      <div className="stack" style={{ gap: 18 }}>
        <p className="muted small">Activity across your AnnBachao network.</p>
        {loading ? <Spinner /> : events.length === 0 ? (
          <EmptyState icon="bell" title="No activity yet">New listings, claims and deliveries will show up here.</EmptyState>
        ) : (
          <div className="panel" style={{ padding: 8 }}>
            {events.slice(0, 40).map((n) => (
              <div key={n.id} className="row" style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                <span className="feature-ico" style={{ width: 36, height: 36, margin: 0, borderRadius: 10, flex: '0 0 auto' }}><Icon name={n.icon} size={17} /></span>
                <div className="grow">
                  <div className="small" style={{ textTransform: 'capitalize' }}>{n.msg}</div>
                  <div className="muted small">{fmt(n.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const body = () => {
    switch (view) {
      case 'post': return <PostForm user={user} onPosted={post} />;
      case 'browse': return <Browse />;
      case 'mine': return <Listings />;
      case 'claims': return <Claims />;
      case 'users': return <Users />;
      case 'alerts': return <Alerts />;
      default: return <Overview />;
    }
  };

  return (
    <>
      <Shell user={user} nav={nav} active={view} onNav={setView} onLogout={onLogout} onHome={() => setView('overview')}
        title={title} onRefresh={() => load(false)} refreshing={refreshing}>
        {body()}
      </Shell>
      <OtpModal open={!!otpClaim} claim={otpClaim} onClose={() => setOtpClaim(null)} onSubmit={doPickup} busy={busy} />
    </>
  );
}
