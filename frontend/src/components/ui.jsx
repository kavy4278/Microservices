import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Icon } from '../icons.jsx';

/* ----------------------------- Toast ----------------------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const item = { id, msg, title: opts.title, error: !!opts.error };
    setItems((v) => [...v, item]);
    setTimeout(() => setItems((v) => v.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.error ? ' err' : ''}`}>
            <span className="t-ico" style={{ color: t.error ? 'var(--red)' : 'var(--forest)' }}>
              <Icon name={t.error ? 'alert' : 'checkCircle'} size={20} />
            </span>
            <div>
              {t.title && <div className="t-title">{t.title}</div>}
              <div className="t-msg">{t.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ----------------------------- Buttons ----------------------------- */
export function Button({ variant = 'primary', size, icon, iconRight, className = '', children, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

/* ----------------------------- Badges ----------------------------- */
const STATUS_LABEL = {
  POSTED: 'Available', CLAIMED: 'Claimed', PENDING: 'Expiring soon',
  PICKED_UP: 'Picked up', DELIVERED: 'Delivered', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
};
export function StatusBadge({ status }) {
  const s = status || 'POSTED';
  return (
    <span className={`badge badge-${s}`}>
      <span className="pill-dot" />
      {STATUS_LABEL[s] || s}
    </span>
  );
}

/* ----------------------------- Inputs ----------------------------- */
export function Field({ label, hint, hintClass = 'hint', children }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      {children}
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  );
}

/* ----------------------------- Modal ----------------------------- */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="between mb-3">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="xCircle" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- States ----------------------------- */
export function Spinner() { return <div className="center-box"><div className="spinner" /></div>; }

export function EmptyState({ icon = 'package', title, children, action }) {
  return (
    <div className="empty">
      <div className="eye"><Icon name={icon} size={30} /></div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {children && <p className="small" style={{ maxWidth: 420, margin: '0 auto' }}>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, accent }) {
  return (
    <div className="stat">
      <div className="top">
        <span className="lbl">{label}</span>
        <span className="ico" style={accent ? { background: accent.bg, color: accent.fg } : undefined}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div className="val">{value}</div>
    </div>
  );
}

/* ----------------------------- Stepper ----------------------------- */
export function Stepper({ steps, current }) {
  const idx = steps.indexOf(current);
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span className={`step-dot${i < idx ? ' done' : ''}${i === idx ? ' current' : ''}`}>
            <i>{i < idx ? <Icon name="check" size={12} stroke={3} /> : i + 1}</i>
          </span>
          {i < steps.length - 1 && <span className={`line${i < idx ? ' done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ----------------------------- Food image w/ fallback ----------------------------- */
export function FoodImage({ src, emoji = '🍲' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="food-img">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */
export function hoursLeft(expiry) {
  if (!expiry) return null;
  return (new Date(expiry).getTime() - Date.now()) / 3600000;
}

export function ExpiryBadge({ expiry }) {
  const h = hoursLeft(expiry);
  if (h == null) return null;
  if (h <= 0) return <span className="expiry urgent"><Icon name="alert" size={13} /> Expired</span>;
  const cls = h <= 3 ? 'urgent' : h <= 8 ? 'soon' : 'ok';
  const label = h < 1 ? `${Math.max(1, Math.round(h * 60))} min left` : `${Math.floor(h)}h left`;
  return <span className={`expiry ${cls}`}><Icon name="clock" size={13} /> {label}</span>;
}

export function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
