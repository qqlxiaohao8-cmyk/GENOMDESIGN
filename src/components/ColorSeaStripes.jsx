import React, { useState } from 'react';
import { pickReadableTextOnHex } from '../lib/colorValues';

const FLEX_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
const FLEX_MS = 320;

/**
 * 色海专用五列色带：无表面色名；悬停时该列略展宽、中央显示 HEX（无 #）；点击复制 HEX。
 */
export default function ColorSeaStripes({
  colors,
  onCopyHex,
  hexCopyScope = '',
  copiedHexKey = null,
  className = '',
}) {
  const [hovered, setHovered] = useState(null);

  const list = Array.isArray(colors) ? colors.slice(0, 5) : [];
  while (list.length < 5) {
    list.push({ hex: '#888888', name: '—' });
  }

  const scopePrefix = hexCopyScope ? `${hexCopyScope}:` : '';

  return (
    <div
      className={`flex w-full min-h-[140px] max-h-[min(38vw,260px)] sm:max-h-[280px] aspect-[5/3] overflow-hidden rounded-xl border border-black/[0.06] ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      {list.map((c, i) => {
        const hex = typeof c.hex === 'string' ? c.hex : '#888888';
        const copyKey = `${scopePrefix}${hex}-${i}`;
        const labelColor = pickReadableTextOnHex(hex);
        const hexPlain = String(hex).replace(/^#/, '').toUpperCase();
        const isHover = hovered === i;
        const grow = hovered == null ? 1 : isHover ? 3.55 : 0.88;

        return (
          <button
            key={copyKey}
            type="button"
            onMouseEnter={() => setHovered(i)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyHex?.(hex, copyKey);
            }}
            title={String(hex).toUpperCase()}
            className={`relative min-h-0 min-w-0 border-0 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 focus-visible:z-10 ${
              hovered == null ? 'cursor-pointer transition-[filter] duration-200 hover:brightness-[0.97]' : 'cursor-pointer'
            } ${isHover ? 'z-[2] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]' : ''}`}
            style={{
              backgroundColor: hex,
              flexGrow: grow,
              flexShrink: 1,
              flexBasis: 0,
              transition: `flex-grow ${FLEX_MS}ms ${FLEX_EASE}, flex-shrink ${FLEX_MS}ms ${FLEX_EASE}, filter 200ms ease`,
            }}
            aria-label={`复制 ${hex.toUpperCase()}`}
          >
            {isHover ? (
              <span
                className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-1 text-[11px] font-mono font-semibold tabular-nums tracking-wide sm:text-xs"
                style={{ color: labelColor }}
              >
                {hexPlain}
              </span>
            ) : null}
            <span className="sr-only">{copiedHexKey === copyKey ? '已复制' : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
