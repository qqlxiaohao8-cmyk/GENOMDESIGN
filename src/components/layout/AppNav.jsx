import React from 'react';
import {
  IconExtract,
  IconMine,
  IconSea,
  IconSettings,
  IconShengSe,
  ZhuoquInkDefs,
} from '../icons/HeyteaIcons';

const SIDE_ITEMS = [
  { key: 'favorites', label: '我的', Icon: IconMine },
  { key: 'colorSea', label: '色海', Icon: IconSea },
  { key: 'profile', label: '设定', Icon: IconSettings },
];

function CreateCluster({ onShengSe, onExtract, raised = false }) {
  return (
    <div className={`heytea-create-cluster ${raised ? '-mt-3' : ''}`} aria-label="创作">
      <button
        type="button"
        onClick={onShengSe}
        className="heytea-create-slot"
        aria-label="生色"
      >
        <IconShengSe />
        <span className="font-heytea text-[11px] tracking-[0.06em] text-zen-coal">创作</span>
      </button>
      <button
        type="button"
        onClick={onExtract}
        className="heytea-create-slot"
        aria-label="析色"
      >
        <IconExtract />
        <span className="font-heytea text-[11px] tracking-[0.06em] text-zen-coal">创作</span>
      </button>
    </div>
  );
}

/**
 * 主导航：我的 / 色海 / 双创作 / 设定
 */
export default function AppNav({
  activeTab,
  onTabChange,
  onShengSe,
  onExtract,
}) {
  return (
    <>
      <ZhuoquInkDefs />
      <aside
        className="hidden h-full w-[5.25rem] shrink-0 flex-col items-center bg-transparent py-8 lg:w-[5.75rem] md:flex"
        aria-label="主导航"
      >
        <p className="font-heytea mb-10 text-[1.35rem] tracking-[0.18em] text-zen-coal">色空</p>

        <nav className="flex flex-1 flex-col items-center gap-6">
          {SIDE_ITEMS.slice(0, 2).map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-zen-coal' : 'text-zen-stone hover:text-zen-ink'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon />
                <span className="font-heytea text-[12px] tracking-[0.08em]">{label}</span>
              </button>
            );
          })}

          <CreateCluster onShengSe={onShengSe} onExtract={onExtract} />

          {SIDE_ITEMS.slice(2).map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-zen-coal' : 'text-zen-stone hover:text-zen-ink'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon />
                <span className="font-heytea text-[12px] tracking-[0.08em]">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-[60] flex items-end justify-between bg-zen-paper/92 px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[2px] md:hidden">
        <button
          type="button"
          onClick={() => onTabChange('favorites')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-end gap-0.5 ${
            activeTab === 'favorites' ? 'text-zen-coal' : 'text-zen-stone'
          }`}
          aria-label="我的"
          aria-current={activeTab === 'favorites' ? 'page' : undefined}
        >
          <IconMine />
          <span className="font-heytea text-[12px]">我的</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('colorSea')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-end gap-0.5 ${
            activeTab === 'colorSea' ? 'text-zen-coal' : 'text-zen-stone'
          }`}
          aria-label="色海"
          aria-current={activeTab === 'colorSea' ? 'page' : undefined}
        >
          <IconSea />
          <span className="font-heytea text-[12px]">色海</span>
        </button>

        <CreateCluster raised onShengSe={onShengSe} onExtract={onExtract} />

        <button
          type="button"
          onClick={() => onTabChange('profile')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-end gap-0.5 ${
            activeTab === 'profile' ? 'text-zen-coal' : 'text-zen-stone'
          }`}
          aria-label="设定"
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
          <IconSettings />
          <span className="font-heytea text-[12px]">设定</span>
        </button>
      </div>
    </>
  );
}
