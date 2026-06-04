import React, { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Lock, Unlock, Plus, Minus, RefreshCw, Bookmark,
  Pipette, X, Loader2,
} from 'lucide-react';
import { randomPaletteHarmony, randomPaletteHarmonyWithMeta, quickFallbackPalette, normalizeHex } from '../lib/randomInspiration';
import { generatePaletteTags } from '../lib/paletteTags';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { pickReadableTextOnHex } from '../lib/colorValues';

const MIN_COLORS = 2;
const MAX_COLORS = 10;

// randomPaletteHarmony returns { hex, ... }[] — extract to plain hex strings
function paletteToHexes(entries) {
  const list = (entries || []).map((e) => normalizeHex(e?.hex ?? e)).filter(Boolean);
  if (list.length >= MIN_COLORS) return list;
  return paletteToHexes(quickFallbackPalette(Math.max(MIN_COLORS, 5)));
}

function parseFlowHexes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => normalizeHex(typeof e === 'string' ? e : e?.hex)).filter((h) => h !== '#000000' || raw.length === 1);
}

const LOADING_PLACEHOLDER = ['#E8E6E1', '#D4D0C8', '#C9C5BC', '#BEB9B0', '#B3ADA4'];

/** Returns { hexes, meta } */
function generatePaletteWithMeta(count, harmonyId, lockedColors) {
  const { colors, meta } = randomPaletteHarmonyWithMeta(count, {
    harmonyId: harmonyId || null,
    lockedColors: lockedColors?.length ? lockedColors : null,
    maxAttempts: 20,
    minBeauty: 65,
  });
  return { hexes: paletteToHexes(colors), meta };
}

function generatePalette(count, harmonyId, lockedColors) {
  return generatePaletteWithMeta(count, harmonyId, lockedColors).hexes;
}

// ─── HSL ↔ HEX helpers ───────────────────────────────────────────────────────

function hexToHsl(hex) {
  const h = normalizeHex(hex).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let ss = 0;
  const ll = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hh = ((b - r) / d + 2) / 6; break;
      case b: hh = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) };
}

