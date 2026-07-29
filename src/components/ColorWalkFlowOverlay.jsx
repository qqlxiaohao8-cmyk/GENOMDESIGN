import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Camera, Loader2, RefreshCw, X } from 'lucide-react';
import { hexToOklch, lchToHexClamped } from '../lib/oklch';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import useColorWalkSavedColors from '../hooks/useColorWalkSavedColors';
import ColorWalkSavedColorsPage from './ColorWalkSavedColorsPage';

const MAX_PHOTOS = 5;
const SPIN_MS = 2000;

const TONE_PRESETS = [
  // 浅淡色调：高明度、低彩
  { id: 'lightSoft', labelZh: '浅淡色调', lRange: [0.8, 0.94], cRange: [0.022, 0.078], weight: 22 },
  // 明亮色调：高明度、中高彩
  { id: 'bright', labelZh: '明亮色调', lRange: [0.68, 0.86], cRange: [0.09, 0.17], weight: 24 },
  // 灰色调：中明度、低彩
  { id: 'grayish', labelZh: '灰色调', lRange: [0.44, 0.72], cRange: [0.016, 0.072], weight: 20 },
  // 深/暗色调：低明度、中低彩
  { id: 'deep', labelZh: '深暗色调', lRange: [0.16, 0.44], cRange: [0.024, 0.12], weight: 18 },
  // 鲜艳色调：中明度、高彩
  { id: 'vivid', labelZh: '鲜艳色调', lRange: [0.42, 0.74], cRange: [0.14, 0.24], weight: 16 },
];

const TEMP_GROUPS = [
  { id: 'warm', labelZh: '暖色', ranges: [[352, 360], [0, 72]], weight: 36 },
  { id: 'cool', labelZh: '冷色', ranges: [[155, 248]], weight: 36 },
  { id: 'neutral', labelZh: '中性色相', ranges: [[88, 155], [275, 350]], weight: 28 },
];

const ACHROMATIC_STYLES = [
  { id: 'white', labelZh: '白', lRange: [0.9, 0.98], cRange: [0.003, 0.015], weight: 24 },
  { id: 'gray', labelZh: '灰', lRange: [0.42, 0.78], cRange: [0.003, 0.02], weight: 56 },
  { id: 'black', labelZh: '黑', lRange: [0.08, 0.22], cRange: [0.003, 0.014], weight: 20 },
];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function shortestHueDelta(a, b) {
  const raw = Math.abs(a - b) % 360;
  return Math.min(raw, 360 - raw);
}

function sampleHueByRanges(ranges) {
  const [a, b] = ranges[Math.floor(Math.random() * ranges.length)];
  return rand(a, b);
}

function sampleHueWithHarmony(prevHue, preferredRanges) {
  if (typeof prevHue !== 'number') return sampleHueByRanges(preferredRanges);

  // 用类似/对比/互补的跳转去控制“随机感”与“设计感”的平衡
  const strategy = pickWeighted([
    { id: 'analogous', weight: 24 },
    { id: 'contrast', weight: 40 },
    { id: 'complementary', weight: 36 },
  ]);

  let tries = 0;
  while (tries < 10) {
    let candidate;
    if (strategy.id === 'analogous') {
      candidate = (prevHue + rand(-38, 38) + 360) % 360;
    } else if (strategy.id === 'complementary') {
      candidate = (prevHue + 180 + rand(-24, 24) + 360) % 360;
    } else {
      const sign = Math.random() < 0.5 ? 1 : -1;
      candidate = (prevHue + sign * rand(85, 145) + 360) % 360;
    }

    const inPreferred = preferredRanges.some(([a, b]) => candidate >= a && candidate <= b);
    const minDelta = strategy.id === 'analogous' ? 18 : 52;
    if (inPreferred && shortestHueDelta(candidate, prevHue) >= minDelta) return candidate;
    tries += 1;
  }

  return sampleHueByRanges(preferredRanges);
}

function randomWalkColor(prevHue = null) {
  // 12% 无彩色：黑白灰，强调明度结构；88% 有彩色：由色相+明度+彩度共同决定
  if (Math.random() < 0.12) {
    const achromatic = pickWeighted(ACHROMATIC_STYLES);
    const l = rand(achromatic.lRange[0], achromatic.lRange[1]);
    const c = rand(achromatic.cRange[0], achromatic.cRange[1]);
    const h = typeof prevHue === 'number' ? prevHue : rand(0, 360);
    return { hex: lchToHexClamped(l, c, h), hue: h };
  }

  const tone = pickWeighted(TONE_PRESETS);
  const temp = pickWeighted(TEMP_GROUPS);
  const h = sampleHueWithHarmony(prevHue, temp.ranges);
  const l = rand(tone.lRange[0], tone.lRange[1]);
  const c = rand(tone.cRange[0], tone.cRange[1]);
  return { hex: lchToHexClamped(l, c, h), hue: h };
}

