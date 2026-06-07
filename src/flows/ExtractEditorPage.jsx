import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { ArrowLeft, ArrowRight, Plus, Minus, Loader2 } from 'lucide-react';
import { extractHarmoniousFiveFromDataUrl } from '../lib/paletteExtract';
import {
  sampleHexAtNormalizedPoint,
  findNormalizedPointsForHexes,
  sampleSweepPaletteFromDataUrl,
  pickDiverseSampleFromDataUrl,
} from '../lib/dominantColors';
import { getPoeticColorName } from '../lib/poeticColorNaming';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** 图片上可拖动的取色圆圈（仅当前选中色显示） */
function ColorSampleHandle({ hex, nx, ny, onMove }) {
  const draggingRef = useRef(false);

  const pointerToNorm = useCallback((clientX, clientY) => {
    const wrap = document.getElementById('extract-image-wrap');
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      nx: clamp((clientX - rect.left) / rect.width, 0, 1),
      ny: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }, []);

  const onPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const pt = pointerToNorm(e.clientX, e.clientY);
    if (pt) onMove(pt.nx, pt.ny);
  };

  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  return (
    <div
      role="slider"
      aria-label="拖动以选取颜色"
      aria-valuetext={hex}
      className="absolute z-20 touch-none"
      style={{
        left: `${nx * 100}%`,
        top: `${ny * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="h-9 w-9 rounded-full border-[3px] border-white shadow-lg ring-2 ring-black/25"
        style={{
          backgroundColor: hex,
          boxShadow: '0 2px 14px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.3)',
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/80"
        aria-hidden
      />
    </div>
  );
}

/**
 * 析色全屏编辑页。
 * flow payload: { type: 'extract', imageDataUrl }
 */
export default function ExtractEditorPage({ flow, onBack, onContinue }) {
  const { imageDataUrl } = flow;
  const saved = flow?.savedState;
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const wrapRef = useRef(null);

  const [hexes, setHexes] = useState(saved?.hexes ?? []);
  const [samplePoints, setSamplePoints] = useState(saved?.samplePoints ?? []);
  const [loading, setLoading] = useState(!saved);
  const [error, setError] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(saved?.selectedIdx ?? 0);
  const [scale, setScale] = useState(saved?.scale ?? 1);
  const [sliderValue, setSliderValue] = useState(saved?.sliderValue ?? 50);
  const [imgLoaded, setImgLoaded] = useState(Boolean(saved));

  const sliderBusyRef = useRef(false);

  const applyPalette = useCallback((items) => {
    setHexes(items.map((it) => it.hex));
    setSamplePoints(items.map((it) => ({ nx: it.nx, ny: it.ny })));
  }, []);

  useEffect(() => {
    if (saved) return undefined;
    if (!imageDataUrl) { setError('没有图片数据。'); setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImgLoaded(false);
    (async () => {
      try {
        const colors = await extractHarmoniousFiveFromDataUrl(imageDataUrl);
        if (cancelled) return;
        const list = (Array.isArray(colors) ? colors : []).slice(0, 5).map((h) =>
          (typeof h === 'string' ? h : h?.hex || '#888888').toUpperCase(),
        );
        if (list.length < 2) throw new Error('取色失败，请换一张图片。');
        const points = await findNormalizedPointsForHexes(imageDataUrl, list);
        if (cancelled) return;
        setHexes(list);
        setSamplePoints(points);
        setSelectedIdx(0);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '取色失败');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [imageDataUrl, saved]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setImgLoaded(true);
  }, [loading, imageDataUrl]);

  const updateSampleAt = useCallback(async (idx, nx, ny) => {
    if (!imageDataUrl || idx == null) return;
    setSamplePoints((prev) => {
      const next = [...prev];
      next[idx] = { nx, ny };
      return next;
    });
    try {
      const hex = await sampleHexAtNormalizedPoint(imageDataUrl, nx, ny);
      setHexes((prev) => {
        const next = [...prev];
        next[idx] = hex;
        return next;
      });
    } catch { /* ignore */ }
  }, [imageDataUrl]);

  const pointerToNorm = useCallback((clientX, clientY) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      nx: clamp((clientX - rect.left) / rect.width, 0, 1),
      ny: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }, []);

  const handleImagePointerDown = useCallback((e) => {
    if (e.target.closest('[role="slider"]')) return;
    const pt = pointerToNorm(e.clientX, e.clientY);
    if (pt != null && selectedIdx != null) {
      updateSampleAt(selectedIdx, pt.nx, pt.ny);
    }
  }, [pointerToNorm, selectedIdx, updateSampleAt]);

  const handleSliderChange = useCallback(async (val) => {
    setSliderValue(val);
    if (!imageDataUrl || hexes.length < 2) return;
    if (sliderBusyRef.current) return;
    sliderBusyRef.current = true;
    try {
      const items = await sampleSweepPaletteFromDataUrl(
        imageDataUrl,
        hexes.length,
        val / 100,
      );
      applyPalette(items);
    } catch { /* ignore */ }
    sliderBusyRef.current = false;
  }, [imageDataUrl, hexes.length, applyPalette]);

  const pinchStartDistRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchStartDistRef.current = { dist: d, scale };
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setScale(clamp((d / pinchStartDistRef.current.dist) * pinchStartDistRef.current.scale, 0.5, 3));
    }
  };
  const handleWheel = (e) => {
    e.preventDefault();
    setScale((s) => clamp(s - e.deltaY * 0.002, 0.5, 3));
  };

  const addColor = async () => {
    if (hexes.length >= 10 || !imageDataUrl) return;
    try {
      const { hex, nx, ny } = await pickDiverseSampleFromDataUrl(imageDataUrl, hexes);
      setHexes((prev) => [...prev, hex]);
      setSamplePoints((prev) => [...prev, { nx, ny }]);
      setSelectedIdx(hexes.length);
    } catch {
      setHexes((prev) => [...prev, '#888888']);
      setSamplePoints((prev) => [...prev, { nx: 0.5, ny: 0.5 }]);
      setSelectedIdx(hexes.length);
    }
  };

  const removeColor = () => {
    if (hexes.length <= 2) return;
    const idx = selectedIdx ?? hexes.length - 1;
    setHexes((prev) => prev.filter((_, i) => i !== idx));
    setSamplePoints((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(Math.max(0, idx - 1));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zen-paper">
        <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-zen-ink/40 mb-3" />
        <p className="type-body text-zen-ink/50">正在析色…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zen-paper p-6">
        <p className="type-body mb-4 text-center text-zen-ink/60">{error}</p>
        <button type="button" onClick={onBack} className="type-body-sm rounded-full border border-zen-ink/15 px-6 py-2.5 text-zen-ink hover:bg-zen-ink/[0.04] transition-colors">
          返回
        </button>
      </div>
    );
  }

  const activePoint = samplePoints[selectedIdx];
  const activeHex = hexes[selectedIdx];
  const activeName = activeHex ? getPoeticColorName(activeHex) : '';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zen-ink/10">
        <button
          type="button"
          onClick={onBack}
          className="type-flow-action hover:text-zen-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          返回
        </button>
        <h1 className="type-flow-title">析色</h1>
        <button
          type="button"
          onClick={() =>
            onContinue(hexes, {
              hexes,
              samplePoints,
              selectedIdx,
              sliderValue,
              scale,
            })
          }
          className="type-flow-action text-zen-vermilion hover:opacity-75 transition-opacity"
        >
          继续
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* 居中图片 + 当前选中色的取色圆圈 */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zen-mist/30 p-3 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
      >
        <div
          className="flex max-h-full max-w-full items-center justify-center"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          <div
            id="extract-image-wrap"
            ref={wrapRef}
            role="presentation"
            className="relative inline-block max-h-[calc(100dvh-13.5rem)] max-w-[min(100%,52rem)] cursor-crosshair"
            onPointerDown={handleImagePointerDown}
          >
            <img
              ref={imgRef}
              src={imageDataUrl}
              alt="析色源图"
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              className={`block h-auto w-auto max-h-[calc(100dvh-13.5rem)] max-w-[min(100%,52rem)] object-contain pointer-events-none transition-opacity duration-300 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-zen-mist/20">
                <Loader2 size={24} className="animate-spin text-zen-ink/30" />
              </div>
            )}
            {imgLoaded && activePoint && activeHex && (
              <ColorSampleHandle
                hex={activeHex}
                nx={activePoint.nx}
                ny={activePoint.ny}
                onMove={(nx, ny) => updateSampleAt(selectedIdx, nx, ny)}
              />
            )}
          </div>
        </div>
      </div>

      {/* 底部色条 */}
      <div className="shrink-0 border-t border-zen-ink/10 bg-white pb-2">
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-2xl bg-[#141414] p-1 shadow-md ring-1 ring-black/10">
            <div className="flex h-[3.25rem] overflow-hidden rounded-[0.65rem]">
              {hexes.map((hex, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <button
                    key={`${hex}-${i}`}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`relative min-w-0 flex-1 transition-opacity ${
                      isSelected ? 'z-10' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`颜色 ${i + 1}: ${getPoeticColorName(hex)}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <span
                        className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {activeName && (
            <p className="type-caption mt-2 text-center">
              {activeName}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-3 pb-2 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={removeColor}
              disabled={hexes.length <= 2}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/60 hover:bg-zen-ink/[0.06] disabled:opacity-30 transition-colors"
              aria-label="减少颜色"
            >
              <Minus size={13} strokeWidth={2} aria-hidden />
            </button>
            <span className="type-caption">{hexes.length} 色</span>
            <button
              type="button"
              onClick={addColor}
              disabled={hexes.length >= 10}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-zen-ink/15 text-zen-ink/60 hover:bg-zen-ink/[0.06] disabled:opacity-30 transition-colors"
              aria-label="增加颜色"
            >
              <Plus size={13} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="ml-4 flex min-w-0 flex-1 items-center gap-2">
            <span className="type-micro shrink-0">←</span>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="min-w-0 flex-1 accent-zen-ink"
              aria-label="扫描图像色彩"
            />
            <span className="type-micro shrink-0">→</span>
          </div>
        </div>
        <p className="type-note pb-3 text-center text-zen-ink/25">
          点击色块切换 · 拖动或点击图片上的圆圈取色 · 滑动扫描另一组色彩
        </p>
      </div>
    </div>
  );
}
