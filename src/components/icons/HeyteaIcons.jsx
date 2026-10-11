import React, { useEffect, useState } from 'react';
import { BUNDLED_ICON_SRC, getDisplayIconSrc, subscribeDisplayIcons } from '../../lib/displayIcons';

function BrandIcon({ iconKey, className = '', label }) {
  const [uploaded, setUploaded] = useState(() => getDisplayIconSrc(iconKey));
  useEffect(
    () => subscribeDisplayIcons((map) => setUploaded(map[iconKey] || '')),
    [iconKey],
  );
  const src = uploaded || BUNDLED_ICON_SRC[iconKey];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={`heytea-icon-upload ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

export function ZhuoquInkDefs() {
  return null;
}

export function IconMine({ className }) {
  return <BrandIcon iconKey="mine" className={className} />;
}

export function IconSea({ className }) {
  return <BrandIcon iconKey="sea" className={className} />;
}

export function IconShengSe({ className }) {
  return <BrandIcon iconKey="shengse" className={className} />;
}

export function IconExtract({ className }) {
  return <BrandIcon iconKey="extract" className={className} />;
}

export function IconSettings({ className }) {
  return <BrandIcon iconKey="settings" className={className} />;
}

export function IconMemory({ className }) {
  return <BrandIcon iconKey="memory" className={className} />;
}

export function IconWalk({ className }) {
  return <BrandIcon iconKey="walk" className={className} />;
}
