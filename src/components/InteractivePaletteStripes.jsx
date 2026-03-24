import React, { useRef, useState } from 'react';
import { pickReadableTextOnHex } from '../lib/colorValues';

/**
 * Five vertical swatches with hover/focus flex-grow and centered hex label.
 * @param {{ colors: Array<{ hex?: string, name?: string }>, onCopyHex?: (hex: string, copyKey: string) => void, hexCopyScope?: string, copiedHexKey?: string|null, className?: string }} props
 */
export default function InteractivePaletteStripes({
  colors,
  onCopyHex,
  hexCopyScope = '',
  copiedHexKey = null,
  className = '',
}) {
  const [hoveredStripe, setHoveredStripe] = useState(null);
  const [focusedStripe, setFocusedStripe] = useState(null);
  const stripeRowRef = useRef(null);
  const list = Array.isArray(colors) ? colors.slice(0, 5) : [];
  while (list.length < 5) {
    list.push({ hex: '#888888', name: '—' });
  }

  const scopePrefix = hexCopyScope ? `${hexCopyScope}:` : '';
  const expandedStripe = hoveredStripe !== null ? hoveredStripe : focusedStripe;

  return (
    <div
      ref={stripeRowRef}
      className={`flex w-full aspect-video min-h-[120px] max-h-[220px] rounded-2xl overflow-hidden min-w-0 ${className}`}
      onMouseLeave={() => setHoveredStripe(null)}
    >
      {list.map((c, i) => {
        const hex = typeof c.hex === 'string' ? c.hex : '#888888';
        const copyKey = `${scopePrefix}${hex}-${i}`;
        const copied = copiedHexKey === copyKey;
        const isExpanded = expandedStripe === i;
        const flexGrow = expandedStripe === null ? 1 : isExpanded ? 3.4 : 0.42;
        const hexChars = hex.replace(/^#/, '').toUpperCase();
        const labelColor = pickReadableTextOnHex(hex);
        return (
          <button
            key={copyKey}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyHex?.(hex, copyKey);
            }}
            onMouseEnter={() => setHoveredStripe(i)}
            onFocus={() => setFocusedStripe(i)}
            onBlur={() => {
              requestAnimationFrame(() => {
                const row = stripeRowRef.current;
                if (row && !row.contains(document.activeElement)) setFocusedStripe(null);
              });
            }}
            title={`${c.name || 'Color'} — copy ${hex}`}
            className="relative h-full min-w-[6px] shrink border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/40 focus-visible:z-20 transition-[flex-grow] duration-300 ease-out motion-reduce:transition-none active:brightness-95"
            style={{
              backgroundColor: hex,
              flexGrow,
              flexShrink: 1,
              flexBasis: 0,
            }}
            aria-label={`Copy ${hex}`}
          >
            <span
              className={`pointer-events-none absolute inset-0 flex items-center justify-center px-0.5 text-[11px] sm:text-sm font-bold tabular-nums tracking-tight transition-opacity duration-200 ease-out ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: labelColor }}
              aria-hidden
            >
              {hexChars}
            </span>
            <span className="sr-only">
              {c.name || hex}
              {copied ? ' — copied' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
