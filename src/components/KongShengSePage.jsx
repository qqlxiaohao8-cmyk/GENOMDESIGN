import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Shuffle, Bookmark, Send } from 'lucide-react';
import ColorCardSealColumns from './ColorCardSealColumns';
import { ColorCardFrame } from './shared/ColorCardDetailLayout';
import { randomPaletteHarmony, quickFallbackPalette, normalizeHex, KONGSHENG_HARMONY_TYPES } from '../lib/randomInspiration';

const PALETTE_COUNT = 5;
const STORAGE_KEY = 'genom-kongsheng-palette-v1';

const HARMONY_CHIPS = [
  {
    id: null,
    short: '混合',
    title: 'Random harmony each time; lightness and saturation vary freely.',
  },
  ...KONGSHENG_HARMONY_TYPES,
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function copyTextToClipboard(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.palette) && parsed.palette.length === PALETTE_COUNT) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function persistState(palette, locked, harmonyFilter) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ palette, locked, harmonyFilter })
    );
  } catch { /* ignore */ }
}

/**
 * 空生色：全屏五色印章；空格重新生成（锁定列保留）；和声芯片。
 *
 * @param {object} props
 * @param {(payload: object) => void} [props.onStartChallenge]
 * @param {() => void} [props.onGoExtract]
 * @param {Array<string> | null} [props.seedPalette]       外部传入的种子色（色海「生成相似」）
 * @param {() => void} [props.onSeedConsumed]              seed 消费完告知父级清空
 * @param {(hexes: string[]) => Promise<{ ok: boolean, error?: string }> | void} [props.onSaveToVault]
 * @param {(hexes: string[]) => void} [props.onPublishPalette]
 */