function hslToHex(h, s, l) {
  const ss = s / 100;
  const ll = l / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// ─── HSL Color Picker Panel ───────────────────────────────────────────────────

function HslColorPicker({ hex, onChange, onClose }) {
  const init = hexToHsl(hex || '#888888');
  const [h, setH] = useState(init.h);
  const [s, setS] = useState(init.s);
  const [l, setL] = useState(init.l);
  const [hexInput, setHexInput] = useState((normalizeHex(hex) || '#888888'));
  const [hexError, setHexError] = useState(false);

  const currentHex = hslToHex(h, s, l);

  useEffect(() => {
    setHexInput(currentHex);
    setHexError(false);
  }, [currentHex]);

  const applyHexInput = (raw) => {
    const clean = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
      const parsed = hexToHsl(`#${clean}`);
      setH(parsed.h);
      setS(parsed.s);
      setL(parsed.l);
      setHexError(false);
    } else {
      setHexError(true);
    }
  };

  const sliderTrack = {
    h: 'linear-gradient(to right,hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),hsl(90,100%,50%),hsl(120,100%,50%),hsl(150,100%,50%),hsl(180,100%,50%),hsl(210,100%,50%),hsl(240,100%,50%),hsl(270,100%,50%),hsl(300,100%,50%),hsl(330,100%,50%),hsl(360,100%,50%))',
    s: `linear-gradient(to right,hsl(${h},0%,${l}%),hsl(${h},100%,${l}%))`,
    l: `linear-gradient(to right,hsl(${h},${s}%,0%),hsl(${h},${s}%,50%),hsl(${h},${s}%,100%))`,
  };

  const notify = useCallback(() => {
    onChange(hslToHex(h, s, l));
  }, [h, s, l, onChange]);

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xs rounded-t-3xl bg-white p-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] shadow-2xl md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="type-h4">挑选颜色</h4>
          <button type="button" onClick={onClose} className="text-zen-ink/40 hover:text-zen-ink transition-colors">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Color preview */}
        <div
          className="mb-4 h-14 w-full rounded-xl border border-black/8 transition-colors duration-75"
          style={{ backgroundColor: currentHex }}
          aria-label={`当前颜色 ${currentHex}`}
        />

        {/* H slider */}
        <SliderRow
          label="色相 H" unit="°" value={h} min={0} max={360}
          track={sliderTrack.h}
          thumbColor={`hsl(${h},100%,50%)`}
          onChange={(v) => { setH(v); onChange(hslToHex(v, s, l)); }}
        />

        {/* S slider */}
        <SliderRow
          label="饱和度 S" unit="%" value={s} min={0} max={100}
          track={sliderTrack.s}
          thumbColor={`hsl(${h},${s}%,${l}%)`}
          onChange={(v) => { setS(v); onChange(hslToHex(h, v, l)); }}
        />

        {/* L slider */}
        <SliderRow
          label="明度 L" unit="%" value={l} min={0} max={100}
          track={sliderTrack.l}
          thumbColor={`hsl(${h},${s}%,${l}%)`}
          onChange={(v) => { setL(v); onChange(hslToHex(h, s, v)); }}
        />

        {/* Hex input */}
        <div className="mb-5 flex items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded-lg border border-black/8"
            style={{ backgroundColor: currentHex }}
          />
          <input
            type="text"
            value={hexInput}
            maxLength={7}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={(e) => applyHexInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { applyHexInput(e.target.value); e.preventDefault(); } }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-extralight font-mono tracking-widest focus:outline-none transition-colors ${
              hexError
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-zen-ink/15 bg-zen-mist/20 text-zen-ink focus:border-zen-ink/30'
            }`}
            placeholder="#RRGGBB"
            aria-label="Hex 颜色代码"
          />
        </div>

        <button
          type="button"
          onClick={() => { notify(); onClose(); }}
          className="w-full rounded-full bg-zen-ink py-3 text-[11px] font-extralight uppercase tracking-widest text-white hover:opacity-85 transition-opacity"
        >
          确认
        </button>
      </div>
    </div>
  );
}

function SliderRow({ label, unit, value, min, max, track, thumbColor, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between">
        <span className="type-overline">{label}</span>
        <span className="text-[10px] font-extralight tabular-nums text-zen-ink/60">{value}{unit}</span>
      </div>
      <div className="relative h-4 rounded-full" style={{ background: track }}>
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `calc(${pct}% - 10px)`, backgroundColor: thumbColor }}
        />
      </div>
    </div>
  );
}

// ─── Color stripe row ─────────────────────────────────────────────────────────

function ColorStripeRow({ hex, name, locked, onToggleLock, onPick, onAdd, onRemove, canAdd, canRemove }) {
  const textColor = pickReadableTextOnHex(hex);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div
      className="relative flex min-h-[3.5rem] flex-1 cursor-pointer select-none items-center transition-all duration-300"
      style={{ backgroundColor: hex }}
      onClick={() => setMenuOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setMenuOpen(true)}
      aria-label={`颜色: ${name} ${normalizeHex(hex)}`}
    >
      <div
        className="pointer-events-none ml-4 flex min-w-0 flex-col gap-0.5"
        style={{ color: textColor }}
      >
        <span className="font-zenSerif text-lg font-medium tracking-[0.12em] md:text-xl">
          {name}
        </span>
        <span className="font-mono text-[11px] font-extralight tabular-nums tracking-wider opacity-85">
          {normalizeHex(hex)}
        </span>
      </div>

      {/* Lock button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
        className="ml-auto mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all"
        style={{ backgroundColor: `${textColor}18`, color: textColor }}
        aria-label={locked ? '解锁' : '锁定'}
      >
        {locked
          ? <Lock size={13} strokeWidth={2} aria-hidden />
          : <Unlock size={13} strokeWidth={2} style={{ opacity: 0.45 }} aria-hidden />}
      </button>

      {/* Context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-36 rounded-xl border border-zen-ink/10 bg-white shadow-xl py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <CtxItem icon={<Pipette size={12} strokeWidth={2} />} label="挑选颜色" onClick={() => { setMenuOpen(false); onPick(); }} />
          {canAdd && <CtxItem icon={<Plus size={12} strokeWidth={2} />} label="加颜色" onClick={() => { setMenuOpen(false); onAdd(); }} />}
          {canRemove && <CtxItem icon={<Minus size={12} strokeWidth={2} />} label="减颜色" onClick={() => { setMenuOpen(false); onRemove(); }} />}
          <CtxItem icon={<X size={12} strokeWidth={2} />} label="取消" onClick={() => setMenuOpen(false)} dim />
        </div>
      )}
    </div>
  );
}

function CtxItem({ icon, label, onClick, dim }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight hover:bg-zen-ink/[0.04] ${dim ? 'text-zen-ink/40' : 'text-zen-ink'}`}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}

