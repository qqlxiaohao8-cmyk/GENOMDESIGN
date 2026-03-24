import React from 'react';
import { pickPaletteAccentTextColor } from '../lib/colorValues';

const STRIPE_GRID = 'grid grid-cols-[repeat(5,minmax(0,1fr))] w-full min-h-0 min-w-0';

function normalizeColors(colors) {
  const list = Array.isArray(colors) ? colors.slice(0, 5) : [];
  while (list.length < 5) {
    list.push({ hex: '#888888', name: '—' });
  }
  return list;
}

/**
 * Color card layouts:
 * - `stacked` (default): full-bleed image with five separate rounded horizontal cards, centered (~65% width),
 *   vertical stack with small gaps — hex top-left, color name below (bold), text tint from palette contrast.
 * - `stripes`: five equal vertical columns (feed-style). Non-compact: image above stripe row.
 */
export default function ColorCardLayout({
  imageSrc,
  colors,
  className = '',
  swatchOnClick,
  copiedHex = null,
  compact = false,
  layout = 'stacked',
}) {
  if (layout === 'stripes') {
    const list = normalizeColors(colors);
    const interactive = typeof swatchOnClick === 'function';
    const stripeBox = compact
      ? 'aspect-video min-h-[120px] max-h-[220px] rounded-2xl overflow-hidden'
      : 'aspect-video min-h-[160px] max-h-[min(56vh,420px)] rounded-2xl overflow-hidden';

    const stripeRow = (
      <div className={`${STRIPE_GRID} ${stripeBox}`}>
        {list.map((c, i) => {
          const hex = typeof c.hex === 'string' ? c.hex : '#888888';
          const copied = copiedHex === hex;
          const cell = (
            <>
              <span className="sr-only">
                {c.name} {hex.toUpperCase()}
                {copied ? ' — copied' : ''}
              </span>
            </>
          );
          if (interactive) {
            return (
              <button
                key={`${hex}-${i}`}
                type="button"
                onClick={() => swatchOnClick(c)}
                className="h-full min-h-0 min-w-0 w-full border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30"
                style={{ backgroundColor: hex }}
                aria-label={`Copy ${hex}`}
              >
                {cell}
              </button>
            );
          }
          return (
            <div
              key={`${hex}-${i}`}
              className="h-full min-h-0 min-w-0 w-full"
              style={{ backgroundColor: hex }}
              aria-hidden
            >
              {cell}
            </div>
          );
        })}
      </div>
    );

    if (compact) {
      return (
        <div className={`max-w-lg w-full mx-auto ${className}`}>
          {stripeRow}
        </div>
      );
    }

    return (
      <div className={`max-w-lg w-full mx-auto space-y-3 ${className}`}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="w-full max-h-56 rounded-2xl object-cover object-center border-0"
          />
        ) : null}
        {stripeRow}
      </div>
    );
  }

  /* --- stacked rounded cards on image (reference layout) --- */
  const list = normalizeColors(colors);
  const paletteHexes = list.map((c) => c.hex);
  const interactive = typeof swatchOnClick === 'function';

  const outerFrame = compact
    ? 'min-h-[280px] h-[min(360px,52vh)] flex flex-col'
    : 'h-[min(88vh,640px)] min-h-[min(88vh,640px)] flex flex-col';
  const stackPad = compact ? 'py-4 px-2' : 'py-5 md:py-7 px-2';
  const cardW = compact ? 'w-[70%] max-w-[240px]' : 'w-[65%] max-w-sm';
  const radius = compact ? 'rounded-lg' : 'rounded-xl';
  const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3.5';
  const minH = compact ? 'min-h-[48px]' : 'min-h-[72px]';
  const hexCls = compact
    ? 'text-[10px] font-medium tabular-nums tracking-tight leading-none font-bricolage'
    : 'text-xs md:text-sm font-medium tabular-nums tracking-tight leading-none font-bricolage';
  const nameCls = compact
    ? 'text-sm font-bold leading-tight text-left font-bricolage'
    : 'text-xl md:text-[26px] font-bold leading-tight text-left font-bricolage';

  const swatchInner = (c) => {
    const hex = typeof c.hex === 'string' ? c.hex : '#888888';
    const fg = pickPaletteAccentTextColor(hex, paletteHexes);
    const copied = copiedHex === hex;
    return (
      <>
        <span className={hexCls} style={{ color: fg, opacity: 0.92 }}>
          {hex.toUpperCase()}
        </span>
        <span className="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-center gap-0.5">
          <span className={nameCls} style={{ color: fg }}>
            {c.name}
          </span>
          {copied ? (
            <span className="text-[9px] font-bold uppercase tracking-wider font-bricolage" style={{ color: fg }}>
              Copied
            </span>
          ) : null}
        </span>
      </>
    );
  };

  const cardShellCls = `flex w-full min-h-0 flex-col items-stretch text-left ${pad} ${minH} ${radius} shadow-sm`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-black/10 max-w-lg w-full mx-auto ${outerFrame} ${className}`}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none" />
      ) : (
        <div className="absolute inset-0 bg-neutral-300" aria-hidden />
      )}

      <div
        className={`relative z-[1] flex flex-1 min-h-0 flex-col items-center justify-evenly ${stackPad}`}
      >
        {list.map((c, i) => {
          const hex = typeof c.hex === 'string' ? c.hex : '#888888';
          if (interactive) {
            return (
              <button
                key={`${hex}-${i}`}
                type="button"
                onClick={() => swatchOnClick(c)}
                className={`${cardW} shrink-0 ${cardShellCls} cursor-pointer border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40`}
                style={{ backgroundColor: hex }}
                aria-label={`Copy ${hex}`}
              >
                {swatchInner(c)}
              </button>
            );
          }
          return (
            <div key={`${hex}-${i}`} className={`${cardW} shrink-0 ${cardShellCls}`} style={{ backgroundColor: hex }}>
              {swatchInner(c)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
