import React, { useState, useEffect } from 'react';
import { store } from './api.js';
import Landing from './landing/Landing.jsx';
import Auth from './auth.jsx';
import AppHome from './app/App.jsx';

export default function App() {
  const [user, setUser] = useState(store.user);
  const [screen, setScreen] = useState(store.user ? 'app' : 'landing');
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('donor');

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const openAuth = (mode, role) => { setAuthMode(mode); if (role) setAuthRole(role); setScreen('auth'); };
  const authed = (u) => { setUser(u); setScreen('app'); };
  const logout = () => { store.clear(); setUser(null); setScreen('landing'); };

  if (screen === 'app' && user) return <AppHome user={user} onLogout={logout} />;
  if (screen === 'auth') return <Auth initialMode={authMode} initialRole={authRole} onAuthed={authed} onBack={() => setScreen('landing')} />;

  return (
    <Landing
      onSignIn={() => openAuth('login')}
      onGetStarted={(role) => openAuth('register', role)}
    />
  );
}
