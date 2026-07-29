import React, { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, ThumbsUp, X } from 'lucide-react';
import DailyColorChallengeCard from '../components/DailyColorChallengeCard';
import ColorMemoryChallengeCard from '../components/ColorMemoryChallengeCard';
import ColorWalkChallengeCard from '../components/ColorWalkChallengeCard';
import ColorWalkFlowOverlay from '../components/ColorWalkFlowOverlay';
import ColorMemoryGame from '../components/ColorMemoryGame';
import PageShell from '../components/layout/PageShell';

/**
 * @param {{
 *   onStartChallenge?: (dailyData: object) => void,
 *   onOpenDailyPool?: () => void,
 *   user?: object | null,
 *   onOpenAuth?: () => void,
 * }} props
 */
export default function GamePage({ onStartChallenge, onOpenDailyPool, user = null, onOpenAuth }) {
  const [memoryGameOpen, setMemoryGameOpen] = useState(false);
  const [memorySession, setMemorySession] = useState(0);
  const [colorWalkOpen, setColorWalkOpen] = useState(false);
  const [colorWalkInitialPhase, setColorWalkInitialPhase] = useState('spin');
  const [pendingOpenSaved, setPendingOpenSaved] = useState(false);

  const openMemoryGame = () => {
    setMemorySession((n) => n + 1);
    setMemoryGameOpen(true);
  };

  const openColorWalk = () => {
    setPendingOpenSaved(false);
    setColorWalkInitialPhase('spin');
    setColorWalkOpen(true);
  };

  const openColorWalkSaved = () => {
    setPendingOpenSaved(false);
    setColorWalkInitialPhase('saved');
    setColorWalkOpen(true);
  };

  const closeColorWalk = () => {
    setColorWalkOpen(false);
    setColorWalkInitialPhase('spin');
  };

  // After login, resume opening the saved-colors page
  useEffect(() => {
    if (!user || !pendingOpenSaved) return undefined;
    setPendingOpenSaved(false);
    setColorWalkInitialPhase('saved');
    setColorWalkOpen(true);
    return undefined;
  }, [user, pendingOpenSaved]);

  useEffect(() => {
    if (!memoryGameOpen && !colorWalkOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMemoryGameOpen(false);
        closeColorWalk();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [memoryGameOpen, colorWalkOpen]);

  return (
    <PageShell
      title="游戏"
      description="色彩训练与每日挑战"
    >
      <DailyColorChallengeCard onStart={onStartChallenge} />

      <button
        type="button"
        onClick={() => onOpenDailyPool?.()}
        className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-zen-ink/10 bg-white px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
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

      <ColorMemoryChallengeCard onOpen={openMemoryGame} />
      <ColorWalkChallengeCard onOpen={openColorWalk} />

      <button
        type="button"
        onClick={openColorWalkSaved}
        className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-zen-ink/10 bg-white px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
        aria-label="打开 Color Walk 收藏"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zen-ink/[0.06] text-zen-ink">
            <Bookmark size={18} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="type-h4">Color Walk 收藏</p>
            <p className="type-note">
              查看已存的五个颜色，随时拍照排版
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-zen-ink/35" strokeWidth={2} aria-hidden />
      </button>

      {memoryGameOpen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="色彩记忆"
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-8 md:py-8">
            <div className="mb-3 flex w-full max-w-md shrink-0 justify-end md:mb-4">
              <button
                type="button"
                onClick={() => setMemoryGameOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                aria-label="关闭游戏"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
              <ColorMemoryGame key={memorySession} mobileFill />
            </div>
          </div>
        </div>
      )}

      <ColorWalkFlowOverlay
        open={colorWalkOpen}
        onClose={closeColorWalk}
        user={user}
        onOpenAuth={onOpenAuth}
        initialPhase={colorWalkInitialPhase}
      />
    </PageShell>
  );
}
