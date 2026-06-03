import React, { useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import { itemColorCardData } from '../components/StyleUiPreviewCard';

const EXPLORE_QUICK_FILTERS = [
  'Spring', 'Summer', 'Winter', 'Pink', 'Blue', 'Purple',
  'Zodiac', 'Black', 'White', 'Green',
];

function CommunityTagBar({ tags, activeTag, searchQuery, onTagClick, onClearSearch }) {
  const scrollRef = useRef(null);
  const displayTags = tags.length > 1 ? tags : ['All', ...EXPLORE_QUICK_FILTERS];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scroll-smooth px-3 pb-1 pt-0.5 hide-scrollbar">
      {displayTags.map((tag) => {
        const active =
          tag === 'All'
            ? (activeTag === 'All' && !searchQuery.trim())
            : (activeTag === tag || (activeTag === 'All' && searchQuery.trim().toLowerCase() === tag.toLowerCase()));
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-extralight tracking-wide transition-all duration-200 ${
              active
                ? 'bg-zen-ink text-zen-paper'
                : 'bg-zen-mist text-zen-ink/60 hover:bg-zen-ink/10 hover:text-zen-ink'
            }`}
          >
            {tag === 'All' ? '全部' : tag}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 色海页：顶部 2×2 精选 + 搜索栏 + 横向滚动标签 + 双列瀑布流。
 */
export default function ColorSeaPage({
  user,
  colorPaletteExploreFeed = [],
  likedStyleIds,
  communityLikeBusyId,
  communityTagList = [],
  onToggleLike,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onOpenAuth,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [sort, setSort] = useState('trending');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchWrapRef = useRef(null);

  const filteredFeed = useMemo(() => {
    const matchesFilters = (item) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const a = (item.aesthetic || '').toLowerCase();
        const p = (item.prompt || '').toLowerCase();
        const keys = (item.keywords || []).map((k) => String(k).toLowerCase()).join(' ');
        const cd = itemColorCardData(item);
        const ov = (cd?.overview || '').toLowerCase();
        if (!a.includes(q) && !p.includes(q) && !keys.includes(q) && !ov.includes(q)) return false;
      }
      if (activeTag && activeTag !== 'All') {
        const t = activeTag.toLowerCase();
        const keys = (item.keywords || []).map((k) => String(k).toLowerCase());
        if (keys.some((k) => k === t || k.includes(t))) return true;
        if ((item.aesthetic || '').toLowerCase().includes(t)) return true;
        return false;
      }
      return true;
    };
    const list = colorPaletteExploreFeed.filter(matchesFilters);
    if (sort === 'popular') {
      list.sort((a, b) => {
        const da = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (da !== 0) return da;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    // Deduplicate by hex signature
    const seen = new Set();
    return list.filter((item) => {
      const cd = itemColorCardData(item);
      if (!cd?.colors?.length) return true;
      const sig = cd.colors.slice(0, 5).map((c) => String(c?.hex || '').toLowerCase()).join('|');
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }, [colorPaletteExploreFeed, searchQuery, activeTag, sort]);

  const featuredItems = filteredFeed.slice(0, 4);
  const mainFeedItems = filteredFeed.slice(4);

  const handleTagClick = (tag) => {
    if (tag === 'All') {
      setActiveTag('All');
      setSearchQuery('');
    } else {
      setActiveTag(tag);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-zen-paper">
      {/* Search + filter header */}
      <div className="shrink-0 z-40 bg-zen-mist/90 backdrop-blur-sm border-b border-zen-ink/[0.07] px-3 py-2 space-y-2">
        {/* Search bar */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-ink/35 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索色票、标签、名称…"
              className="w-full rounded-full border border-zen-ink/10 bg-white/70 py-2 pl-9 pr-8 text-[13px] font-extralight text-zen-ink placeholder:text-zen-ink/35 focus:border-zen-ink/25 focus:bg-white focus:outline-none transition-all duration-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zen-ink/35 hover:text-zen-ink transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zen-ink/15 bg-white/70 text-zen-ink/60 hover:bg-zen-ink/[0.04] transition-colors"
              aria-label="排序筛选"
            >
              <SlidersHorizontal size={15} strokeWidth={2} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-11 z-50 w-32 rounded-xl border border-zen-ink/10 bg-white shadow-xl py-1">
                {[
                  { key: 'trending', label: '最新' },
                  { key: 'popular', label: '最热' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSort(key); setShowSortMenu(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight transition-colors ${sort === key ? 'text-zen-vermilion' : 'text-zen-ink hover:bg-zen-ink/[0.04]'}`}
                  >
                    {label}
                    {sort === key && <span className="ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tag scrolling bar */}
        <CommunityTagBar
          tags={communityTagList}
          activeTag={activeTag}
          searchQuery={searchQuery}
          onTagClick={handleTagClick}
          onClearSearch={() => setSearchQuery('')}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-3 md:px-4 md:pb-8">
          {/* Top 2×2 featured row */}
          {featuredItems.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3">
                {featuredItems.map((item) => {
                  const cd = itemColorCardData(item);
                  if (!cd) return null;
                  return (
                    <PaletteFeedCard
                      key={item.id}
                      colors={cd.colors}
                      title={item.aesthetic || ''}
                      likeCount={item.likeCount}
                      liked={likedStyleIds?.has(item.id)}
                      likeBusy={communityLikeBusyId === item.id}
                      onToggleLike={() => {
                        if (!user) { onOpenAuth?.(); return; }
                        onToggleLike?.(item.id);
                      }}
                      mode="sea"
                      onOpenInShengSe={() => onOpenInShengSe?.(cd.colors)}
                      onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
                      onCopyLink={() => onCopyLink?.(item.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Main double-column masonry feed */}
          {mainFeedItems.length > 0 ? (
            <MasonryColumns columns={2} gap="0.75rem">
              {mainFeedItems.map((item) => {
                const cd = itemColorCardData(item);
                if (!cd) return null;
                return (
                  <PaletteFeedCard
                    key={item.id}
                    colors={cd.colors}
                    title={item.aesthetic || ''}
                    likeCount={item.likeCount}
                    liked={likedStyleIds?.has(item.id)}
                    likeBusy={communityLikeBusyId === item.id}
                    onToggleLike={() => {
                      if (!user) { onOpenAuth?.(); return; }
                      onToggleLike?.(item.id);
                    }}
                    mode="sea"
                    onOpenInShengSe={() => onOpenInShengSe?.(cd.colors)}
                    onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
                    onCopyLink={() => onCopyLink?.(item.id)}
                  />
                );
              })}
            </MasonryColumns>
          ) : (
            filteredFeed.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm font-extralight text-zen-ink/40">
                  {searchQuery || activeTag !== 'All' ? '没有找到匹配的色卡。' : '色海里还没有色卡。'}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
