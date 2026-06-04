import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Pipette, X } from 'lucide-react';
import { normalizeHex } from '../lib/randomInspiration';
import { generatePaletteTags } from '../lib/paletteTags';
import { pickReadableTextOnHex } from '../lib/colorValues';

const SLOT_COUNT = 5;
const DAILY_SLOT_INDEX = 0;
const EMPTY_SLOT_HEX = '#E8E6E1';

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

function SliderRow({ label, unit, value, min, max, track, thumbColor, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between">
        <span className="type-overline">{label}</span>
        <span className="type-caption tabular-nums text-zen-ink/60">{value}{unit}</span>
      </div>
      <div className="relative h-4 rounded-full" style={{ background: track }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
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

function HslColorPicker({ hex, onChange, onClose }) {
  const init = hexToHsl(hex || EMPTY_SLOT_HEX);
  const [h, setH] = useState(init.h);
  const [s, setS] = useState(init.s);
  const [l, setL] = useState(init.l);
  const [hexInput, setHexInput] = useState(normalizeHex(hex) || EMPTY_SLOT_HEX);
  const [hexError, setHexError] = useState(false);

  const currentHex = hslToHex(h, s, l);

  React.useEffect(() => {
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

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xs rounded-t-3xl bg-white p-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] shadow-2xl md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="type-h4">挑选颜色</h4>
          <button type="button" onClick={onClose} className="text-zen-ink/40 hover:text-zen-ink">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div
          className="mb-4 h-14 w-full rounded-xl border border-black/8"
          style={{ backgroundColor: currentHex }}
        />
        <SliderRow
          label="色相 H"
          unit="°"
          value={h}
          min={0}
          max={360}
          track={sliderTrack.h}
          thumbColor={`hsl(${h},100%,50%)`}
          onChange={(v) => {
            setH(v);
            onChange(hslToHex(v, s, l));
          }}
        />
        <SliderRow
          label="饱和度 S"
          unit="%"
          value={s}
          min={0}
          max={100}
          track={sliderTrack.s}
          thumbColor={`hsl(${h},${s}%,${l}%)`}
          onChange={(v) => {
            setS(v);
            onChange(hslToHex(h, v, l));
          }}
        />
        <SliderRow
          label="明度 L"
          unit="%"
          value={l}
          min={0}
          max={100}
          track={sliderTrack.l}
          thumbColor={`hsl(${h},${s}%,${l}%)`}
          onChange={(v) => {
            setL(v);
            onChange(hslToHex(h, s, v));
          }}
        />
        <div className="mb-5 flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-lg border border-black/8" style={{ backgroundColor: currentHex }} />
          <input
            type="text"
            value={hexInput}
            maxLength={7}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={(e) => applyHexInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyHexInput(e.target.value);
                e.preventDefault();
              }
            }}
            className={`flex-1 rounded-xl border px-3 py-2 font-mono text-sm font-extralight tracking-widest focus:outline-none ${
              hexError ? 'border-red-300 bg-red-50' : 'border-zen-ink/15 bg-zen-mist/20'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(currentHex);
            onClose();
          }}
          className="w-full rounded-full bg-zen-ink py-3 text-[11px] font-extralight uppercase tracking-widest text-white hover:opacity-85"
        >
          确认
        </button>
      </div>
    </div>
  );
}

function DailyFixedStripe({ hex, name }) {
  const textColor = pickReadableTextOnHex(hex);
  return (
    <div
      className="relative flex min-h-[3.5rem] flex-1 select-none items-center"
      style={{ backgroundColor: hex }}
      aria-label={`今日色：${name} ${normalizeHex(hex)}`}
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
      <div
        className="ml-auto mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${textColor}18`, color: textColor }}
        title="今日色已锁定"
      >
        <Lock size={13} strokeWidth={2} aria-hidden />
      </div>
    </div>
  );
}

