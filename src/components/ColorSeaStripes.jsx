import React, { useMemo, useState } from 'react';
import { pickPaletteAccentTextColor } from '../lib/colorValues';
import { getPoeticColorName } from '../lib/poeticColorNaming';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#888888';
  return `#${s.toUpperCase()}`;
}

function stripeLabel(c) {
  const raw = (c?.name && String(c.name).trim()) || getPoeticColorName(c?.hex);
  return String(raw).replace(/\s/g, '').slice(0, 2);
}

/** 色海 / 收藏 feed 统一色条高度（列宽变化时高度不变） */
export const PALETTE_FEED_STRIPE_HEIGHT_CLASS =
  'h-[5.5rem] min-h-[5.5rem] max-h-[5.5rem]';

/**
 * 色海色卡条：无描边、等宽竖条；桌面悬停单列显示竖排二字名（字色取自色卡内其他色）。
 */
export default function ColorSeaStripes({
  colors,
  onCopyHex,
  hexCopyScope = '',
  copiedHexKey = null,
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

  return (
    <div
      className={`flex w-full overflow-hidden rounded-2xl ${PALETTE_FEED_STRIPE_HEIGHT_CLASS} ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      {list.map((c, i) => {
        const hex = normalizeHex(c.hex);
        const copyKey = `${scopePrefix}${hex}-${i}`;
        const name = stripeLabel(c);
        const textColor = pickPaletteAccentTextColor(hex, hexList);
        const showName = hovered === i;

        const Tag = onCopyHex ? 'button' : 'div';

        return (
          <Tag
            key={copyKey}
            {...(onCopyHex
              ? {
                  type: 'button',
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopyHex(hex, copyKey);
                  },
                }
              : {})}
            onMouseEnter={() => setHovered(i)}
            className="relative min-h-0 min-w-0 flex-1 border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 focus-visible:z-10"
            style={{ backgroundColor: hex }}
            aria-label={onCopyHex ? `复制 ${hex}` : undefined}
          >
            <span
              className={`pointer-events-none absolute inset-x-0 top-[18%] bottom-[28%] hidden md:flex items-center justify-center transition-opacity duration-200 ease-out ${
                showName ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: textColor }}
              aria-hidden={!showName}
            >
              <span
                className="font-zenSans text-[clamp(13px,2.8vw,17px)] font-medium leading-none tracking-[0.14em]"
                style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
              >
                {name}
              </span>
            </span>
            {onCopyHex ? (
              <span className="sr-only">{copiedHexKey === copyKey ? '已复制' : ''}</span>
            ) : null}
          </Tag>
        );
      })}
    </div>
  );
}
