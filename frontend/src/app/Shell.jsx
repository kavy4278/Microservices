import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { Button } from '../components/ui.jsx';

const ROLE_LABEL = { admin: 'Administrator', donor: 'Donor', ngo: 'NGO', rider: 'Rider' };

export default function Shell({ user, nav, active, onNav, onLogout, onHome, title, children, onRefresh, refreshing, unread = 0 }) {
  const [open, setOpen] = useState(false);
  const go = (key) => { onNav(key); setOpen(false); };
  return (
    <div className="app">
      <aside className={`side${open ? ' open' : ''}`}>
        <button className="brand" style={{ background: 'none', border: 0, padding: 0 }} onClick={onHome}>
          <span className="brand-mark"><Icon name="leaf" size={20} /></span>
          Crumbly
        </button>
        <nav className="side-nav">
          {nav.map((n) => (
            <button key={n.key} className={`side-link${active === n.key ? ' active' : ''}`} onClick={() => go(n.key)}>
              <Icon name={n.icon} size={19} />
              {n.label}
              {n.key === 'alerts' && unread > 0 && (
                <span className="nav-badge" aria-label={`${unread} unread notifications`}>{unread > 99 ? '99+' : unread}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <div className="name"><Icon name="user" size={14} /> {user.name}</div>
          <div className="role">{ROLE_LABEL[user.role] || user.role}{user.org ? ` · ${user.org}` : ''}</div>
          <button className="side-link" style={{ marginTop: 10, paddingLeft: 0 }} onClick={onLogout}>
            <Icon name="logout" size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="row">
            <button className="btn btn-secondary btn-sm topbar-toggle" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              <Icon name="menu" size={18} />
            </button>
            <h2>{title}</h2>
          </div>
          <div className="row">
            <span className="badge badge-sage">{ROLE_LABEL[user.role] || user.role}</span>
            <Button variant="secondary" size="sm" icon="refresh" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
