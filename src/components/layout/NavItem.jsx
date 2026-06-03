import React from 'react';

/** ColorHunt-style rail icon + hover label; Zen palette for active/hover. */
export default function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  tooltipDir = 'right',
  disabled = false,
  iconSize = 22,
}) {
  return (
    <div className="relative flex items-center justify-center group">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-zen-vermilion/50 disabled:pointer-events-none disabled:opacity-40 ${
          active
            ? 'bg-zen-vermilion text-white shadow-lg shadow-zen-vermilion/25'
            : 'text-zen-ink/45 hover:bg-zen-vermilion/10 hover:text-zen-vermilion'
        }`}
      >
        <Icon size={iconSize} strokeWidth={2} aria-hidden />
      </button>
      <div
        className={`absolute px-3 py-1.5 bg-zen-ink text-zen-paper text-[10px] font-extralight tracking-wide rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[110] whitespace-nowrap ${
          tooltipDir === 'bottom'
            ? 'top-full mt-2 left-1/2 -translate-x-1/2'
            : 'left-full top-1/2 -translate-y-1/2 ml-2'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
