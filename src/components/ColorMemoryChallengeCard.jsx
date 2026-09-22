import React from 'react';

/**
 * 游戏页 · 色彩记忆：色块本身就是要记的东西。
 */
export default function ColorMemoryChallengeCard({ onOpen }) {
  return (
    <article className="zen-specimen mb-12 flex w-full items-start gap-5 py-1 sm:gap-8">
      <button
        type="button"
        onClick={() => onOpen?.()}
        className="zen-wash zen-wash--petal relative h-[8.25rem] w-[6.75rem] shrink-0"
        style={{
          background: 'linear-gradient(160deg, #E85D75 0%, #4A90D9 38%, #7B68EE 68%, #2ECC71 100%)',
        }}
        aria-label="开始色彩记忆"
      />
      <div className="min-w-0 flex-1 pt-2">
        <p className="font-zenTypewriter text-[10px] text-zen-stone">2</p>
        <h2 className="type-h2 mt-2">色彩记忆</h2>
        <button
          type="button"
          onClick={() => onOpen?.()}
          className="zen-action zen-hit mt-4 px-0"
        >
          开始游戏
        </button>
      </div>
    </article>
  );
}
