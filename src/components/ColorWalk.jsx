import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ArrowRight, Camera, ImagePlus, LayoutTemplate, RefreshCw, X,
} from 'lucide-react';
import { lchToHexClamped } from '../lib/oklch';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { pickReadableTextOnHex } from '../lib/colorValues';

const LAYOUTS = [
  { id: 'palette', label: 'Palette' },
  { id: 'grid', label: 'Grid' },
  { id: 'strips', label: 'Strips' },
];

const ROLL_DELAYS = [
  28, 30, 32, 34, 36, 38, 42, 46, 52, 60,
  72, 88, 108, 132, 162, 198, 240, 290, 350,
];

function randomWalkHex() {
  return lchToHexClamped(
    0.42 + Math.random() * 0.42,
    0.06 + Math.random() * 0.16,
    Math.random() * 360,
  );
}

function ColorWalkCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group mb-4 flex w-full overflow-hidden rounded-2xl border border-zen-ink/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/40"
      aria-label="打开 color walk"
    >
      <div className="relative w-[min(38%,9rem)] shrink-0 self-stretch min-h-[7.5rem] bg-[#FFBE98]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #FFBE98 0%, #FFD3B5 34%, #FFCAB0 66%, #FAE1DD 100%)',
          }}
          aria-hidden
        />
        <span className="absolute bottom-2 left-2 text-[10px] font-mono font-extralight tracking-wider text-black/55">
          WALK
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3.5">
        <div className="type-overline flex items-center gap-1.5">
          <ImagePlus size={12} strokeWidth={2} aria-hidden />
          <span>photo palette</span>
        </div>

        <div>
          <h2 className="type-h2">color walk</h2>
          <p className="type-body-sm mt-1.5 line-clamp-2 text-zen-ink/65">
            随机抽取一种颜色，上传 1-5 张照片生成色彩排版
          </p>
        </div>

        <span className="type-caption inline-flex items-center gap-1 text-zen-vermilion group-hover:opacity-80">
          开始漫游
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </button>
  );
}

function PhotoTile({
  photo,
  className = '',
  color,
  label,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ backgroundColor: color }}
    >
      {photo ? (
        <img
          src={photo.url}
          alt={photo.name || label || 'color walk photo'}
          className="h-full w-full object-cover"
        />
      ) : null}
      {!photo && label ? (
        <div className="absolute bottom-4 left-4">
          <p className="text-2xl font-semibold tracking-tight text-black/90">{label}</p>
        </div>
      ) : null}
    </div>
  );
}

function PaletteLayout({ photos, color, name }) {
  const photoAt = (idx) => photos[idx % Math.max(photos.length, 1)] || null;
  return (
    <div className="grid min-h-[26rem] grid-cols-[1.8fr_1fr_1fr] grid-rows-2 gap-4">
      <PhotoTile photo={photoAt(0)} color={color} label={name} className="row-span-2" />
      <PhotoTile photo={photos[1] ? photoAt(1) : null} color={`${color}CC`} label={photos[1] ? '' : name} />
      <PhotoTile photo={photos[2] ? photoAt(2) : null} color={`${color}DD`} />
      <PhotoTile photo={photos[3] ? photoAt(3) : null} color={`${color}99`} />
      <PhotoTile photo={photos[4] ? photoAt(4) : null} color={`${color}88`} />
    </div>
  );
}

function GridLayout({ photos, color }) {
  return (
    <div className="grid min-h-[26rem] grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: Math.max(photos.length, 4) }).map((_, i) => (
        <PhotoTile
          key={i}
          photo={photos[i] || null}
          color={i % 2 ? `${color}B8` : `${color}D8`}
          className={i === 0 ? 'md:row-span-2' : ''}
        />
      ))}
    </div>
  );
}

function StripsLayout({ photos, color }) {
  return (
    <div className="flex min-h-[26rem] gap-4">
      {Array.from({ length: Math.max(photos.length, 3) }).map((_, i) => (
        <PhotoTile
          key={i}
          photo={photos[i] || null}
          color={i % 2 ? `${color}A8` : `${color}D8`}
          className="flex-1"
        />
      ))}
    </div>
  );
}

function PhotoLayoutPreview({
  photos,
  color,
  name,
  hex,
  layout,
}) {
  const content = (() => {
    if (layout === 'grid') return <GridLayout photos={photos} color={color} />;
    if (layout === 'strips') return <StripsLayout photos={photos} color={color} />;
    return <PaletteLayout photos={photos} color={color} name={name} />;
  })();

  return (
    <div className="rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-2xl md:p-6">
      {content}
      <div className="mt-5 border-t border-black/10 pt-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="type-overline text-black/45">COLOR WALK</p>
            <h2 className="mt-1 font-zenSerif text-2xl font-medium text-black">{name}</h2>
            <p className="font-mono text-sm tracking-wider text-black/55">{hex}</p>
          </div>
          <p className="type-caption text-black/45">GENOM</p>
        </div>
      </div>
    </div>
  );
}

