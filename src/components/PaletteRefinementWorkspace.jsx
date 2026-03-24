import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import {
  DOMINANT_EXTRACT_ALTERNATES,
  extractFiveDominantHexesFromDataUrl,
  sampleHexAtNormalizedPoint,
} from '../lib/dominantColors';
import { enrichSwatch } from '../lib/colorValues';
import { fetchColorCardMetadata, fallbackColorCardMetadata } from '../lib/colorCardAi';

const DEFAULT_NUDGE = [
  [0.22, 0.28],
  [0.42, 0.32],
  [0.55, 0.48],
  [0.68, 0.36],
  [0.78, 0.62],
];

function padSwatches(list) {
  const out = (list || []).slice(0, 5).map((c) => ({
    name: (c && c.name) || 'Swatch',
    ...enrichSwatch(c?.hex || '#888888'),
  }));
  while (out.length < 5) {
    out.push({ name: `Color ${out.length + 1}`, ...enrichSwatch('#888888') });
  }
  return out;
}

function eventToNormalizedInImage(e, imgEl) {
  if (!imgEl) return null;
  const ir = imgEl.getBoundingClientRect();
  const nw = imgEl.naturalWidth;
  const nh = imgEl.naturalHeight;
  if (!nw || !nh) return null;
  const scale = Math.min(ir.width / nw, ir.height / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  const left = ir.left + (ir.width - dw) / 2;
  const top = ir.top + (ir.height - dh) / 2;
  const x = e.clientX - left;
  const y = e.clientY - top;
  if (x < 0 || y < 0 || x > dw || y > dh) return null;
  return { nx: x / dw, ny: y / dh };
}

/**
 * @param {{
 *   imageSrc: string,
 *   initialSwatches: Array<{ name?: string, hex: string, rgb?: number[], cmyk?: number[] }>,
 *   deepseekApiKey?: string | null,
 *   deepseekBaseUrl?: string,
 *   deepseekModel?: string,
 *   onFinalize: (card: { overview: string, colors: Array<{ name: string, hex: string, rgb: number[], cmyk: number[] }> }) => Promise<void> | void,
 *   onBack: () => void,
 * }} props
 */
export default function PaletteRefinementWorkspace({
  imageSrc,
  initialSwatches,
  deepseekApiKey = null,
  deepseekBaseUrl = 'https://api.deepseek.com/v1',
  deepseekModel = 'deepseek-chat',
  onFinalize,
  onBack,
}) {
  const [swatches, setSwatches] = useState(() => padSwatches(initialSwatches));
  const [positions, setPositions] = useState(() => DEFAULT_NUDGE.map(([x, y]) => ({ x, y })));
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef(null);
  const dragIdxRef = useRef(null);
  /** Increments on each full re-extract so we cycle DOMINANT_EXTRACT_ALTERNATES (avoids identical output). */
  const reextractSpinRef = useRef(0);

  useEffect(() => {
    reextractSpinRef.current = 0;
  }, [imageSrc]);

  const reextractAll = async () => {
    if (!imageSrc || !/^data:image\//.test(imageSrc)) return;
    setBusy(true);
    try {
      reextractSpinRef.current += 1;
      const idx = reextractSpinRef.current % DOMINANT_EXTRACT_ALTERNATES.length;
      const minDistSq = DOMINANT_EXTRACT_ALTERNATES[idx];
      const hexes = await extractFiveDominantHexesFromDataUrl(imageSrc, { minDistSq });

      let rows = hexes.map((hex, i) => ({
        name: `Color ${i + 1}`,
        ...enrichSwatch(hex),
      }));

      if (deepseekApiKey) {
        try {
          const card = await fetchColorCardMetadata({
            apiKey: deepseekApiKey,
            baseUrl: deepseekBaseUrl,
            model: deepseekModel,
            hexes,
          });
          rows = card.colors.map((c) => ({
            name: c.name,
            ...enrichSwatch(c.hex),
          }));
        } catch (e) {
          console.warn('Re-extract naming failed:', e);
        }
      }

      setSwatches(padSwatches(rows));
      setPositions(DEFAULT_NUDGE.map(([x, y]) => ({ x, y })));
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  const sampleAt = useCallback(
    async (idx, nx, ny) => {
      try {
        const hex = await sampleHexAtNormalizedPoint(imageSrc, nx, ny);
        const e = enrichSwatch(hex);
        setSwatches((prev) =>
          prev.map((row, i) => (i === idx ? { ...row, hex: e.hex, rgb: e.rgb, cmyk: e.cmyk } : row))
        );
      } catch (err) {
        console.error(err);
      }
    },
    [imageSrc]
  );

  const onImageAreaPointerDown = (e) => {
    if (e.target.closest('[data-picker-handle]')) return;
    const pt = eventToNormalizedInImage(e, imgRef.current);
    if (!pt) return;
    setPositions((prev) => prev.map((p, i) => (i === selectedIdx ? { x: pt.nx, y: pt.ny } : p)));
    void sampleAt(selectedIdx, pt.nx, pt.ny);
  };

  const onPickerPointerDown = (e, idx) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIdx(idx);
    dragIdxRef.current = idx;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPickerPointerMove = (e) => {
    const idx = dragIdxRef.current;
    if (idx == null) return;
    const pt = eventToNormalizedInImage(e, imgRef.current);
    if (!pt) return;
    setPositions((prev) => prev.map((p, i) => (i === idx ? { x: pt.nx, y: pt.ny } : p)));
  };

  const onPickerPointerUp = async (e) => {
    const idx = dragIdxRef.current;
    dragIdxRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (idx == null) return;
    const pt = eventToNormalizedInImage(e, imgRef.current);
    if (pt) await sampleAt(idx, pt.nx, pt.ny);
  };

  const runExport = async () => {
    setBusy(true);
    try {
      const hexes = swatches.map((s) => s.hex);
      let card;
      if (deepseekApiKey) {
        try {
          card = await fetchColorCardMetadata({
            apiKey: deepseekApiKey,
            baseUrl: deepseekBaseUrl,
            model: deepseekModel,
            hexes,
          });
        } catch {
          card = fallbackColorCardMetadata(hexes);
        }
      } else {
        card = fallbackColorCardMetadata(hexes);
      }
      await onFinalize(card);
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400 mb-4">
        Extract · Refine palette
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
        >
          Back
        </button>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 max-w-md leading-snug">
          Select a swatch · tap or drag on the photo to resample · re-extract for a fresh pass
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-stretch">
        <aside className="w-full lg:w-[min(100%,300px)] shrink-0 rounded-[2rem] border-2 border-black bg-white p-6 md:p-7 shadow-[6px_6px_0_0_rgba(0,0,0,1)] space-y-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00c2d6] mb-3">Palette</p>
            <div className="flex gap-2 flex-wrap items-center">
              {swatches.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`relative h-11 w-11 rounded-xl border-2 border-black shrink-0 transition-all ${
                    selectedIdx === i
                      ? 'ring-2 ring-[#ccff00] ring-offset-2 ring-offset-white scale-105 z-10 shadow-[3px_3px_0_0_#000]'
                      : 'hover:brightness-105 shadow-[2px_2px_0_0_#000]'
                  }`}
                  style={{ backgroundColor: s.hex }}
                  title={s.name}
                  aria-label={`Select swatch ${i + 1}`}
                  aria-pressed={selectedIdx === i}
                >
                  {selectedIdx === i ? (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-white border border-black" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void reextractAll()}
              disabled={busy}
              className="flex items-center justify-center gap-2 w-full rounded-full border-2 border-black bg-white py-3.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:shadow-none"
            >
              <RefreshCw size={16} className={busy ? 'animate-spin' : ''} aria-hidden />
              Re-extract all colors
            </button>

            <div className="pt-1 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runExport()}
                className="flex w-full items-center justify-center rounded-full border-2 border-black bg-[#ccff00] py-3.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Build color card
              </button>
              <p className="text-[10px] font-bold text-neutral-600 leading-snug px-1">
                Refreshes names &amp; overview — then download or publish.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-h-[min(55vh,520px)] rounded-[2rem] border-2 border-black bg-white p-2 md:p-3 flex items-center justify-center relative shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          {busy ? (
            <div className="absolute inset-0 z-20 bg-[#ccff00]/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-[1.35rem]">
              <Loader2 className="animate-spin text-black" size={40} strokeWidth={2.5} aria-hidden />
              <p className="text-[10px] font-black uppercase tracking-widest text-black">Working…</p>
            </div>
          ) : null}
          <button
            type="button"
            className="absolute bottom-4 right-4 z-10 w-9 h-9 rounded-full bg-white border-2 border-black text-[10px] font-black text-black shadow-[3px_3px_0_0_#000] hover:bg-[#ccff00] transition-colors"
            title="Select a swatch, then tap the photo to move its sample point"
          >
            i
          </button>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="relative inline-block max-w-full cursor-crosshair touch-manipulation select-none rounded-2xl overflow-hidden border-2 border-black"
            onPointerDown={onImageAreaPointerDown}
            role="presentation"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Reference"
              className="block max-w-full max-h-[min(52vh,500px)] w-auto h-auto object-contain pointer-events-none"
              draggable={false}
            />
            {positions.map((p, i) => {
              const selected = selectedIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  data-picker-handle
                  className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 touch-none shadow-[2px_2px_0_0_#000] ${
                    selected
                      ? 'w-10 h-10 border-[3px] border-white z-10 shadow-[4px_4px_0_0_#000]'
                      : 'w-8 h-8 border-2 border-black'
                  }`}
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    backgroundColor: swatches[i]?.hex || '#000',
                  }}
                  aria-label={`Move picker for swatch ${i + 1}`}
                  onPointerDown={(e) => onPickerPointerDown(e, i)}
                  onPointerMove={onPickerPointerMove}
                  onPointerUp={onPickerPointerUp}
                  onPointerCancel={onPickerPointerUp}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
