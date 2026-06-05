import React from 'react';
import { CalendarSync, Loader2, ThumbsUp } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import useDailyOneColor from '../hooks/useDailyOneColor';
import {
  COLOR_SEA_MASONRY_CLASS,
  PALETTE_FEED_MASONRY_GAP,
} from '../lib/paletteFeedLayout';
import PageHeader from '../components/layout/PageHeader';
import { DAILY_VOTES_PER_USER } from '../lib/dailyOneColorConstants';

/**
 * 每日一色投稿池：布局同色海，收藏改为投票（每人每日 5 票，GMT+8 结算 Top3 → 色海「每日色卡」）
 */
export default function DailyOneColorPage({
  user,
  onOpenAuth,
  onOpenInShengSe,
  onDownload,
  onBackToGame,
}) {
  const {
    dateKey,
    items,
    loading,
    loadError,
    remainingVotes,
    mySubmission,
    voteBusyId,
    castVote,
  } = useDailyOneColor({ user });

  const handleVote = async (item) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    if (item.ownerUserId === user.id) return;
    await castVote(item.id);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-zen-paper">
      <div className="shrink-0 z-40 border-b border-zen-ink/[0.07] bg-zen-mist/90 px-4 py-3 backdrop-blur-sm md:px-6">
        <PageHeader
          title="每日一色"
          description="今日投稿 · 投票 · 前三入选色海「每日色卡」"
          overline={(
            <span className="flex items-center gap-1.5">
              <CalendarSync size={12} strokeWidth={2} aria-hidden />
              <span>{dateKey}</span>
            </span>
          )}
        >
          <div className="rounded-xl border border-zen-ink/10 bg-white px-3 py-2 text-right">
            <p className="type-overline text-zen-ink/40">今日剩余票数</p>
            <p className="type-stat text-zen-vermilion">
              {user ? remainingVotes : '—'}
              <span className="type-caption text-zen-ink/35">
                /{DAILY_VOTES_PER_USER}
              </span>
            </p>
          </div>
        </PageHeader>
        {onBackToGame && (
          <button
            type="button"
            onClick={onBackToGame}
            className="type-caption -mt-2 mb-1 hover:text-zen-ink"
          >
            ← 返回游戏
          </button>
        )}
        {user && mySubmission && (
          <p className="type-caption mt-2 text-green-700/90">
            你已投稿今日色卡，可邀请他人为你投票。
          </p>
        )}
        {!user && (
          <p className="type-note mt-2">
            登录后可投票；完成游戏页「每日一色」挑战即可投稿。
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-3 md:px-4 md:pb-8">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-zen-ink/30" size={28} strokeWidth={2} />
            </div>
          )}
          {loadError && (
            <p className="type-body-sm py-12 text-center text-red-500">{loadError}</p>
          )}
          {!loading && !loadError && items.length === 0 && (
            <div className="py-16 text-center">
              <ThumbsUp size={28} className="mx-auto mb-3 text-zen-ink/20" strokeWidth={1.5} />
              <p className="type-body text-zen-ink/40">
                今日还没有投稿，完成挑战后点击「投稿到每日一色」。
              </p>
            </div>
          )}
          {!loading && items.length > 0 && (
            <MasonryColumns className={COLOR_SEA_MASONRY_CLASS} gap={PALETTE_FEED_MASONRY_GAP}>
              {items.map((item) => (
                <PaletteFeedCard
                  key={item.id}
                  colors={item.colors}
                  title={item.title}
                  mode="dailyVote"
                  voteCount={item.voteCount}
                  voted={item.votedByMe}
                  voteBusy={voteBusyId === item.id}
                  voteDisabled={
                    !user
                    || item.ownerUserId === user?.id
                    || (remainingVotes <= 0 && !item.votedByMe)
                  }
                  onVote={() => handleVote(item)}
                  onOpenInShengSe={() => onOpenInShengSe?.(item.colors)}
                  onDownload={() => onDownload?.(item.colors, item.title)}
                />
              ))}
            </MasonryColumns>
          )}
        </div>
      </div>
    </div>
  );
}
