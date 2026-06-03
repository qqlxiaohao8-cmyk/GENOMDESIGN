import React from 'react';
import { Gamepad2 } from 'lucide-react';

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

export default function GamePage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="px-4 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-6 md:px-6 md:pb-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zen-mist">
              <Gamepad2 size={20} strokeWidth={1.5} className="text-zen-ink/50" />
            </div>
            <div>
              <h1 className="font-zenSerif text-2xl font-medium tracking-tight text-zen-ink">游戏</h1>
              <p className="text-[11px] font-extralight text-zen-ink/40 tracking-wide">色彩小游戏即将上线</p>
            </div>
          </div>
        </div>

        {/* Coming soon message */}
        <div className="mb-8 rounded-2xl border border-dashed border-zen-ink/15 p-6 text-center">
          <p className="text-sm font-extralight text-zen-ink/40 leading-relaxed">
            色彩训练游戏正在开发中。<br />届时你可以通过游戏提升对色彩的感知与搭配能力。
          </p>
        </div>

        {/* Placeholder double-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {PLACEHOLDER_PALETTES.map((colors, i) => (
            <PlaceholderCard key={i} colors={colors} />
          ))}
        </div>
      </div>
    </div>
  );
}
