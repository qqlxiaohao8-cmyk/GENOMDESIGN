import React from 'react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import PageShell from '../components/layout/PageShell';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';

const PAGE_TITLE = '收藏';

/**
 * 收藏首页：用户私人色卡库（移动 1 列 / 桌面 2 列瀑布流）。
 */
export default function FavoritesPage({
  user,
  authReady,
  vaultColorPaletteItems = [],
  onOpenAuth,
  onDeleteItem,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onAnalyzePalette,
}) {
  if (!authReady) {
    return (
      <PageShell title={PAGE_TITLE} index="01" bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zen-ink/20 border-t-zen-ink/60" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title={PAGE_TITLE} index="01" bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center p-2 pt-8">
          <div className="max-w-xs text-left">
            <h2 className="type-h2">登录后解锁收藏</h2>
            <button
              type="button"
              onClick={onOpenAuth}
              className="zen-action zen-hit mt-5"
            >
              登录
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (vaultColorPaletteItems.length === 0) {
    return (
      <PageShell title={PAGE_TITLE} index="01" bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center p-2 pt-10">
          <div className="max-w-xs text-left">
            <h3 className="type-h3 text-zen-ink/70">暂无收藏</h3>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={PAGE_TITLE} index="01" bodyClassName="zen-page-body-feed">
      <MasonryColumns className={`${FAVORITES_MASONRY_CLASS} zen-feed-scrap`} gap={PALETTE_FEED_MASONRY_GAP}>
        {vaultColorPaletteItems.map((item) => {
          const cd = itemColorCardData(item);
          if (!cd) return null;
          return (
            <PaletteFeedCard
              key={item.id}
              cardId={item.id}
              colors={cd.colors}
              title={item.aesthetic || cd.overview || ''}
              mode="favorites"
              onUnfavorite={() => onDeleteItem?.(item.id)}
              onAnalyze={() => onAnalyzePalette?.(item)}
              onOpenInShengSe={() => onOpenInShengSe?.(cd.colors, item)}
              onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
              onCopyLink={() => onCopyLink?.(item.id)}
            />
          );
        })}
      </MasonryColumns>
    </PageShell>
  );
}
