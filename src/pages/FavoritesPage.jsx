import React from 'react';
import { Bookmark } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import { itemColorCardData } from '../components/StyleUiPreviewCard';

/**
 * 收藏首页：显示用户私人色卡库（单列瀑布流）。
 * 未登录时显示空态 + 登录引导。
 */
export default function FavoritesPage({
  user,
  authReady,
  vaultColorPaletteItems = [],
  onOpenAuth,
  onDeleteItem,
  onOpenInShengSe,
  onDownload,
}) {
  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zen-ink/20 border-t-zen-ink/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zen-ink/10 bg-zen-mist/60">
            <Bookmark size={28} strokeWidth={1.5} className="text-zen-ink/30" />
          </div>
          <h2 className="mb-2 font-zenSerif text-xl font-medium tracking-tight text-zen-ink">
            登录后解锁收藏
          </h2>
          <p className="mb-7 text-sm font-extralight leading-relaxed text-zen-ink/50">
            保存喜欢的色卡，随时查看和使用。
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full rounded-full bg-zen-ink py-3 text-[11px] font-extralight uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
          >
            登录 / 注册
          </button>
        </div>
      </div>
    );
  }

  if (vaultColorPaletteItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zen-ink/20 bg-transparent">
            <Bookmark size={28} strokeWidth={1.5} className="text-zen-ink/25" />
          </div>
          <h3 className="mb-1 font-zenSerif text-lg font-medium tracking-tight text-zen-ink/60">
            暂无收藏
          </h3>
          <p className="text-sm font-extralight text-zen-ink/40">
            在色海中收藏色卡，或通过「+」创建新色卡。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="px-4 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-4 md:px-6 md:pb-8 md:pt-6">
        <h1 className="mb-4 font-zenSerif text-2xl font-medium tracking-tight text-zen-ink md:mb-6 md:text-3xl">
          收藏
        </h1>
        <MasonryColumns columns={1} gap="0.875rem">
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
                onOpenInShengSe={() => onOpenInShengSe?.(cd.colors)}
                onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
              />
            );
          })}
        </MasonryColumns>
      </div>
    </div>
  );
}
