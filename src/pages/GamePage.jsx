import React from 'react';
import { ArrowRight, ThumbsUp } from 'lucide-react';
import DailyColorChallengeCard from '../components/DailyColorChallengeCard';
import ColorMemoryGame from '../components/ColorMemoryGame';
import PageShell from '../components/layout/PageShell';

/**
 * @param {{ onStartChallenge?: (dailyData: object) => void, onOpenDailyPool?: () => void }} props
 */
export default function GamePage({ onStartChallenge, onOpenDailyPool }) {
  return (
    <PageShell
      title="游戏"
      description="色彩训练与每日挑战"
    >
      <DailyColorChallengeCard onStart={onStartChallenge} />

      <ColorMemoryGame />

      <button
        type="button"
        onClick={() => onOpenDailyPool?.()}
        className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-zen-ink/10 bg-white px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zen-vermilion/10 text-zen-vermilion">
            <ThumbsUp size={18} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="type-h4">今日投稿 · 投票</p>
            <p className="type-note">
              浏览挑战色卡，每日 5 票 · 前三入选色海
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-zen-ink/35" strokeWidth={2} aria-hidden />
      </button>
    </PageShell>
  );
}
