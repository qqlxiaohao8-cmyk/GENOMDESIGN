import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute cover-scale baseline and clamped pan offsets for a photo in a cell.
 */
export function computePhotoDrawMetrics(img, cellPx, transform) {
  const { naturalWidth: iw, naturalHeight: ih } = img;
  const { width: cw, height: ch } = cellPx;
  if (!iw || !ih || !cw || !ch) {
    return { baseScale: 1, drawW: cw, drawH: ch, ox: 0, oy: 0, userScale: 1 };
  }

  const baseScale = Math.max(cw / iw, ch / ih);
  const userScale = clamp(transform?.scale ?? 1, 1, 4);
  const drawW = iw * baseScale * userScale;
  const drawH = ih * baseScale * userScale;

  const maxOx = Math.max(0, (drawW - cw) / 2);
  const maxOy = Math.max(0, (drawH - ch) / 2);
  const ox = clamp(transform?.ox ?? 0, -maxOx, maxOx);
  const oy = clamp(transform?.oy ?? 0, -maxOy, maxOy);

  return { baseScale, drawW, drawH, ox, oy, userScale };
}

export const DEFAULT_PHOTO_TRANSFORM = { scale: 1, ox: 0, oy: 0 };

export default function ColorWalkPhotoCell({
  fileUrl,
  rect,
  transform,
  onTransformChange,
  onReplace,
  onTap,
  selected = false,
  zIndex = 1,
}) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const transformRef = useRef(transform);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, startOx: 0, startOy: 0 });
  const pinchRef = useRef({
    active: false,
    startDist: 0,
    startScale: 1,
    startOx: 0,
    startOy: 0,
  });
  const pointersRef = useRef(new Map());
  const [metrics, setMetrics] = useState(null);

  transformRef.current = transform;

  const refreshMetrics = useCallback(
    (t) => {
      const wrap = wrapRef.current;
      const img = imgRef.current;
      if (!wrap || !img?.naturalWidth) return;
      const next = computePhotoDrawMetrics(
        img,
        { width: wrap.clientWidth, height: wrap.clientHeight },
        t ?? transformRef.current,
      );
      setMetrics(next);
    },
    [],
  );

  const applyTransform = useCallback(
    (next) => {
      const wrap = wrapRef.current;
      const img = imgRef.current;
      if (!wrap || !img?.naturalWidth) {
        onTransformChange?.(next);
        return;
      }
      const computed = computePhotoDrawMetrics(
        img,
        { width: wrap.clientWidth, height: wrap.clientHeight },
        next,
      );
      setMetrics(computed);
      onTransformChange?.({
        scale: computed.userScale,
        ox: computed.ox,
        oy: computed.oy,
      });
    },
    [onTransformChange],
  );

  useEffect(() => {
    refreshMetrics(transform);
  }, [transform, fileUrl, refreshMetrics]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => refreshMetrics(transformRef.current));
    ro.observe(el);
    return () => ro.disconnect();
  }, [refreshMetrics]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        active: true,
        startDist: Math.hypot(dx, dy) || 1,
        startScale: transformRef.current.scale,
        startOx: transformRef.current.ox,
        startOy: transformRef.current.oy,
      };
      dragRef.current.active = false;
      return;
    }

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        startOx: transformRef.current.ox,
        startOy: transformRef.current.oy,
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current.active) {
      const pts = [...pointersRef.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy) || 1;
      const ratio = dist / pinchRef.current.startDist;
      applyTransform({
        scale: pinchRef.current.startScale * ratio,
        ox: pinchRef.current.startOx,
        oy: pinchRef.current.startOy,
      });
      return;
    }

    if (dragRef.current.active && pointersRef.current.size === 1) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
      applyTransform({
        scale: transformRef.current.scale,
        ox: dragRef.current.startOx + dx,
        oy: dragRef.current.startOy + dy,
      });
    }
  };

  const onPointerUp = (e) => {
    const wasTap = dragRef.current.active && !dragRef.current.moved && pointersRef.current.size <= 1;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current.active = false;
    if (pointersRef.current.size === 0) {
      if (wasTap) onTap?.();
      dragRef.current.active = false;
      dragRef.current.moved = false;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const t = transformRef.current;
      applyTransform({
        scale: (t?.scale ?? 1) + delta,
        ox: t?.ox ?? 0,
        oy: t?.oy ?? 0,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  const drawW = metrics?.drawW;
  const drawH = metrics?.drawH;
  const ox = metrics?.ox ?? 0;
  const oy = metrics?.oy ?? 0;

  return (
    <div
      ref={wrapRef}
      className={`absolute overflow-hidden touch-none ${selected ? 'ring-2 ring-inset ring-white/90' : ''}`}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        zIndex,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        ref={imgRef}
        src={fileUrl}
        alt=""
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
        style={{
          width: drawW || '100%',
          height: drawH || '100%',
          transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`,
        }}
        onLoad={() => applyTransform(transformRef.current || DEFAULT_PHOTO_TRANSFORM)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReplace?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
        aria-label="替换该格照片"
      >
        <Camera size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
