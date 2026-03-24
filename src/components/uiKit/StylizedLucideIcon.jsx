import React from 'react';
import { normalizeIconographyStyle } from '../../lib/iconStyleReplication';

/**
 * Lucide icon approximating common UI icon treatments from extraction iconography.style.
 */
export default function StylizedLucideIcon({
  Icon,
  styleKey: styleKeyRaw,
  primary,
  secondary,
  soft,
  size = 20,
  strokeWidth = 1.5,
  radiusSmall = '10px',
  className = '',
  title,
}) {
  const styleKey = normalizeIconographyStyle(styleKeyRaw);
  const sec = secondary || primary;
  const sf = soft || sec;

  const lineProps = {
    size,
    strokeWidth,
    absoluteStrokeWidth: false,
    className,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': title ? undefined : true,
    title,
  };

  if (styleKey === 'outline') {
    return <Icon {...lineProps} stroke={primary} fill="none" />;
  }

  if (styleKey === 'filled') {
    return (
      <Icon
        {...lineProps}
        stroke={primary}
        fill={primary}
        strokeWidth={Math.min(strokeWidth, 0.85)}
        style={{ fill: primary }}
      />
    );
  }

  if (styleKey === 'bold') {
    return <Icon {...lineProps} stroke={primary} fill="none" strokeWidth={strokeWidth * 1.85} />;
  }

  if (styleKey === 'bulk') {
    return (
      <Icon
        {...lineProps}
        stroke={primary}
        fill="none"
        strokeWidth={strokeWidth * 2.35}
        strokeLinecap="square"
      />
    );
  }

  if (styleKey === 'duotone') {
    return (
      <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <Icon
          size={size}
          stroke={sec}
          fill={sec}
          fillOpacity={0.22}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          absoluteStrokeWidth={false}
          className="absolute inset-0"
          aria-hidden={title ? undefined : true}
        />
        <Icon {...lineProps} stroke={primary} fill="none" className="relative z-[1]" />
      </span>
    );
  }

  if (styleKey === 'broken') {
    return <Icon {...lineProps} stroke={primary} fill="none" strokeDasharray="5 4" />;
  }

  if (styleKey === '3d') {
    return (
      <span
        className={`inline-flex ${className}`}
        style={{ filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.28)) drop-shadow(1px 1px 0 rgba(255,255,255,0.2))' }}
      >
        <Icon {...lineProps} stroke={primary} fill="none" />
      </span>
    );
  }

  if (styleKey === 'skeuomorphism') {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          padding: '3px',
          borderRadius: radiusSmall,
          background: `linear-gradient(160deg, rgba(255,255,255,0.95) 0%, ${sf} 100%)`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 2px 3px 8px rgba(0,0,0,0.18)',
        }}
      >
        <Icon {...lineProps} stroke={primary} fill="none" />
      </span>
    );
  }

  if (styleKey === 'clay') {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          padding: '4px',
          borderRadius: radiusSmall,
          background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), ${sf})`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.12), inset 0 -2px 6px rgba(0,0,0,0.06)`,
        }}
      >
        <Icon {...lineProps} stroke={primary} fill="none" />
      </span>
    );
  }

  if (styleKey === 'illustrated') {
    return (
      <span className={`inline-flex ${className}`} style={{ transform: 'rotate(-2.5deg)' }}>
        <Icon {...lineProps} stroke={primary} fill="none" strokeWidth={strokeWidth * 1.15} />
      </span>
    );
  }

  if (styleKey === 'glassy') {
    return (
      <span
        className={`inline-flex items-center justify-center backdrop-blur-[2px] ${className}`}
        style={{
          padding: '2px',
          borderRadius: radiusSmall,
          backgroundColor: 'rgba(255,255,255,0.18)',
          border: `1px solid ${primary}55`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35)`,
        }}
      >
        <Icon {...lineProps} stroke={primary} fill="none" />
      </span>
    );
  }

  return <Icon {...lineProps} stroke={primary} fill="none" />;
}