function describeColorKnowledge(hex) {
  const { l, c, h } = hexToOklch(hex);
  const category = c < 0.028 ? '无彩色' : '有彩色';

  let temp = '中性色相';
  if (h >= 352 || h < 72) temp = '暖色';
  else if (h >= 155 && h < 248) temp = '冷色';

  let tone = '灰色调';
  if (l >= 0.8 && c < 0.09) tone = '浅淡色调';
  else if (l >= 0.66 && c >= 0.09) tone = '明亮色调';
  else if (l < 0.44) tone = '深暗色调';
  else if (c >= 0.14) tone = '鲜艳色调';

  return `${category} · ${temp} · ${tone}`;
}

function PhotoSlot({ fileUrl, onPick }) {
  if (fileUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white">
        <img
          src={fileUrl}
          alt="uploaded"
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick?.();
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
          aria-label="替换该色块照片"
        >
          <Camera size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPick?.();
        }}
        className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/15 bg-white text-black/55 shadow-sm transition-colors hover:bg-zen-mist hover:text-black/75"
        aria-label="上传该色块照片"
      >
        <Camera size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function PaletteMosaic({ files, onPickAt }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-1 row-span-2 min-h-[18rem]">
        <PhotoSlot fileUrl={files[0]} onPick={() => onPickAt(0)} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[1]} onPick={() => onPickAt(1)} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[2]} onPick={() => onPickAt(2)} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[3]} onPick={() => onPickAt(3)} />
      </div>
      <div className="min-h-[8.6rem]">
        <PhotoSlot fileUrl={files[4]} onPick={() => onPickAt(4)} />
      </div>
    </div>
  );
}

function PaletteColumns({ files, onPickAt }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: MAX_PHOTOS }, (_, i) => (
        <div key={i} className="min-h-[18rem]">
          <PhotoSlot fileUrl={files[i]} onPick={() => onPickAt(i)} />
        </div>
      ))}
    </div>
  );
}

function PaletteStrip({ files, onPickAt }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: MAX_PHOTOS }, (_, i) => (
        <div key={i} className="min-h-[8.5rem]">
          <PhotoSlot fileUrl={files[i]} onPick={() => onPickAt(i)} />
        </div>
      ))}
    </div>
  );
}

