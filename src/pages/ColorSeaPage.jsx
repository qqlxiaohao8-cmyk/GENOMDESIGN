import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PageShell from '../components/layout/PageShell';
import PaletteFeedCard from '../components/PaletteFeedCard';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { buildColorSeaTagSets } from '../lib/colorSeaTags';
import {
  getDailyWinnerTagButtonProps,
  isDailyWinnerTag,
} from '../lib/dailyWinnerTagStyle';
import { tagMatchesSeaFilter } from '../lib/colorHueTagStyle';
import {
  COLOR_SEA_MASONRY_CLASS,
  PALETTE_FEED_MASONRY_GAP,
} from '../lib/paletteFeedLayout';

const tagPill = (active) =>
  `zen-tag shrink-0 whitespace-nowrap${active ? ' zen-tag-active' : ''}`;

function TagFilterButton({
  tag,
  active,
  onClick,
  dailyAccentHex,
  sizeClass = '',
  asTab = false,
}) {
  const isSelected = active;
  const tabA11y = asTab ? { role: 'tab', 'aria-selected': isSelected } : {};
  if (isDailyWinnerTag(tag) && dailyAccentHex) {
    const { className, style } = getDailyWinnerTagButtonProps(dailyAccentHex, isSelected);
    return (
      <button
        type="button"
        {...tabA11y}
        onClick={onClick}
        className={`zen-tag shrink-0 whitespace-nowrap ${className} ${sizeClass}`.trim()}
        style={style}
      >
        {tag}
      </button>
    );
  }
  return (
    <button
      type="button"
      {...tabA11y}
      onClick={onClick}
      className={`${tagPill(isSelected)} ${sizeClass}`.trim()}
    >
      {tag}
    </button>
  );
}

function CommunityTagBar({ quickTags, activeTag, onTagClick, dailyAccentHex }) {
  return (
    <div
      className="community-tag-scroll flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-1 pt-0.5"
      role="tablist"
      aria-label="常见标签"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTag === 'All'}
        onClick={() => onTagClick('All')}
        className={tagPill(activeTag === 'All')}
      >
        全部
      </button>
      {quickTags.map((tag) => (
        <TagFilterButton
          key={tag}
          tag={tag}
          active={activeTag === tag}
          dailyAccentHex={dailyAccentHex}
          asTab
          onClick={() => onTagClick(tag)}
        />
      ))}
    </div>
  );
}