export default function ColorWalk() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('color');
  const [hex, setHex] = useState(() => randomWalkHex());
  const [rolling, setRolling] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [layout, setLayout] = useState('palette');
  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const name = useMemo(() => getPoeticColorName(hex), [hex]);
  const textColor = pickReadableTextOnHex(hex);

  const clearRollTimers = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const startRoll = useCallback(() => {
    clearRollTimers();
    setMode('color');
    setRolling(true);
    setRevealed(false);

    let step = 0;
    const tick = () => {
      setHex(randomWalkHex());

      if (step >= ROLL_DELAYS.length) {
        timeoutRef.current = null;
        setRolling(false);
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          setRevealed(true);
        }, 260);
        return;
      }

      const delay = ROLL_DELAYS[step];
      step += 1;
      timeoutRef.current = window.setTimeout(tick, delay);
    };

    tick();
  }, [clearRollTimers]);

  const openWalk = () => {
    setOpen(true);
    setPhotos([]);
    setLayout('palette');
    startRoll();
  };

  const closeWalk = useCallback(() => {
    clearRollTimers();
    setOpen(false);
    setRolling(false);
    setRevealed(true);
    setMode('color');
  }, [clearRollTimers]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') closeWalk();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [closeWalk, open]);

  useEffect(() => () => {
    clearRollTimers();
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, [clearRollTimers, photos]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || [])
      .filter((file) => /^image\//i.test(file.type || ''))
      .slice(0, 5);
    if (e.target) e.target.value = '';
    if (!selected.length) return;
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    const nextPhotos = selected.map((file, idx) => ({
      id: `${file.name}-${file.lastModified}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPhotos(nextPhotos);
    setMode('layout');
  };

  return (
    <>
      <ColorWalkCard onOpen={openWalk} />

      {open && (
        <div
          className="fixed inset-0 z-[210] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="color walk"
        >
          {mode === 'color' ? (
            <button
              type="button"
              className={`absolute inset-0 cursor-pointer ${
                rolling ? 'transition-none' : 'transition-colors duration-700'
              }`}
              style={{ backgroundColor: hex, color: textColor }}
              onClick={() => {
                if (!rolling) startRoll();
              }}
              aria-label="点击重新随机颜色"
            />
          ) : (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
          )}

          <button
            type="button"
            onClick={closeWalk}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top,0px))] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/15 text-white backdrop-blur-md transition-colors hover:bg-black/25"
            aria-label="关闭 color walk"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>

          {mode === 'color' ? (
            <div
              className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
              style={{ color: textColor }}
            >
              {revealed && !rolling ? (
                <>
                  <div className="mb-10 animate-[zenShellFade_420ms_ease-out_both]">
                    <p className="font-zenSerif text-5xl font-medium tracking-wide md:text-7xl">{name}</p>
                    <p className="mt-3 font-mono text-sm tracking-[0.35em] opacity-70">{hex}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border border-current/25 bg-white/20 shadow-2xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 md:h-24 md:w-24"
                    aria-label="上传照片"
                  >
                    <Camera size={30} strokeWidth={1.6} aria-hidden />
                  </button>
                  <p className="mt-5 text-xs font-extralight tracking-widest opacity-65">
                    上传 1-5 张照片 · 点击空白处换色
                  </p>
                </>
              ) : (
                <div className="h-24 w-24 rounded-full border border-current/20 opacity-30 shadow-[0_0_80px_currentColor] transition-opacity" />
              )}
            </div>
          ) : (
            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-[max(4.25rem,env(safe-area-inset-top,0px))] md:px-8">
              <div className="mx-auto w-full max-w-5xl">
                <PhotoLayoutPreview
                  photos={photos}
                  color={hex}
                  name={name}
                  hex={hex}
                  layout={layout}
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {LAYOUTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLayout(item.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extralight tracking-widest transition-colors ${
                        layout === item.id
                          ? 'border-white bg-white text-black'
                          : 'border-white/20 bg-white/10 text-white/75 hover:bg-white/15'
                      }`}
                    >
                      <LayoutTemplate size={13} strokeWidth={1.8} aria-hidden />
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startRoll}
                    className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-extralight tracking-widest text-white/75 transition-colors hover:bg-white/15"
                  >
                    <RefreshCw size={13} strokeWidth={1.8} aria-hidden />
                    重新抽色
                  </button>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
        </div>
      )}
    </>
  );
}
