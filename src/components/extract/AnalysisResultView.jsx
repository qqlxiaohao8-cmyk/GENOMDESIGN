import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Pipette, Sparkles, Shuffle, RotateCcw } from 'lucide-react';
import { sampleHexAtNormalizedPoint } from '../../lib/dominantColors';
import { extractAllStrategiesFromDataUrl } from '../../lib/paletteExtract';
import { HARMONY_TYPES, harmonyPaletteFive } from '../../lib/colorHarmony';
import { normalizeHex } from '../../lib/randomInspiration';
import { pickReadableTextOnHex } from '../../lib/colorValues';

/** 三档选项组的 ID */
const MODE_TABS = [
  { id: 'manual', label: '手动取色', icon: Pipette, hint: '点击色格 → 在图上拖动圆圈' },
  { id: 'variants', label: '算法样式', icon: Shuffle, hint: '基于同一张图的不同取色结果' },
  { id: 'theory', label: '设计学配色', icon: Sparkles, hint: '以主色延伸出的和声组合' },
];

/**
 * 析色 · 分析结果页
 *
 * @param {object} props
 * @param {string} props.imageSrc               data URL / 公开 URL
 * @param {string[]} props.hexes                5 色初始 hex
 * @param {(hexes: string[]) => void} props.onHexesChange
 * @param {() => void} props.onBack             返回上一步（会清空图片与色卡）
 * @param {() => void} props.onConfirm          进入发布编辑页
 */
