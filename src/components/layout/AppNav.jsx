import React from 'react';
import { Plus } from 'lucide-react';
import logoSekong2 from '../../../色空2.png';

const NAV_ITEMS = [
  { key: 'favorites', label: '收藏', num: '01' },
  { key: 'colorSea', label: '色海', num: '02' },
  { key: '__fab__', label: '创作', isFab: true },
  { key: 'game', label: '游戏', num: '03' },
  { key: 'profile', label: '我', num: '04' },
];

/**
 * Unified navigation for mobile (bottom bar) and desktop (left sidebar).
 */
export default function AppNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <>
      <aside
        className="hidden h-full w-[4.75rem] shrink-0 flex-col items-center bg-transparent py-8 lg:w-[5.25rem] md:flex"
        aria-label="主导航"
      >
        <div className="mb-10 flex items-center justify-center">
          <img
            src={logoSekong2}
            alt="色空"
            className="h-8 w-auto object-contain opacity-80 smooth-transition hover:opacity-100"
            draggable={false}
          />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-5">
          {NAV_ITEMS.map(({ key, label, num, isFab }) => {
            if (isFab) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={onFabClick}
                  className="zen-wash my-2 flex h-11 w-11 items-center justify-center bg-zen-coal text-zen-paper smooth-transition hover:opacity-90 active:scale-95"
                  aria-label="创作：生色 / 析色"
                >
                  <Plus size={18} strokeWidth={1.6} aria-hidden />
                </button>
              );
            }
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`group flex w-full flex-col items-center gap-1 py-1 smooth-transition ${
                  isActive ? 'text-zen-coal' : 'text-zen-stone hover:text-zen-ink'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="font-zenTypewriter text-[10px] tracking-[0.08em]">{num}</span>
                <span className="font-zenSerif text-[11px] tracking-[0.08em]">{label}</span>
                {isActive ? (
                  <span className="zen-dot-mark mt-0.5 scale-75" aria-hidden>
                    <span /><span /><span />
                  </span>
                ) : (
                  <span className="h-[0.32rem]" aria-hidden />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-[60] flex items-end justify-around bg-zen-paper/90 px-2 pt-1 pb-[max(0.55rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[2px] md:hidden">
        {NAV_ITEMS.map(({ key, label, isFab }) => {
          if (isFab) {
            return (
              <div key={key} className="relative -mt-4 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onFabClick}
                  className="zen-wash flex h-12 w-12 items-center justify-center bg-zen-coal text-zen-paper active:scale-95"
                  aria-label="创作"
                >
                  <Plus size={20} strokeWidth={1.6} aria-hidden />
                </button>
                <span className="mt-1 font-zenSerif text-[11px] tracking-[0.06em] text-zen-stone">{label}</span>
              </div>
            );
          }
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-end gap-1 pb-0.5 ${
                isActive ? 'text-zen-coal' : 'text-zen-stone'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="font-zenSerif text-[13px] tracking-[0.08em]">{label}</span>
              <span
                className={`h-px w-5 ${isActive ? 'bg-zen-coal' : 'bg-transparent'}`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </>
  );
}
