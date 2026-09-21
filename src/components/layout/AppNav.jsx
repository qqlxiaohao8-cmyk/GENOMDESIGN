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

const ICON_STROKE = 1.35;
const ICON_STROKE_ACTIVE = 1.6;

/**
 * Unified navigation for mobile (bottom bar) and desktop (left sidebar).
 */
export default function AppNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className="zen-glass hidden h-full w-[4.5rem] shrink-0 flex-col items-center border-r border-zen-clay/40 bg-zen-paper/75 py-8 backdrop-blur-md lg:w-20 md:flex"
        aria-label="主导航"
      >
        <div className="mb-8 flex items-center justify-center">
          <img
            src={logoSekong2}
            alt="色空"
            className="h-9 w-auto object-contain opacity-85 smooth-transition hover:opacity-100"
            draggable={false}
          />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map(({ key, icon: Icon, label, isFab }) => {
            if (isFab) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={onFabClick}
                  className="my-3 flex h-12 w-12 items-center justify-center rounded-[1.05rem_1.25rem_0.95rem_1.3rem] bg-zen-coal text-zen-paper shadow-zen smooth-transition hover:bg-zen-ink active:scale-95 lg:h-[3.25rem] lg:w-[3.25rem]"
                  aria-label="创作：生色 / 析色"
                >
                  <Icon size={22} strokeWidth={1.5} aria-hidden />
                </button>
              );
            }
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`group relative flex w-full flex-col items-center gap-1.5 py-2 smooth-transition ${
                  isActive ? 'text-zen-coal' : 'text-zen-stone hover:text-zen-ink'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? ICON_STROKE_ACTIVE : ICON_STROKE}
                    aria-hidden
                  />
                  {isActive ? (
                    <span className="zen-nav-dot bottom-0.5" aria-hidden />
                  ) : null}
                </div>
                <span
                  className={`text-[9px] font-extralight tracking-[0.16em] transition-transform duration-300 ease-zen ${
                    isActive ? '-translate-y-0.5' : 'translate-y-0 group-hover:-translate-y-0.5'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile bottom bar ────────────────────────────── */}
      <div className="zen-glass fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around rounded-t-[1.75rem_1.9rem_0_0] border-t border-zen-clay/40 bg-zen-paper/85 px-2 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] shadow-zen-lg backdrop-blur-md md:hidden">
        {NAV_ITEMS.map(({ key, icon: Icon, label, isFab }) => {
          if (isFab) {
            return (
              <div key={key} className="relative -mt-8 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onFabClick}
                  className="flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-[1.1rem_1.3rem_1rem_1.35rem] border border-zen-paper/80 bg-zen-coal text-zen-paper shadow-zen-lg smooth-transition active:scale-95"
                  aria-label="创作"
                >
                  <Icon size={24} strokeWidth={1.5} aria-hidden />
                </button>
                <span className="mt-1 text-[9px] font-extralight tracking-[0.16em] text-zen-stone">{label}</span>
              </div>
            );
          }
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex min-w-[3.25rem] flex-col items-center gap-1 py-0.5 smooth-transition ${
                isActive ? 'text-zen-coal' : 'text-zen-stone'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative flex flex-col items-center">
                <Icon
                  size={22}
                  strokeWidth={isActive ? ICON_STROKE_ACTIVE : ICON_STROKE}
                  aria-hidden
                />
                {isActive ? (
                  <span className="zen-nav-dot -bottom-1" aria-hidden />
                ) : null}
              </span>
              <span
                className={`text-[9px] font-extralight tracking-[0.14em] transition-transform duration-300 ease-zen ${
                  isActive ? '-translate-y-0.5' : 'translate-y-0'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
