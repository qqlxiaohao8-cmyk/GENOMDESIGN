import React, { useMemo } from 'react';
import { pickPaletteAccentTextColor, pickReadableTextOnHex } from '../lib/colorValues';
import { getPoeticColorName, uniquePoeticNamesForSwatches } from '../lib/poeticColorNaming';
import { SEKONG_PALETTE_EXPORT_ASPECT } from '../lib/renderSekongPalettePng';
import sekongLogo from '../../下载色空.png';

function prepareColors(colors) {
  const raw = (Array.isArray(colors) ? colors : [])
    .slice(0, 10)
    .map((c) => {
      if (typeof c === 'string') return { hex: c, name: '' };
      return { hex: c?.hex, name: String(c?.name || '').trim() };
    })
    .filter((c) => c?.hex);
  if (raw.length < 1) {
    return [{ hex: '#888888', name: '素灰' }, { hex: '#AAAAAA', name: '素灰' }];
  }
  const names = uniquePoeticNamesForSwatches(raw);
  return raw.map((c, i) => ({
    hex: c.hex,
    name: (c.name || names[i] || getPoeticColorName(c.hex)).replace(/\s/g, '').slice(0, 2),
  }));
}

/**
 * 下载模版预览：上方等宽竖条（竖排二字名居中）+ 下方白底「色空」品牌（与导出 PNG 一致）。
 */
export default function SekongPaletteSharePreview({ colors, className = '' }) {
  const list = useMemo(() => prepareColors(colors), [colors]);
  const hexList = useMemo(() => list.map((c) => c.hex), [list]);

  return (
    <div
      className={`mx-auto flex w-full max-w-[min(100%,640px)] flex-col overflow-hidden rounded-sm bg-white ${className}`}
      style={{ aspectRatio: String(SEKONG_PALETTE_EXPORT_ASPECT) }}
    >
      <div className="flex min-h-0 flex-[81]">
        {list.map((c, i) => (
          <div
            key={`${c.hex}-${i}`}
            className="relative min-h-0 min-w-0 flex-1"
            style={{ backgroundColor: c.hex }}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="font-zenSerif text-[clamp(14px,4.2vw,28px)] font-medium leading-none tracking-[0.14em]"
                style={{
                  color: pickPaletteAccentTextColor(c.hex, hexList) || pickReadableTextOnHex(c.hex),
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                }}
              >
                {c.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-[19] items-end bg-white px-4 pb-3 pt-2 md:px-5 md:pb-4">
        <img
          src={sekongLogo}
          alt="色空"
          draggable={false}
          className="h-[clamp(1.75rem,6vw,2.75rem)] w-auto max-w-[45%] object-contain object-left"
        />
      </div>
    </div>
  );
}