export default function ColorWalkFlowOverlay({
  open,
  onClose,
  user = null,
  onOpenAuth,
  initialPhase = 'spin',
}) {
  const multiFileInputRef = useRef(null);
  const singleFileInputRef = useRef(null);
  const rafRef = useRef(null);
  const fileUrlsRef = useRef(Array(MAX_PHOTOS).fill(null));
  const hueRef = useRef(null);
  const suppressRerollRef = useRef(false);
  const pendingSaveHexRef = useRef(null);
  const skipSpinRef = useRef(false);

  const [phase, setPhase] = useState('spin'); // spin | ready | layout | saved
  const [currentHex, setCurrentHex] = useState('#D89A80');
  const [finalHex, setFinalHex] = useState('#D89A80');
  const [spinNonce, setSpinNonce] = useState(0);
  const [files, setFiles] = useState(() => Array(MAX_PHOTOS).fill(null));
  const [slotPickIdx, setSlotPickIdx] = useState(null);
  const [layoutId, setLayoutId] = useState('mosaic');
  const [hexLocked, setHexLocked] = useState(false);
  const [returnPhase, setReturnPhase] = useState('ready');
  // true when opened from game-page saved-colors entry (back closes overlay)
  const [openedAsSavedEntry, setOpenedAsSavedEntry] = useState(false);

  const userId = user?.id || null;
  const {
    slots: savedSlots,
    full: savedFull,
    loading: savedLoading,
    saving: savedSaving,
    deletingId,
    saveHex,
    removeById,
  } = useColorWalkSavedColors({ userId, enabled: open && Boolean(userId) });

  const finalName = useMemo(() => getPoeticColorName(finalHex), [finalHex]);
  const finalKnowledge = useMemo(() => describeColorKnowledge(finalHex), [finalHex]);

  const clearSlotUrl = (idx) => {
    const cur = fileUrlsRef.current[idx];
    if (cur) URL.revokeObjectURL(cur);
    fileUrlsRef.current[idx] = null;
  };

  const cleanupUrls = () => {
    fileUrlsRef.current.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
    fileUrlsRef.current = Array(MAX_PHOTOS).fill(null);
  };

  useEffect(() => () => cleanupUrls(), []);

  useEffect(() => {
    if (!open) {
      pendingSaveHexRef.current = null;
      skipSpinRef.current = false;
      setOpenedAsSavedEntry(false);
      return undefined;
    }

    setFiles(Array(MAX_PHOTOS).fill(null));
    cleanupUrls();
    setLayoutId('mosaic');
    setSlotPickIdx(null);
    setHexLocked(false);

    if (initialPhase === 'saved') {
      skipSpinRef.current = true;
      setOpenedAsSavedEntry(true);
      setReturnPhase('saved');
      setPhase('saved');
      return undefined;
    }

    skipSpinRef.current = false;
    setOpenedAsSavedEntry(false);
    setReturnPhase('ready');
    setSpinNonce((n) => n + 1);
    return undefined;
  }, [open, initialPhase]);

  useEffect(() => {
    if (!open) return undefined;
    if (skipSpinRef.current) {
      skipSpinRef.current = false;
      return undefined;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setPhase('spin');
    const start = performance.now();
    let lastSwitch = start;
    let latest = randomWalkColor(hueRef.current);
    hueRef.current = latest.hue;
    setCurrentHex(latest.hex);

    const frame = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / SPIN_MS);
      const interval = 28 + (t ** 2.2) * 260;

      if (now - lastSwitch >= interval) {
        latest = randomWalkColor(hueRef.current);
        hueRef.current = latest.hue;
        setCurrentHex(latest.hex);
        lastSwitch = now;
      }

      if (elapsed < SPIN_MS) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setFinalHex(latest.hex);
        setCurrentHex(latest.hex);
        setPhase('ready');
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, spinNonce]);

  const goToSavedPage = useCallback(() => {
    setPhase('saved');
  }, []);

  const performSave = useCallback(async (hex) => {
    if (!hex) return;
    if (!userId) {
      pendingSaveHexRef.current = hex;
      onOpenAuth?.();
      return;
    }
    const result = await saveHex(hex);
    if (result.unauthorized) {
      pendingSaveHexRef.current = hex;
      onOpenAuth?.();
      return;
    }
    // Enter saved page only after vault state is synced (new / duplicate / full)
    if (result.ok || result.full) {
      setOpenedAsSavedEntry(false);
      goToSavedPage();
    }
  }, [userId, onOpenAuth, saveHex, goToSavedPage]);

  // Resume pending save after login
  useEffect(() => {
    if (!open || !userId || !pendingSaveHexRef.current) return undefined;
    const hex = pendingSaveHexRef.current;
    pendingSaveHexRef.current = null;
    void performSave(hex);
    return undefined;
  }, [open, userId, performSave]);

  if (!open) return null;

  const leaveSavedPage = () => {
    if (openedAsSavedEntry) {
      onClose?.();
      return;
    }
    setHexLocked(false);
    setReturnPhase('ready');
    setPhase('ready');
  };

  const reroll = () => {
    if (phase !== 'ready') return;
    if (suppressRerollRef.current) return;
    setHexLocked(false);
    setReturnPhase('ready');
    setOpenedAsSavedEntry(false);
    setSpinNonce((n) => n + 1);
  };

  const openMultiPicker = () => {
    suppressRerollRef.current = true;
    multiFileInputRef.current?.click();
    window.setTimeout(() => {
      suppressRerollRef.current = false;
    }, 800);
  };

  const onPickPhotos = (e) => {
    const inputFiles = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!inputFiles.length) return;

    const picked = inputFiles
      .filter((f) => /^image\//i.test(f.type || ''))
      .slice(0, MAX_PHOTOS);

    setFiles((prev) => {
      const next = [...prev];
      for (let i = 0; i < MAX_PHOTOS; i += 1) clearSlotUrl(i);
      picked.forEach((f, i) => {
        const url = URL.createObjectURL(f);
        fileUrlsRef.current[i] = url;
        next[i] = url;
      });
      return next;
    });
    setPhase('layout');
  };

  const onPickSinglePhoto = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file || slotPickIdx == null) return;
    if (!/^image\//i.test(file.type || '')) return;
    const idx = Math.max(0, Math.min(MAX_PHOTOS - 1, slotPickIdx));
    const url = URL.createObjectURL(file);
    setFiles((prev) => {
      const next = [...prev];
      clearSlotUrl(idx);
      fileUrlsRef.current[idx] = url;
      next[idx] = url;
      return next;
    });
    setPhase('layout');
    setSlotPickIdx(null);
  };

  const pickSlotPhoto = (idx) => {
    setSlotPickIdx(idx);
    singleFileInputRef.current?.click();
  };

  const startCameraForSavedColor = (item) => {
    if (!item?.hex) return;
    setFinalHex(item.hex);
    setCurrentHex(item.hex);
    setHexLocked(true);
    setReturnPhase('saved');
    setLayoutId('mosaic');
    openMultiPicker();
  };

  const handleHeaderBack = () => {
    if (phase === 'layout') {
      setPhase(returnPhase === 'saved' ? 'saved' : 'ready');
      if (returnPhase === 'saved') {
        setFiles(Array(MAX_PHOTOS).fill(null));
        cleanupUrls();
      }
      return;
    }
    if (phase === 'saved') {
      leaveSavedPage();
      return;
    }
    onClose?.();
  };

  const canSave = phase === 'ready' || phase === 'layout';
  const displayHex = phase === 'spin' ? currentHex : finalHex;
  const showColorBackdrop = phase === 'spin' || phase === 'ready';
  const showPaperBackdrop = phase === 'layout' || phase === 'saved';

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Color Walk"
    >
      {showColorBackdrop && (
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: displayHex }}
          aria-hidden
        />
      )}

      {showPaperBackdrop && <div className="absolute inset-0 bg-zen-paper" aria-hidden />}
      {showColorBackdrop && <div className="absolute inset-0 bg-black/18" aria-hidden />}

      {phase !== 'saved' && (
        <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleHeaderBack();
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
                showPaperBackdrop
                  ? 'border-zen-ink/15 bg-white text-zen-ink hover:bg-zen-mist'
                  : 'border-white/35 bg-black/20 text-white hover:bg-black/30'
              }`}
              aria-label={phase === 'layout' ? '返回上一步' : '关闭 Color Walk'}
            >
              {phase === 'layout' ? <ArrowLeft size={18} strokeWidth={2} aria-hidden /> : <X size={18} strokeWidth={2} aria-hidden />}
            </button>

            {canSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void performSave(finalHex);
                }}
                disabled={savedSaving}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-extralight backdrop-blur-md transition-colors disabled:opacity-50 ${
                  showPaperBackdrop
                    ? 'border-zen-ink/15 bg-white text-zen-ink hover:bg-zen-mist'
                    : 'border-white/35 bg-black/20 text-white hover:bg-black/30'
                }`}
                aria-label="储存当前颜色"
              >
                {savedSaving ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Bookmark size={14} strokeWidth={2} aria-hidden />
                )}
                储存
              </button>
            )}
          </div>

          {phase === 'layout' && !hexLocked ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHexLocked(false);
                setReturnPhase('ready');
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
      )}

      {phase === 'saved' ? (
        <ColorWalkSavedColorsPage
          slots={savedSlots}
          full={savedFull}
          loading={savedLoading}
          saving={savedSaving}
          deletingId={deletingId}
          onBack={leaveSavedPage}
          onClose={() => onClose?.()}
          onDelete={(id) => {
            void removeById(id);
          }}
          onCamera={startCameraForSavedColor}
        />
      ) : phase !== 'layout' ? (
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6"
          onClick={phase === 'ready' ? reroll : undefined}
        >
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
                <p className="mt-1 text-xs font-extralight tracking-[0.08em] text-white/85">{finalKnowledge}</p>
                <p className="mt-2 text-sm font-extralight text-white/80">点击空白可重抽颜色</p>
              </>
            )}
          </div>

          {phase === 'ready' && (
            <button
              type="button"
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-black/25 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHexLocked(false);
                setReturnPhase('ready');
                openMultiPicker();
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
                openMultiPicker();
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
              {layoutId === 'mosaic' && <PaletteMosaic files={files} onPickAt={pickSlotPhoto} />}
              {layoutId === 'columns' && <PaletteColumns files={files} onPickAt={pickSlotPhoto} />}
              {layoutId === 'strip' && <PaletteStrip files={files} onPickAt={pickSlotPhoto} />}

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
        ref={multiFileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={onPickPhotos}
      />
      <input
        ref={singleFileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={onPickSinglePhoto}
      />
    </div>
  );
}
