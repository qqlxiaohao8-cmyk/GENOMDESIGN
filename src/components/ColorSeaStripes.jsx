import React, { useMemo, useState } from 'react';
import { pickPaletteAccentTextColor, pickReadableTextOnHex } from '../lib/colorValues';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { isChineseDominantText } from '../lib/paletteChineseDisplay';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#888888';
  return `#${s.toUpperCase()}`;
}

function stripeLabel(c) {
  const raw = String(c?.name || '').trim();
  const name = isChineseDominantText(raw) ? raw : getPoeticColorName(c?.hex);
  return String(name).replace(/\s/g, '').slice(0, 2);
}

/** 色海 / 收藏 feed 统一色条高度（列宽变化时高度不变） */
export const PALETTE_FEED_STRIPE_HEIGHT_CLASS =
  'h-[7.25rem] min-h-[7.25rem] max-h-[7.25rem] sm:h-[8.5rem] sm:min-h-[8.5rem] sm:max-h-[8.5rem]';

/**
 * 色海色卡条：色条即色样。点一下复制 hex，悬停展开并露出二字名。
 */
export default function ColorSeaStripes({
  colors,
  onCopyHex,
  hexCopyScope = '',
  copiedHexKey = null,
  onActiveChange,
  className = '',
}) {
  const [hovered, setHovered] = useState(null);

  const list = useMemo(() => {
    const row = Array.isArray(colors) ? colors.slice(0, 10) : [];
    if (row.length >= 2) return row;
    return [{ hex: '#D4C5B0', name: '素灰' }, { hex: '#8A7560', name: '褐石' }];
  }, [colors]);

  const hexList = useMemo(() => list.map((c) => normalizeHex(c.hex)), [list]);
  const scopePrefix = hexCopyScope ? `${hexCopyScope}:` : '';

  const setActive = (index) => {
    setHovered(index);
    if (!onActiveChange) return;
    if (index == null) {
      onActiveChange(null);
      return;
    }
    const c = list[index];
    onActiveChange({
      index,
      hex: normalizeHex(c?.hex),
      name: stripeLabel(c),
    });
  };

  return (
    <div
      className={`zen-stripe-row flex w-full overflow-hidden ${PALETTE_FEED_STRIPE_HEIGHT_CLASS} ${className}`}
      onMouseLeave={() => setActive(null)}
    >
      {list.map((c, i) => {
        const hex = normalizeHex(c.hex);
        const copyKey = `${scopePrefix}${hex}-${i}`;
        const name = stripeLabel(c);
        const nameColor = pickPaletteAccentTextColor(hex, hexList);
        const hexColor = pickReadableTextOnHex(hex);
        const copied = copiedHexKey === copyKey;
        const showName = hovered === i || copied;
        const grow = hovered == null ? 1 : hovered === i ? 1.55 : 0.72;

        return (
          <button
            key={copyKey}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActive(i);
              onCopyHex?.(hex, copyKey);
            }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className="zen-stripe relative min-h-0 min-w-0 border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 focus-visible:z-10"
            style={{
              backgroundColor: hex,
              flexGrow: grow,
              flexShrink: 1,
              flexBasis: 0,
            }}
            aria-label={`复制 ${name} ${hex}`}
          >
            <span
              className={`pointer-events-none absolute inset-x-0 top-[16%] bottom-[34%] flex items-center justify-center transition-opacity duration-200 ease-out ${
                showName && !copied ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: nameColor }}
              aria-hidden
            >
              <span
                className="font-zenSerif text-[clamp(13px,2.8vw,17px)] font-medium leading-none tracking-[0.14em]"
                style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
              >
                {name}
              </span>
            </span>
            <span
              className={`pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-0.5 font-zenTypewriter text-[9px] tracking-[0.04em] transition-opacity duration-200 ${
                copied ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: hexColor }}
              aria-hidden
            >
              已复制
            </span>
            <span className="sr-only">{copied ? '已复制' : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
