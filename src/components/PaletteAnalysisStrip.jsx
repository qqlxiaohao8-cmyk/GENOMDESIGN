import React, { useMemo } from 'react';
import { pickPaletteAccentTextColor, pickReadableTextOnHex } from '../lib/colorValues';
import { getPoeticColorName, uniquePoeticNamesForSwatches } from '../lib/poeticColorNaming';

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
 * 分析页大型横条色卡：每色显示名称 + HEX（参考 Coolors 式布局）
 */
export default function PaletteAnalysisStrip({ colors, className = '' }) {
  const list = useMemo(() => prepareColors(colors), [colors]);
  const hexList = useMemo(() => list.map((c) => c.hex), [list]);

  return (
    <div
      className={`flex w-full min-h-[9.5rem] overflow-hidden rounded-[1.5rem] shadow-sm md:min-h-[12.5rem] ${className}`}
      role="img"
      aria-label="色卡预览"
    >
      {list.map((c, i) => {
        const hexLabel = String(c.hex || '').replace(/^#/, '').toUpperCase();
        const labelColor =
          pickPaletteAccentTextColor(c.hex, hexList) || pickReadableTextOnHex(c.hex);
        return (
          <div
            key={`${c.hex}-${i}`}
            className="relative min-w-0 flex-1"
            style={{ backgroundColor: c.hex }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 px-1 pb-3 pt-8 text-center">
              <span
                className="font-zenSerif text-[11px] font-medium leading-tight md:text-sm"
                style={{ color: labelColor }}
              >
                {c.name}
              </span>
              <span
                className="text-[10px] font-extralight tabular-nums tracking-wide md:text-[11px]"
                style={{ color: labelColor }}
              >
                {hexLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
