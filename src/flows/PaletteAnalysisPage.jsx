import React, { useMemo } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import PaletteAnalysisStrip from '../components/PaletteAnalysisStrip';
import { formatLikeCount } from '../components/PaletteFeedCard';
import { buildPaletteAnalysis } from '../lib/paletteAnalysisContent';

/**
 * 收藏 · 色卡分析：名称/简介、大型色卡、分色解读与整体语义。
 */
export default function PaletteAnalysisPage({
  item,
  exploreFeed = [],
  onBack,
  onUnfavorite,
  unfavoriteBusy = false,
}) {
  const analysis = useMemo(
    () => buildPaletteAnalysis(item, { exploreFeed }),
    [item, exploreFeed],
  );

  if (!analysis) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zen-paper px-6">
        <p className="type-body text-zen-ink/50">无法读取色卡数据</p>
        <button type="button" onClick={onBack} className="type-flow-action mt-4">
          返回
        </button>
      </div>
    );
  }

  const { title, intro, colors, meaning, psychology, usage, tags, likeCount } = analysis;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper overflow-hidden">
      <div className="shrink-0 flex items-center border-b border-zen-ink/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="type-flow-action flex items-center gap-1.5 hover:text-zen-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          返回
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-[max(5rem,env(safe-area-inset-bottom,0px))] md:px-6 md:py-8">
          {/* 标题区 */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-zenSerif text-3xl font-medium tracking-tight text-zen-ink md:text-4xl">
                {title}
              </h1>
              <p className="type-body mt-3 max-w-xl text-zen-ink/65">{intro}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:pt-1">
              <button
                type="button"
                onClick={onUnfavorite}
                disabled={unfavoriteBusy}
                className="flex items-center gap-2 rounded-full border border-zen-ink/10 bg-white px-3 py-2 text-zen-vermilion transition-colors hover:bg-zen-vermilion/5 disabled:opacity-40"
                aria-label="从收藏中移除"
              >
                <Bookmark size={16} strokeWidth={2} fill="currentColor" aria-hidden />
                <span className="text-[11px] font-extralight">已收藏</span>
              </button>
              <p className="type-caption tabular-nums text-zen-ink/45">
                {formatLikeCount(likeCount)} 人收藏
              </p>
            </div>
          </div>

          {/* 大型色卡 */}
          <PaletteAnalysisStrip colors={colors} className="mb-8" />

          {/* 分色 + 语义 */}
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <section aria-label="单色解读">
              <h2 className="type-overline mb-4">单色</h2>
              <ul className="space-y-5">
                {colors.map((c) => (
                  <li
                    key={c.hex}
                    className="border-b border-zen-ink/[0.06] pb-5 last:border-0 last:pb-0"
                  >
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-zen-ink/10"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden
                      />
                      <span className="font-zenSerif text-base font-medium text-zen-ink">
                        {c.name}
                      </span>
                      <span className="text-[11px] font-extralight tabular-nums text-zen-ink/45">
                        {c.hex}
                      </span>
                    </div>
                    <p className="type-body-sm pl-5 text-zen-ink/60">{c.intro}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="色卡语义" className="space-y-6">
              <div>
                <h2 className="type-overline mb-2">意思</h2>
                <p className="type-body-sm text-zen-ink/70">{meaning}</p>
              </div>
              <div>
                <h2 className="type-overline mb-2">心理</h2>
                <p className="type-body-sm text-zen-ink/70">{psychology}</p>
              </div>
              <div>
                <h2 className="type-overline mb-2">可用作</h2>
                <p className="type-body-sm whitespace-pre-line text-zen-ink/70">{usage}</p>
              </div>
              {tags.length > 0 && (
                <div>
                  <h2 className="type-overline mb-2">标签</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zen-mist px-2.5 py-1 text-[11px] font-extralight text-zen-ink/65"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