function CategorizedTagPanel({
  categories,
  activeTag,
  sort,
  onSelectTag,
  onSelectSort,
  dailyAccentHex,
}) {
  const colorTagsRef = useRef(null);
  const styleTagsRef = useRef(null);
  const [themeScrollMaxH, setThemeScrollMaxH] = useState(null);

  const hasAnyTag = categories.some((c) => c.tags.length > 0);

  useEffect(() => {
    const measure = () => {
      const colorH = colorTagsRef.current?.offsetHeight ?? 0;
      const styleH = styleTagsRef.current?.offsetHeight ?? 0;
      const max = Math.max(colorH, styleH);
      if (max > 0) setThemeScrollMaxH(max);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (colorTagsRef.current) ro.observe(colorTagsRef.current);
    if (styleTagsRef.current) ro.observe(styleTagsRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [categories]);

  return (
    <div
      className="mt-2 rounded-2xl border border-zen-ink/10 bg-white px-3 py-2.5 shadow-sm"
      role="region"
      aria-label="标签筛选"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-zen-ink/[0.06] pb-2">
        <span className="type-overline">
          排序
        </span>
        <div className="flex gap-1.5">
          {[
            { key: 'trending', label: '最新' },
            { key: 'popular', label: '最热' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectSort(key)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extralight transition-colors ${
                sort === key
                  ? 'bg-zen-ink text-zen-paper'
                  : 'bg-zen-mist text-zen-ink/55 hover:bg-zen-ink/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasAnyTag ? (
        <p className="type-body-sm py-3 text-center text-zen-ink/40">
          暂无可筛选标签
        </p>
      ) : (
        <div className="grid w-full grid-cols-3 items-start gap-2 md:gap-3">
          {categories.map(({ id, label, tags }) =>
            tags.length === 0 ? null : (
              <section
                key={id}
                className="flex min-w-0 flex-col gap-1.5 border-r border-zen-ink/[0.06] pr-2 last:border-r-0 last:pr-0 md:gap-2 md:pr-3"
                aria-label={label}
              >
                <h3 className="type-overline shrink-0 text-zen-ink/50">
                  {label}
                </h3>
                <div
                  ref={
                    id === 'color'
                      ? colorTagsRef
                      : id === 'style'
                        ? styleTagsRef
                        : undefined
                  }
                  className={
                    id === 'theme'
                      ? 'categorized-tag-scroll flex min-h-0 max-h-44 flex-wrap content-start gap-1.5 overflow-y-auto overscroll-y-contain pr-0.5 md:max-h-48'
                      : 'flex flex-wrap content-start gap-1.5'
                  }
                  style={
                    id === 'theme' && themeScrollMaxH
                      ? { maxHeight: themeScrollMaxH }
                      : undefined
                  }
                >
                  {tags.map((tag) => (
                    <TagFilterButton
                      key={tag}
                      tag={tag}
                      active={activeTag === tag}
                      dailyAccentHex={dailyAccentHex}
                      sizeClass=""
                      onClick={() => onSelectTag(tag)}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 色海页：搜索栏 + 标签 + 色卡瀑布流（移动 2 列 / 桌面 4 列）。
 */
export default function ColorSeaPage({
  user,
  colorPaletteExploreFeed = [],
  favoritedExploreStyleIds,
  vaultFavoriteBusyId,
  communityTagList = [],
  onToggleFavorite,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onOpenAuth,
  onTagClick: onTagClickTrack,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [sort, setSort] = useState('trending');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchAreaRef = useRef(null);
  const dateKey = useCalendarDateKey();
  const dailyAccentHex = useMemo(() => {
    const d = dateFromDailyPaletteKey(dateKey);
    return getTodayColor(d).hex;
  }, [dateKey]);

  const { quickTags, categories } = useMemo(
    () => buildColorSeaTagSets(communityTagList, { dateKey }),
    [communityTagList, dateKey],
  );

  useEffect(() => {
    if (!searchExpanded) return undefined;
    const close = (e) => {
      if (searchAreaRef.current?.contains(e.target)) return;
      setSearchExpanded(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [searchExpanded]);

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
        const keys = (item.keywords || []).map((k) => String(k).trim());
        const snapTags = item.extractionSnapshot?.engineTags;
        const engineTags = Array.isArray(snapTags) ? snapTags.map((k) => String(k).trim()) : [];
        const allTags = [...keys, ...engineTags];
        if (allTags.some((k) => tagMatchesSeaFilter(activeTag, k))) return true;
        if ((item.aesthetic || '').toLowerCase().includes(activeTag.toLowerCase())) return true;
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

  const renderableFeed = useMemo(
    () => filteredFeed
      .map((item) => ({ item, cd: itemColorCardData(item) }))
      .filter((row) => row.cd?.colors?.length),
    [filteredFeed],
  );

  const handleTagClick = (tag) => {
    if (tag === 'All') {
      setActiveTag('All');
      setSearchQuery('');
    } else {
      setActiveTag(tag);
      setSearchQuery('');
    }
    onTagClickTrack?.(tag);
    setSearchExpanded(false);
  };

  return (
    <PageShell
      title="色海"
      description="探索社区色卡，搜索标签或名称"
      bodyClassName="zen-page-body-feed"
      headerExtra={(
        <>
          <div ref={searchAreaRef}>
            <div className="relative">
              <Search
                size={16}
                strokeWidth={1.35}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zen-stone"
              />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchExpanded(true)}
                onClick={() => setSearchExpanded(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) setActiveTag('All');
                }}
                placeholder="搜索色票、标签、名称…"
                className={`zen-input py-2.5 pl-10 pr-9 ${
                  searchExpanded ? 'border-zen-stone/40 bg-white' : ''
                }`}
              />
              {(searchQuery || searchExpanded) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTag('All');
                    setSearchExpanded(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-stone smooth-transition hover:text-zen-coal"
                  aria-label="清除搜索并关闭标签"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchExpanded && (
              <CategorizedTagPanel
                categories={categories}
                activeTag={activeTag}
                sort={sort}
                onSelectTag={handleTagClick}
                onSelectSort={setSort}
                dailyAccentHex={dailyAccentHex}
              />
            )}
          </div>

          {!searchExpanded && (
            <CommunityTagBar
              quickTags={quickTags}
              activeTag={activeTag}
              onTagClick={handleTagClick}
              dailyAccentHex={dailyAccentHex}
            />
          )}
        </>
      )}
    >
      {renderableFeed.length > 0 ? (
        <MasonryColumns className={COLOR_SEA_MASONRY_CLASS} gap={PALETTE_FEED_MASONRY_GAP}>
          {renderableFeed.map(({ item, cd }) => (
            <PaletteFeedCard
              key={item.id}
              colors={cd.colors}
              title={item.aesthetic || ''}
              favorited={favoritedExploreStyleIds?.has(item.id)}
              favoriteBusy={vaultFavoriteBusyId === item.id}
              onToggleFavorite={() => {
                if (!user) { onOpenAuth?.(); return; }
                onToggleFavorite?.(item);
              }}
              mode="sea"
              onOpenInShengSe={() => onOpenInShengSe?.(cd.colors, item)}
              onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
              onCopyLink={() => onCopyLink?.(item.id)}
            />
          ))}
        </MasonryColumns>
      ) : (
        <div className="py-16 text-center">
          <p className="type-body text-zen-ink/40">
            {searchQuery || activeTag !== 'All' ? '没有找到匹配的色卡。' : '色海里还没有色卡。'}
          </p>
        </div>
      )}
    </PageShell>
  );
}
