import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, Sparkles, Loader2, Heart, Shuffle } from 'lucide-react';
import ColorCardDetailLayout from './shared/ColorCardDetailLayout';

const MIST_EXIT_MS = 520;

/**
 * 色海 · 色卡详情
 *
 * 改用统一的 ColorCardDetailLayout 排版：
 *  - 顶栏左：关闭。
 *  - 顶栏中：色卡标题。
 *  - 顶栏右：下载 PNG 与（如有）跳回析色的 Open in Extract。
 *  - 底部动作卡：收藏色卡（like）、生成相似（跳空生色，以当前色为 seed）。
 */
export default function ColorCardPreviewOverlay({
  imageSrc: _imageSrc,
  colorCardData,
  onClose,
  onCopySwatch: _onCopySwatch,
  copiedHex: _copiedHex,
  onDownload,
  downloadBusy,
  onOpenInExtract,
  openInExtractBusy = false,
  // 色海新动作
  onToggleFavorite,
  isFavorite = false,
  favoriteBusy = false,
  onGenerateSimilar,
}) {
  const colors = colorCardData?.colors;
  const colorsList = useMemo(() => {
    if (!Array.isArray(colors)) return [];
    return colors.map((c) => ({ ...c }));
  }, [colors]);

  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      onClose?.();
    }, MIST_EXIT_MS);
  }, [exiting, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const paletteTitle = useMemo(() => {
    const t = colorCardData?.title || colorCardData?.paletteTitle;
    return typeof t === 'string' && t.trim() ? t.trim() : null;
  }, [colorCardData]);

  if (!colorsList.length) return null;

  const mistAnim = exiting ? 'animate-color-card-mist-scatter' : 'animate-color-card-mist-gather';

  const topBarLeft = (
    <button
      type="button"
      onClick={handleClose}
      className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/85 px-3 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white"
      aria-label="关闭"
    >
      <X size={14} aria-hidden /> 关闭
    </button>
  );

  const topBarCenter = paletteTitle ? (
    <span
      className="min-w-0 max-w-full truncate px-3 py-1.5 font-zenSerif text-sm font-medium tracking-[0.32em] text-zen-ink"
      lang="zh-Hans"
    >
      {paletteTitle}
    </span>
  ) : (
    <span className="font-zenSerif text-xs font-extralight uppercase tracking-[0.32em] text-zen-ink/60">
      Color card
    </span>
  );

  const topBarRight = (
    <div className="flex items-center gap-1.5">
      {typeof onOpenInExtract === 'function' ? (
        <button
          type="button"
          onClick={() => void onOpenInExtract()}
          disabled={openInExtractBusy}
          className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/85 px-3 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white disabled:opacity-50"
          aria-label="在析色中打开"
        >
          {openInExtractBusy ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={13} aria-hidden />
          )}
          析色
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDownload}
        disabled={downloadBusy}
        className="inline-flex items-center gap-1.5 rounded-full bg-zen-ink px-3 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-white shadow-sm hover:brightness-110 disabled:opacity-50"
        aria-label="下载 PNG"
      >
        {downloadBusy ? (
          <Loader2 size={13} className="animate-spin" aria-hidden />
        ) : (
          <Download size={13} aria-hidden />
        )}
        PNG
      </button>
    </div>
  );

  const bottomSlot = (
    <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper/85 p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/55">
        色海 · 使用这组色卡
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={!onToggleFavorite || favoriteBusy}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[12px] font-medium text-zen-ink transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isFavorite
              ? 'border-zen-vermilion/70 bg-zen-vermilion/[0.08] ring-2 ring-zen-vermilion/20'
              : 'border-zen-ink/15 bg-white/80 hover:border-zen-ink/35'
          }`}
          aria-pressed={isFavorite}
        >
          {favoriteBusy ? (
            <Loader2 className="animate-spin" size={14} aria-hidden />
          ) : (
            <Heart
              size={14}
              aria-hidden
              className={isFavorite ? 'fill-zen-vermilion text-zen-vermilion' : ''}
            />
          )}
          {isFavorite ? '已收藏色卡' : '收藏色卡'}
        </button>

        <button
          type="button"
          onClick={onGenerateSimilar}
          disabled={!onGenerateSimilar}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zen-ink/15 bg-white/80 px-3 py-3 text-[12px] font-medium text-zen-ink transition-colors hover:border-zen-ink/35 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Shuffle size={14} aria-hidden />
          生成相似
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[190] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="色卡预览"
    >
      <button
        type="button"
        className={`absolute inset-0 z-0 bg-zen-ink/40 backdrop-blur-md backdrop-saturate-150 transition-opacity duration-[520ms] ease-out ${
          exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-label="关闭预览"
        onClick={handleClose}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden ${mistAnim}`}
        aria-hidden
      >
        <div className="absolute -inset-[35%] bg-[radial-gradient(ellipse_75%_55%_at_50%_42%,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.32)_40%,rgba(255,255,255,0.08)_58%,transparent_76%)]" />
        <div className="absolute -inset-[25%] bg-[radial-gradient(circle_at_28%_58%,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.18)_48%,transparent_62%)] opacity-100" />
        <div className="absolute -inset-[20%] bg-[radial-gradient(circle_at_72%_48%,rgba(252,252,254,0.62)_0%,rgba(255,255,255,0.14)_45%,transparent_58%)] opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_55%,rgba(255,255,255,0.22)_0%,transparent_55%)]" />
      </div>
      <div
        className={`relative z-10 flex h-full w-full flex-col transition-opacity duration-300 ease-out ${
          exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <ColorCardDetailLayout
          topBarLeft={topBarLeft}
          topBarCenter={topBarCenter}
          topBarRight={topBarRight}
          colors={colorsList}
          paletteTitle={paletteTitle}
          showPaletteHeading={!!paletteTitle}
          bottomSlot={bottomSlot}
          className="bg-transparent"
        />
      </div>
    </div>
  );
}
