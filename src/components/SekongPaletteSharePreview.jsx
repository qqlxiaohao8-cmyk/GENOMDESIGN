import React, { useMemo } from 'react';
import { pickReadableTextOnHex } from '../lib/colorValues';
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
    name: c.name || names[i] || getPoeticColorName(c.hex),
  }));
}

/**
 * 与 {@link renderSekongPalettePngBlob} 一致的下载模版预览（竖条 + 白底 logo + 名称）。
 */
export default function SekongPaletteSharePreview({ title, colors, className = '' }) {
  const list = useMemo(() => prepareColors(colors), [colors]);
  const headline = String(title || '色盘').trim().slice(0, 40) || '色盘';

  return (
    <div
      className={`mx-auto flex w-full max-w-[min(100%,420px)] flex-col overflow-hidden bg-white ${className}`}
      style={{ aspectRatio: String(SEKONG_PALETTE_EXPORT_ASPECT) }}
    >
      <div className="flex min-h-0 flex-[81]">
        {list.map((c, i) => (
          <div
            key={`${c.hex}-${i}`}
            className="relative min-w-0 flex-1"
            style={{ backgroundColor: c.hex }}
          >
            <span
              className="pointer-events-none absolute left-1/2 top-[6%] -translate-x-1/2 text-center text-[clamp(10px,2.4vw,16px)] font-medium"
              style={{
                color: pickReadableTextOnHex(c.hex),
                fontFamily: '"Songti SC", "STSong", "SimSun", "NSimSun", serif',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                letterSpacing: '0.06em',
                lineHeight: 1.15,
              }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-[19] items-center gap-3 bg-white px-3 py-2">
        <img
          src={sekongLogo}
          alt="色空"
          draggable={false}
          className="h-[85%] max-h-12 w-auto shrink-0 object-contain"
        />
        <p
          className="min-w-0 flex-1 truncate text-[clamp(12px,3.2vw,16px)] font-semibold text-[#1a1a1a]"
          style={{ fontFamily: '"Songti SC", "STSong", "SimSun", "NSimSun", serif' }}
        >
          {headline}
        </p>
      </div>
    </div>
  );
}
