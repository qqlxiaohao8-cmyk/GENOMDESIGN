import React, { useRef, useState } from 'react';
import { hexToHsl, hslToHex } from '../lib/themeColorGuides';
import { normalizeProfileHex } from '../lib/profilePresets';

function hslToHsv(h, s, l) {
  const ss = s / 100;
  const ll = l / 100;
  const v = ll + ss * Math.min(ll, 1 - ll);
  const sat = v === 0 ? 0 : 2 * (1 - ll / v);
  return { h, s: sat * 100, v: v * 100 };
}

function hsvToHex(h, s, v) {
  const ss = s / 100;
  const vv = v / 100;
  const l = vv * (1 - ss / 2);
  const sat = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return hslToHex(h, sat * 100, l * 100);
}

export function AccentPalette({ hex, onChange, compact = false }) {
  const start = hexToHsl(hex) || { h: 348, s: 56, l: 50 };
  const hsv = hslToHsv(start.h, start.s, start.l);
  const [h, setH] = useState(hsv.h);
  const [s, setS] = useState(hsv.s);
  const [v, setV] = useState(hsv.v);
  const [text, setText] = useState(() => normalizeProfileHex(hex));
  const fieldRef = useRef(null);

  const paint = (nh, ns, nv) => {
    setH(nh);
    setS(ns);
    setV(nv);
    const next = hsvToHex(nh, ns, nv);
    setText(next);
    onChange(next);
  };

  const typeHex = (raw) => {
    const upper = String(raw || '').toUpperCase().replace(/[^#0-9A-F]/g, '');
    const body = upper.replace(/#/g, '').slice(0, 6);
    const nextText = `#${body}`;
    setText(nextText);
    if (!/^[0-9A-F]{6}$/.test(body)) return;
    const parsed = hexToHsl(`#${body}`);
    if (!parsed) return;
    const next = hslToHsv(parsed.h, parsed.s, parsed.l);
    setH(next.h);
    setS(next.s);
    setV(next.v);
    onChange(normalizeProfileHex(body));
  };

  const pickField = (clientX, clientY) => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    paint(h, x * 100, (1 - y) * 100);
  };

  return (
    <div className={compact ? 'mt-3' : 'mt-4'}>
      <div
        ref={fieldRef}
        className={`profile-palette__field${compact ? ' is-compact' : ''}`}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
        }}
        onPointerDown={(e) => {
          pickField(e.clientX, e.clientY);
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) pickField(e.clientX, e.clientY);
        }}
        role="slider"
        aria-label="色盘"
        aria-valuetext={hex}
      >
        <span
          className="profile-palette__thumb"
          style={{ left: `${s}%`, top: `${100 - v}%` }}
        />
      </div>
      <input
        type="range"
        className="profile-palette__hue"
        min="0"
        max="360"
        value={Math.round(h)}
        aria-label="色相"
        onChange={(e) => paint(Number(e.target.value), s, v)}
      />
      <input
        type="text"
        className="profile-palette__hex"
        value={text}
        maxLength={7}
        spellCheck={false}
        autoCapitalize="characters"
        aria-label="色号"
        onChange={(e) => typeHex(e.target.value)}
      />
    </div>
  );
}

export function AccentColorDialog({
  hex,
  name,
  busy,
  message,
  onChange,
  onNameChange,
  onConfirm,
  onClose,
}) {
  return (
    <div className="accent-pick" onClick={onClose}>
      <div
        className="accent-pick__card"
        role="dialog"
        aria-modal="true"
        aria-label="编辑档案"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="heytea-ink-card-fill flex flex-col">
          <h2 className="type-h2">编辑档案</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value.slice(0, 20))}
            placeholder="输入名称"
            className="zen-input mt-3"
            autoComplete="nickname"
            aria-label="名称"
            maxLength={20}
          />
          <AccentPalette hex={normalizeProfileHex(hex)} onChange={onChange} compact />
          {message ? <p className="type-body-sm mt-3 text-zen-vermilion">{message}</p> : null}
          <div className="mt-auto flex justify-end pt-4">
            <button
              type="button"
              className="zen-action disabled:opacity-40"
              disabled={busy || !String(name || '').trim()}
              onClick={onConfirm}
            >
              {busy ? '保存中' : '选好了'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
