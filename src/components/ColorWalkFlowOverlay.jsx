import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, RefreshCw, X } from 'lucide-react';
import { hexToOklch, lchToHexClamped } from '../lib/oklch';
import { getPoeticColorName } from '../lib/poeticColorNaming';

const MAX_PHOTOS = 5;
const SPIN_MS = 2000;

function randomWalkHex(prevHue = null) {
  let h = Math.random() * 360;
  if (typeof prevHue === 'number') {
    let tries = 0;
    // 强制色相大跳变，避免连续颜色过于接近
    while (tries < 8) {
      h = (prevHue + 80 + Math.random() * 200) % 360;
      const delta = Math.abs(h - prevHue);
      const shortest = Math.min(delta, 360 - delta);
      if (shortest >= 70) break;
      tries += 1;
    }
  }
  const l = 0.34 + Math.random() * 0.52;
  const c = 0.08 + Math.random() * 0.2;
  return lchToHexClamped(l, c, h);
}

function makeToneScale(hex, count) {
  const { l, c, h } = hexToOklch(hex);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const nextL = Math.max(0.28, Math.min(0.9, l + 0.22 - t * 0.38));
    const nextC = Math.max(0.02, c * (0.72 + (1 - t) * 0.18));
    out.push(lchToHexClamped(nextL, nextC, h));
  }
  return out;
}

function PhotoSlot({ fileUrl, fallbackHex, fallbackName }) {
  if (fileUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white/50">
        <img
          src={fileUrl}
          alt="uploaded"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: fallbackHex }}
    >
      <div className="absolute bottom-3 left-3 right-3">
        <p className="type-h4 text-black">{fallbackName}</p>
        <p className="type-note text-black/70 font-mono">{fallbackHex}</p>
      </div>
    </div>
  );
}

function PaletteMosaic({ files, tones }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 row-span-2 min-h-[18rem]">
        <PhotoSlot fileUrl={files[0]} fallbackHex={tones[0]} fallbackName={getPoeticColorName(tones[0])} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[1]} fallbackHex={tones[1]} fallbackName={getPoeticColorName(tones[1])} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[2]} fallbackHex={tones[2]} fallbackName={getPoeticColorName(tones[2])} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[3]} fallbackHex={tones[3]} fallbackName={getPoeticColorName(tones[3])} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[4]} fallbackHex={tones[4]} fallbackName={getPoeticColorName(tones[4])} />
      </div>
    </div>
  );
}

function PaletteColumns({ files, tones }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {tones.map((hex, i) => (
        <div key={hex} className="min-h-[18rem]">
          <PhotoSlot fileUrl={files[i]} fallbackHex={hex} fallbackName={getPoeticColorName(hex)} />
        </div>
      ))}
    </div>
  );
}

function PaletteStrip({ files, tones }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {tones.map((hex, i) => (
        <div key={hex} className="min-h-[8.5rem]">
          <PhotoSlot fileUrl={files[i]} fallbackHex={hex} fallbackName={getPoeticColorName(hex)} />
        </div>
      ))}
    </div>
  );
}