export default function AnalysisResultView({
  imageSrc,
  hexes,
  onHexesChange,
  onBack,
  onConfirm,
}) {
  const [modeTab, setModeTab] = useState('manual');

  /* ── 手动取色 ── */
  const [activeSwatchIdx, setActiveSwatchIdx] = useState(null);
  const [pickPoints, setPickPoints] = useState(() => Array(5).fill(null)); // {x:0..1,y:0..1}

  /* ── 算法变体（多种策略，各自产出显著不同的搭配） ── */
  const [variants, setVariants] = useState(null); // Array<{ id, label, hint, hexes: string[] }>
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  /* ── 设计学 ── */
  const [theoryBaseIdx, setTheoryBaseIdx] = useState(0);
  const [theoryType, setTheoryType] = useState('analogous');
  const [theorySeed, setTheorySeed] = useState(0);

  const imageRef = useRef(null);

  /* 首次切到 variants 时加载策略变体（harmonic / dominant / tonal / accent / harmony） */
  useEffect(() => {
    if (modeTab !== 'variants' || variants || variantsLoading || !imageSrc) return;
    let cancelled = false;
    setVariantsLoading(true);
    extractAllStrategiesFromDataUrl(imageSrc)
      .then((res) => {
        if (cancelled) return;
        const clean = Array.isArray(res?.variants)
          ? res.variants.filter((v) => Array.isArray(v.hexes) && v.hexes.length >= 5)
          : [];
        setVariants(clean.length ? clean : null);
      })
      .catch(() => {
        if (!cancelled) setVariants(null);
      })
      .finally(() => {
        if (!cancelled) setVariantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modeTab, variants, variantsLoading, imageSrc]);

  /* ── 手动取色：图片点击 / 拖动 ── */
  const pickFromEvent = useCallback(
    async (e) => {
      if (modeTab !== 'manual' || activeSwatchIdx == null || !imageSrc) return;
      const el = imageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pt = 'touches' in e ? e.touches[0] : e;
      if (!pt) return;
      const x = (pt.clientX - rect.left) / rect.width;
      const y = (pt.clientY - rect.top) / rect.height;
      const cx = Math.max(0, Math.min(1, x));
      const cy = Math.max(0, Math.min(1, y));
      try {
        const hex = await sampleHexAtNormalizedPoint(imageSrc, cx, cy);
        if (hex) {
          const next = [...hexes];
          next[activeSwatchIdx] = hex;
          onHexesChange(next);
          setPickPoints((prev) => {
            const n = [...prev];
            n[activeSwatchIdx] = { x: cx, y: cy };
            return n;
          });
        }
      } catch {
        /* noop */
      }
    },
    [modeTab, activeSwatchIdx, hexes, imageSrc, onHexesChange]
  );

  /* ── 变体切换 ── */
  const applyVariant = (variant) => {
    if (!variant?.hexes?.length) return;
    setSelectedVariantId(variant.id);
    onHexesChange(variant.hexes.slice(0, 5));
  };

  /* ── 设计学：变更基色 / 类型 / seed ── */
  const theoryHexes = useMemo(() => {
    const base = hexes[theoryBaseIdx] || hexes[0] || '#8899AA';
    try {
      const result = harmonyPaletteFive(base, theoryType, theorySeed);
      return result?.hexes?.slice(0, 5) || null;
    } catch {
      return null;
    }
  }, [hexes, theoryBaseIdx, theoryType, theorySeed]);

  const applyTheory = () => {
    if (theoryHexes?.length === 5) onHexesChange(theoryHexes);
  };

  const rerollTheory = () => {
    setTheorySeed((s) => (s + Math.floor(Math.random() * 9991) + 7) >>> 0);
  };

  return (
    <div className="flex h-full w-full flex-col bg-zen-mist">
      {/* 顶部栏 */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zen-ink/10 bg-zen-paper/85 px-3 py-2.5 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/80 px-3 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white"
        >
          <ArrowLeft size={14} aria-hidden /> 返回
        </button>
        <p className="font-zenSerif text-sm font-medium tracking-[0.36em] text-zen-ink/80" lang="zh-Hans">
          析色结果
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-full bg-zen-ink px-4 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-white shadow-sm hover:brightness-110"
        >
          确认 <Check size={14} aria-hidden />
        </button>
      </header>

      {/* 主体滚动区 */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-8 pt-3 sm:px-5">
        {/* 1. 用户图 */}
        <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-zen-ink/10 bg-zen-paper/60 shadow-sm">
          <div
            className="relative w-full"
            style={{ aspectRatio: '4 / 3' }}
            onPointerDown={modeTab === 'manual' && activeSwatchIdx != null ? pickFromEvent : undefined}
            onPointerMove={(e) => {
              if (modeTab !== 'manual' || activeSwatchIdx == null) return;
              if (e.buttons !== 1 && !('touches' in e)) return;
              pickFromEvent(e);
            }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="上传的参考图"
              draggable={false}
              className={`absolute inset-0 h-full w-full select-none object-contain ${
                modeTab === 'manual' && activeSwatchIdx != null ? 'cursor-crosshair' : ''
              }`}
            />
            {/* 取色定位圆圈 */}
            {modeTab === 'manual' && activeSwatchIdx != null && pickPoints[activeSwatchIdx] ? (
              <span
                aria-hidden
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${pickPoints[activeSwatchIdx].x * 100}%`,
                  top: `${pickPoints[activeSwatchIdx].y * 100}%`,
                  width: 22,
                  height: 22,
                  backgroundColor: normalizeHex(hexes[activeSwatchIdx] || '#888'),
                }}
              />
            ) : null}
            {modeTab === 'manual' && activeSwatchIdx != null ? (
              <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-extralight uppercase tracking-widest text-white">
                点击或拖动以取色 · 当前第 {activeSwatchIdx + 1} 格
              </span>
            ) : null}
          </div>
        </div>

        {/* 2. 简约五色带 */}
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-full border border-zen-ink/10 shadow-sm">
            <div className="flex h-16 w-full items-stretch sm:h-20">
              {hexes.map((h, i) => {
                const hex = normalizeHex(h);
                const text = pickReadableTextOnHex(hex);
                const active = modeTab === 'manual' && activeSwatchIdx === i;
                return (
                  <button
                    key={`sw-${i}`}
                    type="button"
                    onClick={() => {
                      if (modeTab === 'manual') {
                        setActiveSwatchIdx((prev) => (prev === i ? null : i));
                      } else if (modeTab === 'theory') {
                        setTheoryBaseIdx(i);
                      } else {
                        setActiveSwatchIdx(i);
                      }
                    }}
                    style={{ backgroundColor: hex, color: text }}
                    aria-label={`色 ${i + 1} ${hex}`}
                    className={`relative flex-1 border-r border-white/20 px-1 text-[10px] font-extralight uppercase tracking-widest transition-[transform,box-shadow] last:border-r-0 focus:outline-none ${
                      active ? 'ring-2 ring-inset ring-white/90 brightness-110' : ''
                    } ${modeTab === 'theory' && theoryBaseIdx === i ? 'ring-2 ring-inset ring-white/90' : ''}`}
                  >
                    <span className="font-mono tabular-nums">{hex}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] font-extralight uppercase tracking-widest text-zen-ink/50">
            {modeTab === 'manual'
              ? activeSwatchIdx == null
                ? '点击一格开启手动取色'
                : '在上方图片上点击或拖动以取色'
              : modeTab === 'theory'
                ? `点击一格以选为配色基色 · 当前基色 第 ${theoryBaseIdx + 1} 格`
                : '已根据算法样式更新色卡'}
          </p>
        </div>

        {/* 3. 三段选项 */}
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-zen-ink/10 bg-zen-paper/85 p-3 shadow-sm sm:p-4">
          <div role="tablist" aria-label="取色自定义模式" className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-zen-ink/[0.05] p-1">
            {MODE_TABS.map((t) => {
              const Icon = t.icon;
              const active = modeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => {
                    setModeTab(t.id);
                    if (t.id !== 'manual') setActiveSwatchIdx(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] font-extralight uppercase tracking-widest transition-colors ${
                    active ? 'bg-white text-zen-ink shadow-sm' : 'text-zen-ink/60 hover:text-zen-ink'
                  }`}
                >
                  <Icon size={13} aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 手动取色 */}
          {modeTab === 'manual' ? (
            <div className="text-xs text-zen-ink/80">
              <p className="font-zenSerif text-[13px] leading-relaxed">
                点击下方色卡任一格，进入取色模式：在上方图片上点击或拖动即可替换为图中任意像素的颜色，松手后圆圈会停留在所选位置。
              </p>
              {activeSwatchIdx != null ? (
                <button
                  type="button"
                  onClick={() => setActiveSwatchIdx(null)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/80 px-3 py-1 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/80 hover:bg-white"
                >
                  结束本次取色
                </button>
              ) : null}
            </div>
          ) : null}

          {/* 算法样式 · 5 种策略各自产出明显不同的搭配 */}
          {modeTab === 'variants' ? (
            <div>
              <p className="mb-3 text-[11px] font-extralight uppercase tracking-widest text-zen-ink/55">
                同一张图的不同取色策略 · 点选即可应用到色卡
              </p>
              {variantsLoading || !variants ? (
                <div className="flex items-center justify-center py-8 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/50">
                  正在生成算法变体…
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {variants.map((variant) => {
                    const active = selectedVariantId === variant.id;
                    return (
                      <li key={`var-${variant.id}`}>
                        <button
                          type="button"
                          onClick={() => applyVariant(variant)}
                          className={`flex w-full items-center gap-2 overflow-hidden rounded-2xl border p-2 text-left transition-all ${
                            active
                              ? 'border-zen-ink/70 bg-white shadow-sm'
                              : 'border-zen-ink/10 bg-zen-paper/50 hover:border-zen-ink/30'
                          }`}
                        >
                          <span className="flex min-w-[78px] flex-col gap-0.5 px-1">
                            <span className="font-zenSerif text-[12px] font-medium text-zen-ink">
                              {variant.label}
                            </span>
                            <span className="text-[9px] font-extralight uppercase tracking-widest text-zen-ink/55">
                              {variant.hint}
                            </span>
                          </span>
                          <span className="flex h-9 flex-1 overflow-hidden rounded-full border border-zen-ink/5">
                            {variant.hexes.slice(0, 5).map((h, j) => (
                              <span
                                key={`var-${variant.id}-${j}`}
                                className="flex-1"
                                style={{ backgroundColor: normalizeHex(h) }}
                              />
                            ))}
                          </span>
                          {active ? <Check className="mr-1 text-zen-ink" size={14} aria-hidden /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {/* 设计学配色 */}
          {modeTab === 'theory' ? (
            <div>
              <p className="mb-3 text-[11px] font-extralight uppercase tracking-widest text-zen-ink/55">
                选择基色（点上方色卡一格）+ 和声类型，得到更具设计感的五色组。
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {HARMONY_TYPES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setTheoryType(h.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                      theoryType === h.id
                        ? 'border-zen-ink/80 bg-zen-ink text-white'
                        : 'border-zen-ink/15 bg-zen-paper/70 text-zen-ink/75 hover:border-zen-ink/35'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {theoryHexes ? (
                <div className="mb-3 flex h-10 overflow-hidden rounded-full border border-zen-ink/10">
                  {theoryHexes.map((h, i) => (
                    <span key={`th-${i}`} className="flex-1" style={{ backgroundColor: normalizeHex(h) }} />
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyTheory}
                  disabled={!theoryHexes}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zen-ink px-4 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-white disabled:opacity-40"
                >
                  <Check size={14} aria-hidden /> 应用到色卡
                </button>
                <button
                  type="button"
                  onClick={rerollTheory}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/80 px-4 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white"
                >
                  <RotateCcw size={14} aria-hidden /> 再生成一次
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
