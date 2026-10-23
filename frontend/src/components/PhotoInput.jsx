import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Button, Modal } from './ui.jsx';

/* Photos are stored as a JPEG data URL on the listing (photoUrl), so they travel inside the
   normal JSON body instead of needing a multipart upload service. Everything is downscaled
   first — a 6MB phone photo would otherwise blow past the gateway's body limit. */
const MAX_EDGE = 1400;
const QUALITY = 0.72;

function drawScaled(source, sw, sh) {
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(source, 0, 0, w, h);
  return c;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('That file is not an image.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try { resolve(drawScaled(img, img.naturalWidth, img.naturalHeight).toDataURL('image/jpeg', QUALITY)); }
      catch (e) { reject(new Error('Could not read that image — ' + e.message)); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported image format — try a JPG or PNG.')); };
    img.src = url;
  });
}

/* --------------------------- Camera capture --------------------------- */
export function CameraModal({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
  };

  useEffect(() => {
    if (!open) { stop(); return undefined; }
    let cancelled = false;
    setErr(''); setReady(false);
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access needs HTTPS or localhost.');
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false,
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); setReady(true); }
      } catch (e) {
        if (cancelled) return;
        setErr(e.name === 'NotAllowedError' ? 'Camera permission denied — allow camera access for this site.'
          : e.name === 'NotFoundError' ? 'No camera was found on this device.'
          : e.message);
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [open]);

  const attach = (el) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
      setReady(true);
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try {
      const d = drawScaled(v, v.videoWidth, v.videoHeight).toDataURL('image/jpeg', QUALITY);
      onCapture?.(d);
    } catch (e) { setErr('Capture failed — ' + e.message); }
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Take a photo">
      <div className="cam-box">
        {err ? (
          <div className="cam-err"><Icon name="alert" size={26} /><p className="small">{err}</p></div>
        ) : (
          <video ref={attach} className="cam-video" playsInline muted autoPlay />
        )}
      </div>
      {err ? (
        <Button type="button" className="btn-block" onClick={onClose}>Close</Button>
      ) : (
        <>
          <Button type="button" className="btn-block" icon="camera" disabled={!ready} onClick={capture}>
            {ready ? 'Capture photo' : 'Starting camera…'}
          </Button>
          <button type="button" className="btn btn-ghost mt-2" style={{ width: '100%' }} onClick={onClose}>Cancel</button>
        </>
      )}
    </Modal>
  );
}

/* --------------------------- Device upload + camera --------------------------- */
export default function PhotoInput({ value, onChange, label = 'Photo', hint }) {
  const fileRef = useRef(null);
  const [camOpen, setCamOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const take = async (file) => {
    setErr(''); setBusy(true);
    try { onChange(await fileToDataUrl(file)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="photo-box">
        {value ? (
          <img src={value} alt="Selected food" />
        ) : (
          <div className="photo-empty"><Icon name="image" size={26} /><span>No photo yet — optional, but helps NGOs recognise the food</span></div>
        )}
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <input
          ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) take(f); e.target.value = ''; }}
        />
        <Button type="button" variant="secondary" icon="image" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
          {value ? 'Replace photo' : 'Upload from device'}
        </Button>
        <Button type="button" variant="secondary" icon="camera" disabled={busy} onClick={() => setCamOpen(true)}>Take photo</Button>
        {value && <Button type="button" variant="ghost" size="sm" icon="trash" onClick={() => { setErr(''); onChange(''); }}>Remove</Button>}
      </div>
      {busy && <span className="hint">Processing photo…</span>}
      {err && <span className="hint hint-error">{err}</span>}
      {!err && !busy && hint && <span className="hint">{hint}</span>}
      <CameraModal open={camOpen} onClose={() => setCamOpen(false)} onCapture={(d) => { onChange(d); setErr(''); setCamOpen(false); }} />
    </div>
  );
}
