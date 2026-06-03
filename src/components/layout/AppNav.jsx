import React from 'react';
import { Bookmark, Waves, Plus, Gamepad2, User } from 'lucide-react';
import logoSekong2 from '../../../色空2.png';

const NAV_ITEMS = [
  { key: 'favorites', icon: Bookmark, label: '收藏' },
  { key: 'colorSea', icon: Waves, label: '色海' },
  { key: '__fab__', icon: Plus, label: '创作', isFab: true },
  { key: 'game', icon: Gamepad2, label: '游戏' },
  { key: 'profile', icon: User, label: '我' },
];

/**
 * Unified navigation for mobile (bottom bar) and desktop (left sidebar).
 * - Mobile: fixed bottom bar, left→right
 * - Desktop (md+): fixed left rail, top→bottom
 *
 * @param {{ activeTab: string, onTabChange: (key: string) => void, onFabClick: () => void }} props
 */
export default function AppNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className="hidden md:flex h-full w-20 shrink-0 flex-col items-center border-r border-zen-ink/10 bg-zen-paper/95 py-6 backdrop-blur-[2px]"
        aria-label="主导航"
      >
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center">
          <img
            src={logoSekong2}
            alt="GENOM"
            className="h-8 w-auto object-contain opacity-90"
            draggable={false}
          />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-3">
          {NAV_ITEMS.map(({ key, icon: Icon, label, isFab }) => {
            if (isFab) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={onFabClick}
                  className="my-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-zen-vermilion text-white shadow-lg shadow-zen-vermilion/30 transition-all duration-300 hover:opacity-90 active:scale-95"
                  aria-label="创作：生色 / 析色"
                >
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </button>
              );
            }
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`group relative flex flex-col items-center gap-1 py-2 w-full transition-all duration-300 ${
                  isActive ? 'text-zen-vermilion' : 'text-zen-ink/40 hover:text-zen-vermilion'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-zen-vermilion/10'
                      : 'group-hover:bg-zen-vermilion/[0.06]'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                </div>
                <span className="text-[9px] font-extralight tracking-wide">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile bottom bar ────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around rounded-t-[1.5rem] border-t border-zen-ink/10 bg-white/95 px-1 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] shadow-[0_-6px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        {NAV_ITEMS.map(({ key, icon: Icon, label, isFab }) => {
          if (isFab) {
            return (
              <div key={key} className="relative -mt-7 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onFabClick}
                  className="flex h-13 w-13 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1.1rem] border-2 border-white bg-zen-vermilion text-white shadow-lg shadow-zen-vermilion/35 transition-transform active:scale-95"
                  aria-label="创作"
                >
                  <Icon size={24} strokeWidth={2.25} aria-hidden />
                </button>
                <span className="mt-0.5 text-[9px] font-extralight tracking-wide text-zen-ink/35">{label}</span>
              </div>
            );
          }
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex min-w-[3rem] flex-col items-center gap-0.5 py-0.5 transition-colors duration-200 ${
                isActive ? 'text-zen-vermilion' : 'text-zen-ink/35'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
              <span className="text-[9px] font-extralight tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