// ─── Helper: generate a single new color harmonized with existing palette ─────

function generateHarmonizedColor(existingHexes) {
  try {
    const locked = existingHexes.map((h) => ({ hex: h }));
    const count = Math.min(MAX_COLORS, existingHexes.length + 1);
    const candidates = generatePalette(count, null, locked);
    const fresh = candidates.find((h) => !existingHexes.includes(h));
    return fresh || candidates[candidates.length - 1] || '#888888';
  } catch {
    const fb = paletteToHexes(quickFallbackPalette(1));
    return fb[0] || '#888888';
  }
}

// ─── Main ShengSePage ─────────────────────────────────────────────────────────

/**
 * 生色全屏编辑页。
 * flow payload: { type: 'shengSe', hexes?: string[], source?: string }
 */
export default function ShengSePage({ flow, onBack, onNext, onSaveToFavorites }) {
  const seedHexes = parseFlowHexes(flow?.hexes);
  const hasSeed = seedHexes.length >= MIN_COLORS;

  const [hexes, setHexes] = useState(() =>
    hasSeed ? seedHexes : [...LOADING_PLACEHOLDER],
  );
  const [locked, setLocked] = useState(() =>
    Array(hasSeed ? seedHexes.length : LOADING_PLACEHOLDER.length).fill(false),
  );
  const [paletteBusy, setPaletteBusy] = useState(!hasSeed);
  const [paletteMeta, setPaletteMeta] = useState(null);
  const [pickerIdx, setPickerIdx] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  useEffect(() => {
    if (hasSeed) return undefined;
    let cancelled = false;
    const run = () => {
      try {
        const { hexes: next, meta } = generatePaletteWithMeta(5, null, null);
        if (cancelled) return;
        startTransition(() => {
          setHexes(next);
          setLocked(Array(next.length).fill(false));
          setPaletteMeta(meta);
          setPaletteBusy(false);
        });
      } catch {
        if (!cancelled) {
          const fb = paletteToHexes(quickFallbackPalette(5));
          setHexes(fb);
          setLocked(Array(fb.length).fill(false));
          setPaletteBusy(false);
        }
      }
    };
    const id = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [hasSeed]);

  useEffect(() => {
    setLocked((prev) => {
      if (prev.length === hexes.length) return prev;
      return hexes.map((_, i) => prev[i] ?? false);
    });
  }, [hexes.length]);

  // Undo/redo history (ring of hex arrays)
  const historyRef = useRef([]);
  const historyPosRef = useRef(-1);

  const pushHistory = useCallback((newHexes) => {
    const truncated = historyRef.current.slice(0, historyPosRef.current + 1);
    truncated.push([...newHexes]);
    historyRef.current = truncated.slice(-30);
    historyPosRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyPosRef.current <= 0) return;
    historyPosRef.current -= 1;
    const prev = historyRef.current[historyPosRef.current];
    if (!prev) return;
    setHexes([...prev]);
    setLocked(Array(prev.length).fill(false));
  }, []);

  const redo = useCallback(() => {
    if (historyPosRef.current >= historyRef.current.length - 1) return;
    historyPosRef.current += 1;
    const next = historyRef.current[historyPosRef.current];
    if (!next) return;
    setHexes([...next]);
    setLocked(Array(next.length).fill(false));
  }, []);

  // Regenerate — respects locked swatches
  const lockedRef = useRef(locked);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  const doRegenerate = useCallback(() => {
    if (paletteBusy) return;
    setPaletteBusy(true);
    window.setTimeout(() => {
      try {
        setHexes((prevHexes) => {
          const prevLocked = lockedRef.current;
          const lockedColors = prevHexes
            .map((h, i) => (prevLocked[i] ? { hex: h } : null))
            .filter(Boolean);
          const { hexes: newHexes, meta } = generatePaletteWithMeta(
            prevHexes.length,
            null,
            lockedColors,
          );
          setPaletteMeta(meta);
          const merged = prevHexes.map((h, i) => (prevLocked[i] ? h : newHexes[i] ?? newHexes[0]));
          pushHistory(merged);
          return merged;
        });
      } finally {
        setPaletteBusy(false);
      }
    }, 0);
  }, [pushHistory, paletteBusy]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (pickerIdx !== null) return;
      if (e.key === ' ') { e.preventDefault(); if (!paletteBusy) doRegenerate(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); undo(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [doRegenerate, undo, redo, pickerIdx]);

  const toggleLock = (idx) => {
    setLocked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const updateColor = (idx, hex) => {
    setHexes((prev) => prev.map((h, i) => (i === idx ? normalizeHex(hex) : h)));
  };

  // Add a harmony-aware color after `afterIdx`
  const addColor = (afterIdx) => {
    if (hexes.length >= MAX_COLORS) return;
    const newHex = generateHarmonizedColor(hexes);
    setHexes((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, newHex);
      pushHistory(next);
      return next;
    });
    setLocked((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, false);
      return next;
    });
  };

  const removeColor = (idx) => {
    if (hexes.length <= MIN_COLORS) return;
    setHexes((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      pushHistory(next);
      return next;
    });
    setLocked((prev) => prev.filter((_, i) => i !== idx));
    if (pickerIdx === idx) setPickerIdx(null);
  };

  const handleSave = async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      await onSaveToFavorites?.(hexes);
      setSaveToast('已收藏！');
    } catch {
      setSaveToast('保存失败');
    } finally {
      setSaveBusy(false);
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zen-ink/10 bg-white">
        <button
          type="button"
          onClick={onBack}
          className="type-flow-action hover:text-zen-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          上一页
        </button>
        <h1 className="type-flow-title">生色</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveBusy}
            className="type-flow-action text-zen-ink/50 hover:text-zen-ink transition-colors disabled:opacity-40"
            aria-label="收藏色卡"
          >
            <Bookmark size={16} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onNext?.(hexes, generatePaletteTags(hexes, paletteMeta))}
            disabled={paletteBusy}
            className="type-flow-action text-zen-vermilion hover:opacity-75 transition-opacity disabled:opacity-40"
          >
            下一页
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* Color stripes */}
      <div className="relative flex flex-1 flex-col min-h-0">
        {paletteBusy && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zen-paper/60 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm">
              <Loader2 size={16} className="animate-spin text-zen-ink/40" aria-hidden />
              <span className="text-[12px] font-extralight text-zen-ink/50">生色中…</span>
            </div>
          </div>
        )}
        {hexes.map((hex, i) => (
          <ColorStripeRow
            key={`${hex}-${i}`}
            hex={hex}
            name={getPoeticColorName(hex)}
            locked={locked[i]}
            onToggleLock={() => toggleLock(i)}
            onPick={() => setPickerIdx(i)}
            onAdd={() => addColor(i)}
            onRemove={() => removeColor(i)}
            canAdd={hexes.length < MAX_COLORS}
            canRemove={hexes.length > MIN_COLORS}
          />
        ))}
      </div>

      {/* Bottom regenerate bar */}
      <div className="shrink-0 border-t border-zen-ink/10 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={undo}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/50 hover:bg-zen-ink/[0.04] transition-colors"
            aria-label="上一个颜色"
            title="上一个 (←)"
          >
            <ChevronLeft size={17} strokeWidth={2} aria-hidden />
          </button>

          <button
            type="button"
            onClick={doRegenerate}
            disabled={paletteBusy}
            className="flex items-center gap-2 rounded-full border border-zen-ink/15 bg-white px-6 py-2.5 text-[13px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] active:scale-95 transition-all shadow-sm disabled:opacity-40"
            title="生色 (Space)"
          >
            <RefreshCw size={14} strokeWidth={2} aria-hidden />
            生色
          </button>

          <button
            type="button"
            onClick={redo}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/50 hover:bg-zen-ink/[0.04] transition-colors"
            aria-label="下一个颜色"
            title="下一个 (→)"
          >
            <ChevronRight size={17} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <p className="pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center text-[9px] font-extralight tracking-widest text-zen-ink/20 select-none">
          空格键生色 · ← → 历史
        </p>
      </div>

      {/* HSL color picker overlay */}
      {pickerIdx !== null && (
        <HslColorPicker
          hex={hexes[pickerIdx] ?? '#888888'}
          onChange={(val) => updateColor(pickerIdx, val)}
          onClose={() => setPickerIdx(null)}
        />
      )}

      {/* Save toast */}
      {saveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] rounded-full bg-zen-ink px-4 py-2 text-[12px] font-extralight text-white shadow-lg pointer-events-none">
          {saveToast}
        </div>
      )}
    </div>
  );
}
