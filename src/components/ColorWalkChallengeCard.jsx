import React from 'react';

/**
 * 游戏页 · Color Walk：出门采色，或回看已收的色。
 */
export default function ColorWalkChallengeCard({ onOpen, onOpenSaved }) {
  return (
    <article className="zen-specimen mb-10 flex w-full items-start gap-5 py-1 sm:gap-8">
      <button
        type="button"
        onClick={() => onOpen?.()}
        className="zen-wash zen-wash--pear relative h-[8.25rem] w-[6.5rem] shrink-0"
        style={{
          background: 'linear-gradient(140deg, #D58A6A 0%, #8DA3D9 45%, #CFA0D4 72%, #B8D79A 100%)',
        }}
        aria-label="开始 Color Walk"
      />
      <div className="min-w-0 flex-1 pt-2">
        <p className="font-zenTypewriter text-[10px] text-zen-stone">3</p>
        <h2 className="type-h2 mt-2">Color Walk</h2>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <button
            type="button"
            onClick={() => onOpen?.()}
            className="zen-action zen-hit px-0"
          >
            开始
          </button>
          {onOpenSaved ? (
            <button
              type="button"
              onClick={() => onOpenSaved()}
              className="zen-quiet zen-hit px-0"
            >
              回看
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
