import React from 'react';

/** Shared edge grain so line icons match the stamped brand icons. */
export default function InkFilter() {
  return (
    <svg className="ink-filter-defs" aria-hidden="true" focusable="false">
      <filter id="sekong-ink" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