export default function ColorWalkFlowOverlay({ open, onClose }) {
  const fileInputRef = useRef(null);
  const rafRef = useRef(null);
  const prevUrlsRef = useRef([]);
  const hueRef = useRef(null);

  const [phase, setPhase] = useState('spin'); // spin | ready | layout
  const [currentHex, setCurrentHex] = useState('#D89A80');
  const [finalHex, setFinalHex] = useState('#D89A80');
  const [spinNonce, setSpinNonce] = useState(0);
  const [files, setFiles] = useState([]);
  const [layoutId, setLayoutId] = useState('mosaic');

  const finalName = useMemo(() => getPoeticColorName(finalHex), [finalHex]);
  const tones = useMemo(() => makeToneScale(finalHex, 5), [finalHex]);

  const cleanupUrls = () => {
    prevUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    prevUrlsRef.current = [];
  };

  useEffect(() => () => cleanupUrls(), []);

  useEffect(() => {
    if (!open) return undefined;
    setFiles([]);
    setLayoutId('mosaic');
    setSpinNonce((n) => n + 1);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setPhase('spin');
    const start = performance.now();
    let lastSwitch = start;
    let latest = randomWalkHex(hueRef.current);
    hueRef.current = hexToOklch(latest).h;
    setCurrentHex(latest);

    const frame = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / SPIN_MS);
      const interval = 28 + (t ** 2.2) * 260;

      if (now - lastSwitch >= interval) {
        latest = randomWalkHex(hueRef.current);
        hueRef.current = hexToOklch(latest).h;
        setCurrentHex(latest);
        lastSwitch = now;
      }

      if (elapsed < SPIN_MS) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setFinalHex(latest);
        setCurrentHex(latest);
        setPhase('ready');
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, spinNonce]);

  if (!open) return null;

  const reroll = () => {
    if (phase !== 'ready') return;
    setSpinNonce((n) => n + 1);
  };

  const onPickPhotos = (e) => {
    const inputFiles = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!inputFiles.length) return;

    const picked = inputFiles
      .filter((f) => /^image\//i.test(f.type || ''))
      .slice(0, MAX_PHOTOS);

    cleanupUrls();
    const urls = picked.map((f) => URL.createObjectURL(f));
    prevUrlsRef.current = urls;
    setFiles(urls);
    setPhase('layout');
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Color Walk"
      onClick={reroll}
    >
      {phase !== 'layout' && (
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: currentHex }}
          aria-hidden
        />
      )}

      {phase === 'layout' && <div className="absolute inset-0 bg-zen-paper" aria-hidden />}
      {phase !== 'layout' && <div className="absolute inset-0 bg-black/18" aria-hidden />}

      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-8">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (phase === 'layout') {
              setPhase('ready');
              return;
            }
            onClose?.();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/30"
          aria-label={phase === 'layout' ? '返回上一步' : '关闭 Color Walk'}
        >
          {phase === 'layout' ? <ArrowLeft size={18} strokeWidth={2} aria-hidden /> : <X size={18} strokeWidth={2} aria-hidden />}
        </button>

        {phase === 'layout' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSpinNonce((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white px-3 py-2 text-[12px] font-extralight text-zen-ink transition-colors hover:bg-zen-mist"
          >
            <RefreshCw size={14} strokeWidth={2} aria-hidden />
            换颜色
          </button>
        ) : (
          <div className="w-10" aria-hidden />
        )}
      </div>

      {phase !== 'layout' ? (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          <div className="mb-8 text-center text-white drop-shadow-lg">
            {phase === 'spin' ? (
              <>
                <p className="type-overline text-white/75">Color Walk</p>
                <p className="mt-2 text-3xl font-zenSerif font-medium tracking-[0.08em]">随机色彩行走中</p>
                <p className="mt-2 text-sm font-extralight text-white/80">颜色正在减速，像转盘一样即将停下</p>
              </>
            ) : (
              <>
                <p className="type-overline text-white/75">Color Walk</p>
                <p className="mt-2 text-4xl font-zenSerif font-medium">{finalName}</p>
                <p className="mt-1 font-mono text-lg tracking-wide">{finalHex}</p>
                <p className="mt-2 text-sm font-extralight text-white/80">点击空白可重抽颜色</p>
              </>
            )}
          </div>

          {phase === 'ready' && (
            <button
              type="button"
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-black/25 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              aria-label="上传照片开始排版"
            >
              <Camera size={30} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <div className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 md:px-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="type-overline">Color Walk Layout</p>
              <h2 className="type-h2">{finalName}</h2>
              <p className="type-note font-mono">{finalHex}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-zen-ink/15 bg-white px-4 py-2 text-sm font-extralight text-zen-ink transition-colors hover:bg-zen-mist"
            >
              <Camera size={16} strokeWidth={2} aria-hidden />
              重新选择照片
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              className="rounded-3xl border border-black/10 p-4 md:p-6"
              style={{ backgroundColor: finalHex }}
            >
              {layoutId === 'mosaic' && <PaletteMosaic files={files} tones={tones} />}
              {layoutId === 'columns' && <PaletteColumns files={files} tones={tones} />}
              {layoutId === 'strip' && <PaletteStrip files={files} tones={tones} />}

              <div className="mt-5 border-t border-zen-ink/10 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="type-overline text-zen-ink/55">Palette</p>
                  <p className="type-note text-zen-ink/40">color walk</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['mosaic', '经典排版'],
                    ['columns', '五列拼贴'],
                    ['strip', '竖向连幅'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayoutId(id);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-extralight transition-colors ${
                        layoutId === id
                          ? 'border-zen-ink bg-zen-ink text-white'
                          : 'border-zen-ink/20 bg-white text-zen-ink hover:bg-zen-mist'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={onPickPhotos}
      />
    </div>
  );
}
