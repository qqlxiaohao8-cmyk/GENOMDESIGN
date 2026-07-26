import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import PaletteAnalysisStrip from '../components/PaletteAnalysisStrip';
import SingleColorCardOverlay from '../components/SingleColorCardOverlay';
import { formatLikeCount } from '../components/PaletteFeedCard';
import {
  buildPaletteAnalysis,
  resolvePublicStyleId,
} from '../lib/paletteAnalysisContent';
import { useStyleLikeCount } from '../hooks/useStyleLikeCount';

/**
 * 收藏 · 色卡分析：标题、大型色卡、单色列表与标签；点击颜色打开单色色卡。
 */
export default function PaletteAnalysisPage({
  item,
  exploreFeed = [],
  onBack,
  onUnfavorite,
  unfavoriteBusy = false,
  onFindSimilarPalettes,
  onLikeCountUpdate,
}) {
  const [selectedColor, setSelectedColor] = useState(null);

  const publicStyleId = useMemo(() => resolvePublicStyleId(item), [item]);
  const { likeCount: liveLikeCount } = useStyleLikeCount(publicStyleId, {
    initialCount: resolveInitialLikeCount(item, exploreFeed, publicStyleId),
    onUpdate: onLikeCountUpdate,
  });

  const analysis = useMemo(
    () => buildPaletteAnalysis(item, {
      exploreFeed,
      likeCountOverride: liveLikeCount,
    }),
    [item, exploreFeed, liveLikeCount],
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

  const { title, colors, tags, likeCount } = analysis;

  const openColor = (c) => {
    const full = colors.find((x) => x.hex === c.hex) || c;
    setSelectedColor(full);
  };

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
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-zenSerif text-3xl font-medium tracking-tight text-zen-ink md:text-4xl">
                {title}
              </h1>
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
              {publicStyleId ? (
                <p className="type-caption tabular-nums text-zen-ink/45">
                  {formatLikeCount(likeCount)} 人收藏
                </p>
              ) : null}
            </div>
          </div>

          <PaletteAnalysisStrip
            colors={colors}
            className="mb-8"
            onColorClick={(c) => openColor(c)}
          />

          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <section aria-label="单色解读">
              <h2 className="type-overline mb-4">单色</h2>
              <ul className="space-y-3">
                {colors.map((c) => (
                  <li key={c.hex}>
                    <button
                      type="button"
                      onClick={() => openColor(c)}
                      className="flex w-full items-baseline gap-2 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-zen-ink/10 hover:bg-white"
                    >
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full border border-zen-ink/10"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="inline-flex flex-wrap items-baseline gap-2">
                          <span className="font-zenSerif text-base font-medium text-zen-ink">
                            {c.name}
                          </span>
                          <span className="text-[11px] font-extralight tabular-nums text-zen-ink/45">
                            {c.hex}
                          </span>
                        </span>
                        {c.intro ? (
                          <span className="mt-1 block type-body-sm text-zen-ink/60">
                            {c.intro}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {tags.length > 0 && (
              <section aria-label="标签">
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
              </section>
            )}
          </div>
        </div>
      </div>

      {selectedColor && (
        <SingleColorCardOverlay
          color={selectedColor}
          onClose={() => setSelectedColor(null)}
          onFindMore={(c) => {
            setSelectedColor(null);
            onFindSimilarPalettes?.(c.hex, c);
          }}
        />
      )}
    </div>
  );
}

function resolveInitialLikeCount(item, exploreFeed, publicStyleId) {
  if (!item) return 0;
  if (publicStyleId && publicStyleId !== item.id) {
    const source = exploreFeed.find((i) => i.id === publicStyleId);
    if (source) return Number(source.likeCount) || 0;
  }
  return Number(item.likeCount) || 0;
}
