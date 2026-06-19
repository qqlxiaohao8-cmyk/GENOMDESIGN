import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Lock, Unlock, Plus, Minus, RefreshCw, Bookmark,
  Pipette, X, Loader2, GripVertical,
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
function generatePaletteWithMeta(count, harmonyId, lockedColors, { fast = false } = {}) {
  const { colors, meta } = randomPaletteHarmonyWithMeta(count, {
    harmonyId: harmonyId || null,
    lockedColors: lockedColors?.length ? lockedColors : null,
    maxAttempts: fast ? 8 : 14,
    minBeauty: fast ? 60 : 65,
    skipHistory: fast,
  });
  return { hexes: paletteToHexes(colors), meta };
}

function isPlaceholderHex(hex) {
  return LOADING_PLACEHOLDER.includes(normalizeHex(hex));
}

function generatePalette(count, harmonyId, lockedColors) {
  return generatePaletteWithMeta(count, harmonyId, lockedColors).hexes;
}

function createStripeId() {
  return `stripe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function initialStripeIds(count) {
  return Array.from({ length: count }, () => createStripeId());
}

function reorderTriple(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
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

function ColorStripeRow({
  hex,
  name,
  locked,
  onToggleLock,
  onPick,
  onAdd,
  onRemove,
  canAdd,
  canRemove,
  stripeRef,
  isDragging,
  isDragOver,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  dragDisabled,
}) {
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
      ref={stripeRef}
      className={`relative flex min-h-[3.5rem] flex-1 select-none items-center transition-all duration-200 ${
        isDragging ? 'z-20 scale-[0.99] opacity-85 shadow-xl ring-2 ring-white/50' : ''
      } ${isDragOver && !isDragging ? 'ring-2 ring-inset ring-white/45' : ''}`}
      style={{ backgroundColor: hex }}
      onClick={() => !isDragging && setMenuOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setMenuOpen(true)}
      aria-label={`颜色: ${name} ${normalizeHex(hex)}`}
    >
      <button
        type="button"
        disabled={dragDisabled}
        className="flex h-full shrink-0 touch-none items-center px-2 md:px-3 disabled:cursor-default disabled:opacity-30 cursor-grab active:cursor-grabbing"
        style={{ color: textColor }}
        aria-label="拖动排序"
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={17} strokeWidth={1.5} style={{ opacity: 0.42 }} aria-hidden />
      </button>

      <div
        className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5 cursor-pointer"
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
  const saved = flow?.savedState;
  const seedHexes = parseFlowHexes(saved?.hexes ?? flow?.hexes);
  const hasSeed = seedHexes.length >= MIN_COLORS;

  const [hexes, setHexes] = useState(() =>
    hasSeed ? seedHexes : [...LOADING_PLACEHOLDER],
  );
  const [locked, setLocked] = useState(() =>
    saved?.locked?.length
      ? saved.locked
      : Array(hasSeed ? seedHexes.length : LOADING_PLACEHOLDER.length).fill(false),
  );
  const [paletteBusy, setPaletteBusy] = useState(!hasSeed);
  const [paletteMeta, setPaletteMeta] = useState(saved?.paletteMeta ?? null);
  const [pickerIdx, setPickerIdx] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  useEffect(() => {
    if (hasSeed) return undefined;
    let cancelled = false;
    const run = () => {
      try {
        const { hexes: next, meta } = generatePaletteWithMeta(5, null, null, { fast: true });
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

  // Undo/redo: full palette snapshots (hexes + locked + meta)
  const [paletteHistory, setPaletteHistory] = useState({ stack: [], index: -1 });
  const historySeededRef = useRef(false);

  const snapshotEntry = useCallback((hexList, lockList, meta) => ({
    hexes: [...hexList],
    locked: [...lockList],
    paletteMeta: meta ?? null,
  }), []);

  const applyHistoryEntry = useCallback((entry) => {
    if (!entry?.hexes?.length) return;
    setHexes([...entry.hexes]);
    setLocked([...(entry.locked ?? Array(entry.hexes.length).fill(false))]);
    setPaletteMeta(entry.paletteMeta ?? null);
  }, []);

  const appendHistory = useCallback((entry) => {
    setPaletteHistory((prev) => {
      const snap = snapshotEntry(entry.hexes, entry.locked, entry.paletteMeta);
      const truncated = prev.stack.slice(0, prev.index + 1);
      truncated.push(snap);
      const stack = truncated.slice(-30);
      return { stack, index: stack.length - 1 };
    });
  }, [snapshotEntry]);

  const canUndo = paletteHistory.index > 0;
  const canRedo = paletteHistory.index >= 0
    && paletteHistory.index < paletteHistory.stack.length - 1;

  const undo = useCallback(() => {
    setPaletteHistory((prev) => {
      if (prev.index <= 0) return prev;
      const nextIndex = prev.index - 1;
      const entry = prev.stack[nextIndex];
      if (entry) applyHistoryEntry(entry);
      return { ...prev, index: nextIndex };
    });
  }, [applyHistoryEntry]);

  const redo = useCallback(() => {
    setPaletteHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) return prev;
      const nextIndex = prev.index + 1;
      const entry = prev.stack[nextIndex];
      if (entry) applyHistoryEntry(entry);
      return { ...prev, index: nextIndex };
    });
  }, [applyHistoryEntry]);

  // Seed history synchronously once the first real palette is ready
  useLayoutEffect(() => {
    if (paletteBusy || historySeededRef.current) return;
    if (hexes.length < MIN_COLORS || hexes.every(isPlaceholderHex)) return;
    historySeededRef.current = true;
    setPaletteHistory({
      stack: [snapshotEntry(hexes, locked, paletteMeta)],
      index: 0,
    });
  }, [hexes, locked, paletteMeta, paletteBusy, snapshotEntry]);

  const hexesRef = useRef(hexes);
  const lockedRef = useRef(locked);
  const paletteMetaRef = useRef(paletteMeta);
  useEffect(() => { hexesRef.current = hexes; }, [hexes]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { paletteMetaRef.current = paletteMeta; }, [paletteMeta]);

  const doRegenerate = useCallback(() => {
    if (paletteBusy) return;
    setPaletteBusy(true);
    window.setTimeout(() => {
      try {
        const prevHexes = hexesRef.current;
        const prevLocked = lockedRef.current;
        const prevMeta = paletteMetaRef.current;
        const lockedColors = prevHexes
          .map((h, i) => (prevLocked[i] ? { hex: h } : null))
          .filter(Boolean);
        const { hexes: newHexes, meta } = generatePaletteWithMeta(
          prevHexes.length,
          null,
          lockedColors,
        );
        const merged = prevHexes.map((h, i) => (prevLocked[i] ? h : newHexes[i] ?? newHexes[0]));

        setPaletteHistory((prev) => {
          const before = snapshotEntry(prevHexes, prevLocked, prevMeta);
          const after = snapshotEntry(merged, prevLocked, meta);
          let stack = prev.stack.slice(0, Math.max(prev.index + 1, 0));
          if (!stack.length) {
            stack = [before];
          } else {
            stack[stack.length - 1] = before;
          }
          stack.push(after);
          stack = stack.slice(-30);
          return { stack, index: stack.length - 1 };
        });

        setHexes(merged);
        setPaletteMeta(meta);
      } finally {
        setPaletteBusy(false);
      }
    }, 0);
  }, [paletteBusy, snapshotEntry]);

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
    const nextHexes = [...hexes];
    nextHexes.splice(afterIdx + 1, 0, newHex);
    const nextLocked = [...lockedRef.current];
    nextLocked.splice(afterIdx + 1, 0, false);
    appendHistory({ hexes: nextHexes, locked: nextLocked, paletteMeta: paletteMetaRef.current });
    setHexes(nextHexes);
    setLocked(nextLocked);
  };

  const removeColor = (idx) => {
    if (hexes.length <= MIN_COLORS) return;
    const nextHexes = hexes.filter((_, i) => i !== idx);
    const nextLocked = lockedRef.current.filter((_, i) => i !== idx);
    appendHistory({ hexes: nextHexes, locked: nextLocked, paletteMeta: paletteMetaRef.current });
    setHexes(nextHexes);
    setLocked(nextLocked);
    if (pickerIdx === idx) setPickerIdx(null);
  };

  const canGoNext = useMemo(() => {
    if (hexes.length < MIN_COLORS) return false;
    if (!hexes.some((h) => !isPlaceholderHex(h))) return false;
    // 析色传入的配色可立即进入预览；空生色需等首盘生成完成
    if (hasSeed) return true;
    return !paletteBusy;
  }, [hexes, hasSeed, paletteBusy]);

  const handleGoNext = useCallback(() => {
    if (!canGoNext || !onNext) return;
    const meta = paletteMeta && typeof paletteMeta === 'object' ? paletteMeta : {};
    onNext(hexes, generatePaletteTags(hexes, meta), {
      hexes,
      locked,
      paletteMeta: meta,
    });
  }, [canGoNext, onNext, hexes, locked, paletteMeta]);

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
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-zen-paper">
      {/* Top bar */}
      <div className="zen-glass shrink-0 flex items-center justify-between border-b border-zen-clay/50 px-4 py-3 md:px-6">
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
            onClick={handleGoNext}
            disabled={!canGoNext}
            className="type-flow-action flex items-center gap-1 text-zen-vermilion hover:opacity-75 transition-opacity disabled:pointer-events-none disabled:opacity-40"
            title={canGoNext ? '进入预览发布' : (paletteBusy ? '生色加载中…' : '至少需要 2 种颜色')}
            aria-label="进入预览发布"
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
      <div className="zen-glass shrink-0 border-t border-zen-clay/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/50 hover:bg-zen-ink/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="上一张色卡"
            title="上一张色卡 (←)"
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
            disabled={!canRedo}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/50 hover:bg-zen-ink/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="下一张色卡"
            title="下一张色卡 (→)"
          >
            <ChevronRight size={17} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <p className="pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center text-[9px] font-extralight tracking-widest text-zen-ink/20 select-none">
          空格键生色 · ← → 切换历史色卡
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
