import React, { useState } from 'react';
import { api, store } from './api.js';
import { Icon } from './icons.jsx';
import { Button, Field, useToast } from './components/ui.jsx';

const DEMO = [
  ['Donor', 'donor@test.com', 'donor123'],
  ['NGO', 'ngo@test.com', 'ngo123'],
  ['Rider', 'rider@test.com', 'rider123'],
  ['Admin', 'admin@test.com', 'admin123'],
];

export default function Auth({ initialMode = 'login', initialRole = 'donor', onAuthed, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState({ name: '', email: '', password: '', role: initialRole, org: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const data = mode === 'login'
        ? await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: f.email, password: f.password }) })
        : await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: f.name, email: f.email, password: f.password, role: f.role, org: f.org, phone: f.phone }) });
      store.set(data.user, data.token);
      toast(mode === 'login' ? 'Welcome back.' : 'Account created. Welcome to AnnBachao.', { title: 'Signed in' });
      onAuthed(data.user);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  const fillDemo = (email, password) => { setMode('login'); setF({ ...f, email, password }); setErr(''); };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <button className="brand" style={{ background: 'none', border: 0, padding: 0 }} onClick={onBack}>
          <span className="brand-mark" style={{ background: 'rgba(255,255,255,.16)' }}><Icon name="leaf" size={20} /></span>
          AnnBachao
        </button>
        <div>
          <h2>Good food deserves a second chance.</h2>
          <p style={{ color: '#cfe3d7', maxWidth: 400 }}>
            Sign in to post surplus, claim food for your NGO, or run pickups as a rider.
          </p>
          <div>
            {[
              ['shieldCheck', 'OTP-verified handovers on every rescue.'],
              ['clock', 'Expiry-aware listings keep the network honest.'],
              ['chart', 'See the meals your work puts on plates.'],
            ].map(([ico, t]) => (
              <div className="feat" key={t}><Icon name={ico} size={19} /><span>{t}</span></div>
            ))}
          </div>
        </div>
        <p className="small" style={{ color: '#9dc4ae' }}>A surplus food rescue network.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <button className="btn btn-ghost btn-sm mb-3" onClick={onBack}><Icon name="arrowRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back to home</button>
          <div className="seg">
            <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Sign in</button>
            <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>Create account</button>
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>{mode === 'login' ? 'Welcome back' : 'Join the rescue network'}</h2>
          <p className="muted small mt-1 mb-3">{mode === 'login' ? 'Sign in to your AnnBachao workspace.' : 'Pick your role and start rescuing food in minutes.'}</p>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} placeholder="Your name" required /></Field>
                <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Field label="I am a">
                      <select className="select" value={f.role} onChange={set('role')}>
                        <option value="donor">Donor</option>
                        <option value="ngo">NGO</option>
                        <option value="rider">Rider</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Field label="Organisation" hint="Optional"><input className="input" value={f.org} onChange={set('org')} placeholder="Restaurant / NGO" /></Field>
                  </div>
                </div>
              </>
            )}
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" required autoComplete="email" /></Field>
            <Field label="Password" hint={mode === 'register' ? 'At least 6 characters' : undefined}>
              <input className="input" type="password" value={f.password} onChange={set('password')} placeholder="••••••" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            {err && <p className="form-error mb-2">{err}</p>}
            <Button type="submit" className="btn-block" iconRight="arrowRight" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-4">
            <p className="muted small mb-1" style={{ fontSize: '.78rem', fontWeight: 600 }}>Try a demo account</p>
            <div className="demo-chips">
              {DEMO.map(([label, email, password]) => (
                <button key={email} className="chip" type="button" onClick={() => fillDemo(email, password)}>{label}</button>
              ))}
            </div>
            <p className="hint mt-1">Demo passwords: donor123 · ngo123 · rider123 · admin123. Register if the account doesn’t exist yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
