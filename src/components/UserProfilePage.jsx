import React, { useMemo } from 'react';
import { LogOut, CalendarSync, Library, Trophy, UserPlus } from 'lucide-react';
import { getDailyPalette } from '../lib/dailyPalette';

export default function UserProfilePage({
  user,
  displayUserName,
  huntWinDates = [],
  vaultCount = 0,
  onOpenAuth,
  onOpenDailyPalette,
  onSignOut,
}) {
  const daily = useMemo(() => getDailyPalette(new Date()), []);
  const primaryColor = daily.colors?.[0];
  const hex = primaryColor?.hex || '#888888';
  const colorName = primaryColor?.name || '今日之色';

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-zen-ink/10 bg-zen-paper p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-zen-ink/15 bg-zen-mist">
            <UserPlus size={32} strokeWidth={1.5} className="text-zen-ink/40" />
          </div>
          <h2 className="font-zenSerif text-xl font-medium tracking-tight text-zen-ink mb-2">
            登录以解锁更多
          </h2>
          <p className="text-sm font-extralight leading-relaxed text-zen-ink/55 mb-8">
            登录后可保存色卡至「藏」、参与逐日观色挑战、发布作品到社区。
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-full bg-zen-ink text-white text-[10px] font-extralight uppercase tracking-[0.2em] border border-zen-ink/20 transition-all duration-300 hover:opacity-90"
          >
            登录 / 注册
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = displayUserName?.(user) || user.email || '用户';
  const email = user.email || user.id;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-lg space-y-5">
        {/* User info card */}
        <section className="rounded-3xl border border-zen-ink/10 bg-zen-paper p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zen-ink/15 bg-zen-mist">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zen-ink/30 font-zenSerif text-2xl font-medium">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-zenSerif text-lg font-medium text-zen-ink">{name}</h2>
              <p className="truncate text-xs font-extralight text-zen-ink/50">{email}</p>
            </div>
          </div>
        </section>

        {/* Daily color card — tap to open DailyPaletteModal */}
        <section
          role="button"
          tabIndex={0}
          onClick={onOpenDailyPalette}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDailyPalette?.(); } }}
          className="group cursor-pointer rounded-3xl border border-zen-ink/10 bg-zen-paper overflow-hidden transition-all duration-300 hover:border-zen-ink/20 active:scale-[0.99]"
          aria-label="逐日观色 · 点击查看今日色彩"
        >
          <div className="flex items-stretch">
            <div
              className="w-24 shrink-0"
              style={{ backgroundColor: hex }}
              aria-hidden
            />
            <div className="flex-1 p-5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarSync size={16} strokeWidth={2} className="text-zen-vermilion/80" />
                <span className="text-[9px] font-extralight uppercase tracking-[0.2em] text-zen-vermilion/80">
                  逐日观色
                </span>
              </div>
              <p className="font-zenSerif text-base font-medium tracking-tight text-zen-ink mb-1">
                {colorName}
              </p>
              <p className="font-mono text-xs font-extralight tabular-nums text-zen-ink/60">
                {hex.toUpperCase()} · {daily.dateKey}
              </p>
              <p className="mt-2 text-[10px] font-extralight text-zen-ink/40 group-hover:text-zen-ink/55 transition-colors">
                点击查看今日色彩详情 →
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper p-5 text-center">
            <Library size={20} strokeWidth={1.5} className="mx-auto mb-2 text-zen-ink/40" />
            <p className="font-zenSerif text-2xl font-medium tabular-nums text-zen-ink">{vaultCount}</p>
            <p className="text-[10px] font-extralight uppercase tracking-[0.15em] text-zen-ink/45 mt-1">已藏色卡</p>
          </div>
          <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper p-5 text-center">
            <Trophy size={20} strokeWidth={1.5} className="mx-auto mb-2 text-zen-vermilion/70" />
            <p className="font-zenSerif text-2xl font-medium tabular-nums text-zen-ink">{huntWinDates.length}</p>
            <p className="text-[10px] font-extralight uppercase tracking-[0.15em] text-zen-ink/45 mt-1">挑战优胜</p>
          </div>
        </section>

        {/* Sign out */}
        <section className="pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-zen-ink/15 py-3 text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/70 transition-colors duration-300 hover:border-zen-vermilion/40 hover:text-zen-vermilion"
          >
            <LogOut size={15} strokeWidth={2} />
            退出登录
          </button>
        </section>
      </div>
    </div>
  );
}
