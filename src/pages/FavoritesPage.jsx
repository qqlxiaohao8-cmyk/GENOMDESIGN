import React from 'react';
import { Bookmark } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import PageShell from '../components/layout/PageShell';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';

const PAGE_TITLE = '收藏';

/**
 * 收藏首页：用户私人色卡库（移动 1 列 / 桌面 2 列瀑布流）。
 * 未登录时显示空态 + 登录引导；数据存于 Supabase，登出后仍保留。
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
      <PageShell title={PAGE_TITLE} bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zen-ink/20 border-t-zen-ink/60" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title={PAGE_TITLE} bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xs text-center">
            <div className="zen-panel mx-auto mb-5 flex h-16 w-16 items-center justify-center p-0">
              <Bookmark size={28} strokeWidth={1.35} className="text-zen-stone" />
            </div>
            <h2 className="type-h2 mb-7">
              登录后解锁收藏
            </h2>
            <button
              type="button"
              onClick={onOpenAuth}
              className="zen-btn-primary w-full"
            >
              登录 / 注册
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (vaultColorPaletteItems.length === 0) {
    return (
      <PageShell title={PAGE_TITLE} bodyClassName="zen-page-body-feed">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xs text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zen-ink/20 bg-transparent">
              <Bookmark size={28} strokeWidth={1.5} className="text-zen-ink/25" />
            </div>
            <h3 className="type-h3 text-zen-ink/60">
              暂无收藏
            </h3>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={PAGE_TITLE} bodyClassName="zen-page-body-feed">
      <MasonryColumns className={FAVORITES_MASONRY_CLASS} gap={PALETTE_FEED_MASONRY_GAP}>
        {vaultColorPaletteItems.map((item) => {
          const cd = itemColorCardData(item);
          if (!cd) return null;
          return (
            <PaletteFeedCard
              key={item.id}
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
