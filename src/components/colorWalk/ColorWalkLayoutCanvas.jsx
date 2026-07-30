import React, { useMemo } from 'react';
import { CARD_RECT, getLayoutCells, getLayoutPhotoCount } from '../../lib/colorWalkLayouts';
import ColorWalkPhotoCell, { DEFAULT_PHOTO_TRANSFORM } from './ColorWalkPhotoCell';

/**
 * @param {{
 *   files: Array<string | null>,
 *   transforms: Array<{ scale: number, ox: number, oy: number } | null>,
 *   finalHex: string,
 *   onTransformChange: (slotIdx: number, t: { scale: number, ox: number, oy: number }) => void,
 *   onReplaceAt: (slotIdx: number) => void,
 *   selectedSwapSlot?: number | null,
 *   onCellTap?: (slotIdx: number) => void,
 *   exportRef?: React.RefObject<HTMLDivElement | null>,
 * }} props
 */
export default function ColorWalkLayoutCanvas({
  files = [],
  transforms = [],
  finalHex,
  onTransformChange,
  onReplaceAt,
  selectedSwapSlot = null,
  onCellTap,
  exportRef,
}) {
  const photoCount = getLayoutPhotoCount(files);
  const cells = useMemo(() => getLayoutCells(photoCount), [photoCount]);

  const filled = useMemo(
    () => files.map((url, i) => (url ? { url, slotIdx: i } : null)).filter(Boolean),
    [files],
  );

  return (
    <div
      ref={exportRef}
      className="relative mx-auto w-full max-w-md overflow-hidden bg-white shadow-sm"
      style={{ aspectRatio: '3 / 4' }}
    >
      {cells.map((rect, i) => {
        const entry = filled[i];
        if (!entry) return null;
        const t = transforms[entry.slotIdx] || DEFAULT_PHOTO_TRANSFORM;
        return (
          <ColorWalkPhotoCell
            key={`photo-${entry.slotIdx}`}
            fileUrl={entry.url}
            rect={rect}
            transform={t}
            onTransformChange={(next) => onTransformChange(entry.slotIdx, next)}
            onReplace={() => onReplaceAt(entry.slotIdx)}
            onTap={() => onCellTap?.(entry.slotIdx)}
            selected={selectedSwapSlot === entry.slotIdx}
            zIndex={1}
          />
        );
      })}

      <div
        className="pointer-events-none absolute"
        style={{
          left: `${CARD_RECT.x * 100}%`,
          top: `${CARD_RECT.y * 100}%`,
          width: `${CARD_RECT.w * 100}%`,
          height: `${CARD_RECT.h * 100}%`,
          backgroundColor: finalHex,
          zIndex: 10,
        }}
        aria-hidden
      />
    </div>
  );
}
