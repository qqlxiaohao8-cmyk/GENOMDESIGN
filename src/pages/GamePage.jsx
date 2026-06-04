import React from 'react';
import { ArrowRight, ThumbsUp } from 'lucide-react';
import DailyColorChallengeCard from '../components/DailyColorChallengeCard';
import PageHeader from '../components/layout/PageHeader';

const PLACEHOLDER_PALETTES = [
  ['#F2E8D5', '#C9A87C', '#8B5E3C', '#4A2C17', '#2A1508'],
  ['#D4E8D5', '#7CC987', '#3C8B4A', '#174A29', '#082A14'],
  ['#D5D8F2', '#7C87C9', '#3C4A8B', '#171F4A', '#08102A'],
  ['#F2D5E8', '#C97CA0', '#8B3C6A', '#4A1733', '#2A081D'],
  ['#E8EBD5', '#A8B07C', '#5E673C', '#2C3517', '#151A08'],
  ['#F2EBD5', '#C9B07C', '#8B733C', '#4A3D17', '#2A2208'],
];

function PlaceholderCard({ colors }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <div className="flex" style={{ height: '6rem' }}>
        {colors.map((hex, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: hex }} />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{ onStartChallenge?: (dailyData: object) => void, onOpenDailyPool?: () => void }} props
 */
export default function GamePage({ onStartChallenge, onOpenDailyPool }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="px-4 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-6 md:px-6 md:pb-8">
        <PageHeader
          className="mb-4"
          title="游戏"
          description="色彩训练与每日挑战"
        />

        <DailyColorChallengeCard onStart={onStartChallenge} />

        <button
          type="button"
          onClick={() => onOpenDailyPool?.()}
          className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-zen-ink/10 bg-white px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
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

        <div className="mb-8 rounded-2xl border border-dashed border-zen-ink/15 p-6 text-center">
          <p className="type-body text-zen-ink/40">
            更多色彩训练游戏正在开发中。<br />
            届时你可以通过游戏提升对色彩的感知与搭配能力。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PLACEHOLDER_PALETTES.map((colors, i) => (
            <PlaceholderCard key={i} colors={colors} />
          ))}
        </div>
      </div>
    </div>
  );
}
