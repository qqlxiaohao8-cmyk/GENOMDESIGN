import React from 'react';
import { Bookmark } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import PageHeader from '../components/layout/PageHeader';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';

const PAGE_TITLE = '收藏';
const PAGE_DESC = '你的私人色卡库，随时查看与再编辑';

function FavoritesPageShell({ children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
      <div className="zen-page-header-feed">
        <PageHeader title={PAGE_TITLE} description={PAGE_DESC} />
      </div>
      <div className="zen-page-body-feed flex-1">{children}</div>
    </div>
  );
}

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
      <FavoritesPageShell>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zen-ink/20 border-t-zen-ink/60" />
        </div>
      </FavoritesPageShell>
    );
  }

  if (!user) {
    return (
      <FavoritesPageShell>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="zen-panel mx-auto mb-5 flex h-16 w-16 items-center justify-center p-0">
            <Bookmark size={28} strokeWidth={1.35} className="text-zen-stone" />
          </div>
          <h2 className="type-h2 mb-2">
            登录后解锁收藏
          </h2>
          <p className="type-body mb-7 text-zen-stone">
            保存喜欢的色卡，随时查看和使用。
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="zen-btn-primary w-full"
          >
            登录 / 注册
          </button>
        </div>
      </div>
      </FavoritesPageShell>
    );
  }

  if (vaultColorPaletteItems.length === 0) {
    return (
      <FavoritesPageShell>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zen-ink/20 bg-transparent">
            <Bookmark size={28} strokeWidth={1.5} className="text-zen-ink/25" />
          </div>
          <h3 className="type-h3 mb-1 text-zen-ink/60">
            暂无收藏
          </h3>
          <p className="type-body text-zen-ink/40">
            在色海中收藏色卡，或通过「+」创建新色卡。
          </p>
        </div>
      </div>
      </FavoritesPageShell>
    );
  }

  return (
    <FavoritesPageShell>
      <div className="flex-1">
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
      </div>
    </FavoritesPageShell>
  );
}