function EmptyStripe({ hex, filled, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="relative flex min-h-[3.5rem] flex-1 cursor-pointer items-center justify-center border-0 transition-colors"
      style={{ backgroundColor: hex }}
      aria-label={filled ? '已选色，点击修改' : '轻触选色'}
    >
      {!filled ? (
        <span className="flex items-center gap-1.5 text-[11px] font-extralight tracking-wide text-zen-ink/40">
          <Pipette size={13} strokeWidth={2} aria-hidden />
          轻触选色
        </span>
      ) : null}
    </button>
  );
}

function buildInitialState(dailyData) {
  const dailyHex = normalizeHex(dailyData?.hex) || '#888888';
  const hexes = Array(SLOT_COUNT).fill(EMPTY_SLOT_HEX);
  hexes[DAILY_SLOT_INDEX] = dailyHex;
  const touched = Array(SLOT_COUNT).fill(false);
  touched[DAILY_SLOT_INDEX] = true;
  return { hexes, touched, dailyHex, dailyName: dailyData?.name || '今日色' };
}

/**
 * 每日挑战 · 定制生色：今日色锁定，其余色块须自主选色后才能进入预览。
 */
export default function DailyChallengePage({ flow, onBack, onNext }) {
  const dailyData = flow?.dailyData ?? {};
  const initial = useMemo(() => buildInitialState(dailyData), [dailyData.dateKey, dailyData.hex]);

  const [hexes, setHexes] = useState(initial.hexes);
  const [touched, setTouched] = useState(initial.touched);
  const [pickerIdx, setPickerIdx] = useState(null);

  const allFilled = touched.every(Boolean);

  const updateSlot = useCallback((idx, hex) => {
    const n = normalizeHex(hex);
    if (!n || idx === DAILY_SLOT_INDEX) return;
    setHexes((prev) => prev.map((h, i) => (i === idx ? n : h)));
    setTouched((prev) => prev.map((t, i) => (i === idx ? true : t)));
  }, []);

  const paletteMeta = useMemo(
    () => ({
      styleLabel: initial.dailyName,
      category: 'design',
    }),
    [initial.dailyName],
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper overflow-hidden">
      <div className="shrink-0 flex items-center justify-between border-b border-zen-ink/10 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="type-flow-action hover:text-zen-ink"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          返回
        </button>
        <h1 className="type-flow-title">
          每日挑战
        </h1>
        <button
          type="button"
          onClick={() => onNext?.(hexes, generatePaletteTags(hexes, paletteMeta))}
          disabled={!allFilled}
          title={allFilled ? '进入预览' : '请先填满所有色块'}
          className="type-flow-action text-zen-vermilion hover:opacity-75 disabled:opacity-35"
        >
          下一页
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="shrink-0 border-b border-zen-ink/[0.06] bg-zen-mist/40 px-4 py-2.5 text-center">
        <p className="type-note text-zen-ink/50">
          今日色已固定 · 请为其余 {SLOT_COUNT - 1} 个色块自主选色（不可使用「生色」随机生成）
        </p>
        {dailyData.quote?.zh && (
          <p className="type-note mt-1.5 line-clamp-2 text-zen-ink/60">
            「{dailyData.quote.zh}」
            {dailyData.quote.zhSource && (
              <span className="type-caption mt-0.5 block">
                — {dailyData.quote.zhSource}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="relative flex flex-1 flex-col min-h-0">
        {hexes.map((hex, i) => {
          if (i === DAILY_SLOT_INDEX) {
            return (
              <DailyFixedStripe
                key="daily"
                hex={hex}
                name={initial.dailyName}
              />
            );
          }
          const isEmpty = !touched[i];
          return (
            <EmptyStripe
              key={i}
              hex={hex}
              filled={!isEmpty}
              onPick={() => setPickerIdx(i)}
            />
          );
        })}
      </div>

      {!allFilled && (
        <p className="type-note shrink-0 border-t border-zen-ink/10 bg-white px-4 py-2 text-center">
          还有 {touched.filter((t) => !t).length} 个色块待填写
        </p>
      )}

      {pickerIdx !== null && pickerIdx !== DAILY_SLOT_INDEX && (
        <HslColorPicker
          hex={hexes[pickerIdx]}
          onChange={(val) => updateSlot(pickerIdx, val)}
          onClose={() => setPickerIdx(null)}
        />
      )}
    </div>
  );
}