export default function KongShengSePage({
  onStartChallenge,
  onGoExtract,
  seedPalette = null,
  onSeedConsumed,
  onSaveToVault,
  onPublishPalette,
}) {
  const [harmonyFilter, setHarmonyFilter] = useState(() => {
    const s = loadPersistedState();
    return s?.harmonyFilter ?? null;
  });

  const [palette, setPalette] = useState(() => {
    const s = loadPersistedState();
    return s?.palette ?? quickFallbackPalette(PALETTE_COUNT);
  });
  const [paletteBooting, setPaletteBooting] = useState(() => !loadPersistedState()?.palette);

  useEffect(() => {
    if (!paletteBooting) return undefined;
    let cancelled = false;
    const id = window.setTimeout(() => {
      try {
        const next = randomPaletteHarmony(PALETTE_COUNT, { maxAttempts: 20, minBeauty: 65 });
        if (!cancelled) setPalette(next);
      } catch { /* keep fallback */ }
      if (!cancelled) setPaletteBooting(false);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [paletteBooting]);

  const [locked, setLocked] = useState(() => {
    const s = loadPersistedState();
    return Array.isArray(s?.locked) && s.locked.length === PALETTE_COUNT
      ? s.locked
      : Array.from({ length: PALETTE_COUNT }, () => false);
  });

  const [copiedHex, setCopiedHex] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const seedConsumedRef = useRef(null);

  useEffect(() => {
    persistState(palette, locked, harmonyFilter);
  }, [palette, locked, harmonyFilter]);

  /* ── 外部 seed：色海「生成相似」→ 以 seed 为初始 palette，并以其首色为根用和声衍生变化 ── */
  useEffect(() => {
    if (!Array.isArray(seedPalette) || seedPalette.length < 3) return;
    const key = seedPalette.join('|');
    if (seedConsumedRef.current === key) return;
    seedConsumedRef.current = key;
    const normalized = seedPalette
      .slice(0, PALETTE_COUNT)
      .map((h) => ({ hex: normalizeHex(String(h || '#888888')) }));
    while (normalized.length < PALETTE_COUNT) normalized.push(normalized[normalized.length - 1]);
    setPalette(normalized);
    setLocked(Array.from({ length: PALETTE_COUNT }, () => false));
    onSeedConsumed?.();
  }, [seedPalette, onSeedConsumed]);

  const buildOpts = useCallback(
    () => {
      const opts = {};
      if (harmonyFilter) opts.harmonyId = harmonyFilter;
      const lockedEntries = palette.filter((_, i) => locked[i]);
      if (lockedEntries.length > 0) opts.lockedColors = lockedEntries;
      return opts;
    },
    [harmonyFilter, palette, locked]
  );

  const regenPaletteWithLocks = useCallback(() => {
    const next = randomPaletteHarmony(PALETTE_COUNT, buildOpts());
    setPalette((prev) => prev.map((c, i) => (locked[i] ? c : next[i])));
  }, [locked, buildOpts]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          (typeof t.isContentEditable === 'boolean' && t.isContentEditable))
      ) {
        return;
      }
      e.preventDefault();
      regenPaletteWithLocks();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regenPaletteWithLocks]);

  const handleCopyHex = useCallback((c) => {
    const hex = normalizeHex(c?.hex || '#000000');
    copyTextToClipboard(hex);
    setCopiedHex(hex);
    window.setTimeout(() => setCopiedHex(null), 2000);
  }, []);

  const handleToggleLock = useCallback((index) => {
    setLocked((prev) => {
      const next = [...prev];
      if (index < 0 || index >= PALETTE_COUNT) return prev;
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleShoot = useCallback(
    (c) => {
      const hex = normalizeHex(c?.hex || '#000000');
      const label = typeof c?.label === 'string' ? c.label : typeof c?.name === 'string' ? c.name : '';
      onStartChallenge?.({
        id: uid(),
        mode: 'single',
        hex,
        funName: label || '',
      });
      onGoExtract?.();
    },
    [onStartChallenge, onGoExtract]
  );

  const applyPaletteOpts = (nextHarmony) => {
    setHarmonyFilter(nextHarmony);
    const lockedEntries = palette.filter((_, i) => locked[i]);
    const opts = {
      ...(nextHarmony ? { harmonyId: nextHarmony } : {}),
      ...(lockedEntries.length > 0 ? { lockedColors: lockedEntries } : {}),
    };
    setPalette((prev) => {
      const next = randomPaletteHarmony(PALETTE_COUNT, opts);
      return prev.map((c, i) => (locked[i] ? c : next[i]));
    });
  };

  const harmonyHint =
    harmonyFilter == null
      ? '和声 混合'
      : KONGSHENG_HARMONY_TYPES.find((h) => h.id === harmonyFilter)?.labelZh ||
        KONGSHENG_HARMONY_TYPES.find((h) => h.id === harmonyFilter)?.label ||
        '';

  const paletteHexes = palette.map((c) => normalizeHex(c?.hex || '#000000'));

  const handleRegen = regenPaletteWithLocks;

  const handleSave = useCallback(async () => {
    if (saveBusy || !onSaveToVault) return;
    setSaveBusy(true);
    setSaveToast(null);
    try {
      const res = await onSaveToVault(paletteHexes);
      if (res && res.ok === false) {
        setSaveToast({ ok: false, text: res.error || '保存失败，请稍后再试。' });
      } else {
        setSaveToast({ ok: true, text: '已存入你的色卡藏品。' });
      }
    } catch (err) {
      setSaveToast({ ok: false, text: err?.message || '保存失败。' });
    } finally {
      setSaveBusy(false);
      window.setTimeout(() => setSaveToast(null), 3000);
    }
  }, [onSaveToVault, paletteHexes, saveBusy]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:overflow-y-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 bg-zen-mist" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-0 hidden md:block bg-cover bg-center bg-no-repeat opacity-[0.14]"
        style={{ backgroundImage: 'url(/kongsheng-mist-ink.png)' }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0 hidden md:block bg-white/[0.12]" aria-hidden />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:overflow-y-hidden">
        <div className="shrink-0 px-2 pt-1 pb-1 space-y-1 max-w-full">
          <p className="text-[9px] font-extralight uppercase tracking-[0.2em] text-zen-ink/40 text-center">
            色轮和声
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {HARMONY_CHIPS.map((f) => {
              const active = harmonyFilter === f.id;
              return (
                <button
                  key={f.id ?? 'harmony-mix'}
                  type="button"
                  title={'title' in f ? f.title : undefined}
                  onClick={() => applyPaletteOpts(f.id)}
                  className={`rounded-full px-2.5 py-1 text-[9px] font-extralight uppercase tracking-wider border transition-colors duration-[2000ms] ${
                    active
                      ? 'border-zen-vermilion/50 bg-zen-vermilion/12 text-zen-ink'
                      : 'border-zen-ink/12 bg-white/60 text-zen-ink/55 hover:border-zen-ink/20 hover:text-zen-ink/80'
                  }`}
                >
                  {f.short}
                </button>
              );
            })}
          </div>
        </div>
        {/* 与编辑 / 色海页保持一致的色卡排版：色卡区占视口 2/3 高，
            5 列以 色卡.svg（slice）拉满列高，每列以 swatch 底色填充窄缘留白。 */}
        <div
          className="flex w-full shrink-0 items-stretch px-0 pt-1 sm:px-2"
          style={{ height: '66.67dvh' }}
        >
          <ColorCardFrame>
            <ColorCardSealColumns
              interactive
              fillParent
              colors={palette}
              locked={locked}
              onToggleLock={handleToggleLock}
              onCopyHex={handleCopyHex}
              onShoot={handleShoot}
              copiedHex={copiedHex}
            />
          </ColorCardFrame>
        </div>
        <p className="sr-only" aria-live="polite">
          {copiedHex ? `已复制 ${copiedHex}` : ''}
        </p>

        {/* 底部动作卡 · 与编辑 / 色海 页保持一致的排版结构 */}
        <div className="mx-auto mt-2 w-full max-w-2xl shrink-0 px-2 pb-2">
          <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper/85 p-3 shadow-sm">
            <p className="mb-2 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/55">
              空生色 · 使用这组色卡
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleRegen}
                className="flex flex-col items-start gap-1 rounded-xl border border-zen-ink/15 bg-white/80 px-3 py-2.5 text-left transition-colors hover:border-zen-ink/35"
              >
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zen-ink">
                  <Shuffle size={14} aria-hidden /> 再生成
                </span>
                <span className="text-[10px] font-extralight text-zen-ink/55">
                  按空格亦可 · 保留锁定列
                </span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!onSaveToVault || saveBusy}
                className="flex flex-col items-start gap-1 rounded-xl border border-zen-ink/15 bg-white/80 px-3 py-2.5 text-left transition-colors hover:border-zen-ink/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zen-ink">
                  <Bookmark size={14} aria-hidden /> {saveBusy ? '保存中…' : '存入色卡藏品'}
                </span>
                <span className="text-[10px] font-extralight text-zen-ink/55">
                  把现在这组色卡加入「藏」
                </span>
              </button>

              <button
                type="button"
                onClick={() => onPublishPalette?.(paletteHexes)}
                disabled={!onPublishPalette}
                className="flex flex-col items-start gap-1 rounded-xl border border-zen-ink/15 bg-white/80 px-3 py-2.5 text-left transition-colors hover:border-zen-ink/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zen-ink">
                  <Send size={14} aria-hidden /> 发布到色海
                </span>
                <span className="text-[10px] font-extralight text-zen-ink/55">
                  取一张参考图 · 进入发布编辑页
                </span>
              </button>
            </div>
            {saveToast ? (
              <p
                role="status"
                className={`mt-2 text-[10px] font-extralight uppercase tracking-widest ${
                  saveToast.ok ? 'text-zen-ink/60' : 'text-red-600'
                }`}
              >
                {saveToast.text}
              </p>
            ) : null}
          </div>
        </div>

        <p className="pointer-events-none shrink-0 select-none px-2 py-1 text-center text-[9px] font-extralight uppercase tracking-[0.28em] text-zen-ink/38 leading-snug">
          空格 · 新一卡 · {harmonyHint} · 明暗饱和度每次随机
        </p>
      </div>
    </div>
  );
}
