import React, { useMemo } from 'react';
import { geometryToCssVariables, resolveUiGeometry } from '../lib/styleGeometry';
import { resolveExtractedFontLoading, useInjectExtractedGoogleFonts } from '../lib/extractedFonts';
import {
  buildBtnInteractiveClass,
  interactionSpecToCssVariables,
  mergeInteractionSpec,
} from '../lib/interactionSpec';
import GenomHomePagePreview from './uiKit/GenomHomePagePreview';
import UiKitShowcase from './uiKit/UiKitShowcase';

function parseHex(hex) {
  const h = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function mixRgb(a, b, t) {
  return [
    a[0] * (1 - t) + b[0] * t,
    a[1] * (1 - t) + b[1] * t,
    a[2] * (1 - t) + b[2] * t,
  ];
}

function relativeLuminance([r, g, b]) {
  const srgb = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** Light → dark ramp from a single hue (for preview scale when user picks a main swatch). */
function spectrumFromAnchorRgb(anchorRgb, target = 11) {
  const white = [255, 255, 255];
  const black = [15, 23, 42];
  const primary = anchorRgb;
  const spectrum = [];
  for (let i = 0; i < target; i++) {
    const u = target <= 1 ? 0 : i / (target - 1);
    let rgb;
    if (u <= 0.5) {
      rgb = mixRgb(white, primary, u * 2 * 0.92);
    } else {
      rgb = mixRgb(primary, black, (u - 0.5) * 2 * 0.88);
    }
    spectrum.push(toHex(rgb));
  }
  return spectrum;
}

/** Up to `target` steps: palette hexes first, then interpolated light→dark from primary for missing slots. */
function paletteToHexes(palette, target = 11) {
  const out = [];
  for (const c of palette || []) {
    const raw = typeof c === 'string' ? c : c?.hex;
    if (!raw) continue;
    let h = String(raw).trim();
    if (!h.startsWith('#')) h = `#${h.replace(/^#/, '')}`;
    const rgb = parseHex(h.replace(/^#/, ''));
    if (rgb) out.push(toHex(rgb));
  }
  const fallback = '#3B82F6';
  const primary = parseHex((out[0] || fallback).replace(/^#/, '')) || [59, 130, 246];
  const spectrum = spectrumFromAnchorRgb(primary, target);
  const merged = [];
  for (let i = 0; i < target; i++) {
    merged.push(out[i] || spectrum[i]);
  }
  return merged;
}

/** Merged extraction palette steps (same as kit strip source). Exported for style preview picker. */
export function getMergedPaletteHexes(palette, steps = 11) {
  return paletteToHexes(palette, steps);
}

function deriveTokensFromAnchors(p0, p1, p2, swatches) {
  const white = [255, 255, 255];
  const black = [15, 23, 42];

  const primary = toHex(p0);
  const primaryHover = toHex(mixRgb(p0, black, 0.18));
  const primarySoft = toHex(mixRgb(p0, white, 0.88));
  const pageBg = toHex(mixRgb(p0, white, 0.94));
  const surface = '#FFFFFF';
  const secondaryBtn = toHex(mixRgb(p1, white, 0.82));
  const secondaryHover = toHex(mixRgb(p1, white, 0.72));
  const border = toHex(mixRgb(mixRgb(p0, p1, 0.5), white, 0.75));
  const lum = relativeLuminance(p0);
  const textMain = lum > 0.55 ? '#0F172A' : toHex(mixRgb(black, p2, 0.08));
  const textMuted = lum > 0.55 ? '#64748B' : toHex(mixRgb(mixRgb(p0, black, 0.35), white, 0.2));
  const statUp = '#16A34A';
  const statDown = '#DC2626';

  return {
    primary,
    primaryHover,
    primarySoft,
    pageBg,
    surface,
    secondaryBtn,
    secondaryHover,
    border,
    textMain,
    textMuted,
    statUp,
    statDown,
    swatches,
  };
}

function deriveTokens(hexes) {
  const p0 = parseHex(hexes[0]) || [59, 130, 246];
  const p1 = parseHex(hexes[1]) || p0;
  const p2 = parseHex(hexes[2]) || p0;
  return deriveTokensFromAnchors(p0, p1, p2, hexes);
}

/**
 * Use palette step `anchorIndex` as the main brand hue: ramp + UI tokens follow that swatch.
 * Semantic roles from mergeColorRoles still apply for background/surface/text where set.
 */
function deriveTokensForMainSwatch(hexes, anchorIndex) {
  const len = Math.max(1, hexes.length);
  const idx = Math.min(Math.max(0, anchorIndex), len - 1);
  const p0 = parseHex(hexes[idx]) || [59, 130, 246];
  const p1 = parseHex(hexes[(idx + 1) % len]) || p0;
  const p2 = parseHex(hexes[(idx + Math.max(1, Math.floor(len / 3))) % len]) || p0;
  const ramp = spectrumFromAnchorRgb(p0, len);
  return deriveTokensFromAnchors(p0, p1, p2, ramp);
}

/** Re-apply primary / soft / hover from a hex after mergeColorRoles (preview main-color override). */
function applyPrimaryFamily(out, hexStr) {
  const black = [15, 23, 42];
  const white = [255, 255, 255];
  const raw = String(hexStr || '')
    .trim()
    .replace(/^#/, '');
  const p0 = parseHex(raw);
  if (!p0) return;
  out.primary = toHex(p0);
  out.primaryHover = toHex(mixRgb(p0, black, 0.18));
  out.primarySoft = toHex(mixRgb(p0, white, 0.88));
}

function normalizeRoleHex(h) {
  if (h == null || typeof h !== 'string') return null;
  let s = h.trim();
  if (!s.startsWith('#')) s = `#${s.replace(/^#/, '')}`;
  const rgb = parseHex(s.replace(/^#/, ''));
  if (!rgb) return null;
  return toHex(rgb);
}

/** Merge model-provided semantic colors into derived tokens (preview + export alignment). */
function mergeColorRoles(base, colorRoles) {
  if (!colorRoles || typeof colorRoles !== 'object') return base;
  const black = [15, 23, 42];
  const white = [255, 255, 255];
  const out = { ...base };
  const n = (v) => normalizeRoleHex(v);

  const applyPrimary = (hexStr) => {
    const raw = hexStr.replace(/^#/, '');
    const p0 = parseHex(raw);
    if (!p0) return;
    out.primary = hexStr;
    out.primaryHover = toHex(mixRgb(p0, black, 0.18));
    out.primarySoft = toHex(mixRgb(p0, white, 0.88));
  };

  const primaryHex = n(colorRoles.primary || colorRoles.cta);
  if (primaryHex) applyPrimary(primaryHex);

  const bg = n(colorRoles.background);
  if (bg) out.pageBg = bg;

  const surf = n(colorRoles.surface || colorRoles.surfaceElevated);
  if (surf) out.surface = surf;

  const sec = n(colorRoles.secondary);
  if (sec) {
    const s0 = parseHex(sec.replace(/^#/, ''));
    if (s0) {
      out.secondaryBtn = toHex(mixRgb(s0, white, 0.82));
      out.secondaryHover = toHex(mixRgb(s0, white, 0.72));
    }
  }

  const acc = n(colorRoles.accent);
  if (acc && !primaryHex) applyPrimary(acc);

  const tx = n(colorRoles.text);
  if (tx) out.textMain = tx;
  const tmx = n(colorRoles.textMuted);
  if (tmx) out.textMuted = tmx;
  const br = n(colorRoles.border);
  if (br) out.border = br;

  return out;
}

/** @deprecated use resolveExtractedFontLoading — kept for StylePreviewPage display strings */
export function fontStacksFromModel(fonts) {
  const r = resolveExtractedFontLoading(fonts);
  return { heading: r.headingCSS, body: r.bodyCSS, accent: r.accentCSS };
}

function iconRadius(geom) {
  if (geom.iconShape === 'circle') return '9999px';
  if (geom.iconShape === 'square') return geom.radiusSmall || '2px';
  return '12px';
}

function previewHintsFromIdentification(styleIdentification) {
  const si = styleIdentification;
  if (!si || typeof si !== 'object') {
    return {
      meshGradient: false,
      headingCaps: false,
      headingSquash: false,
      italicEmphasis: false,
    };
  }
  const typ = [si.typography?.headings, si.typography?.styling].filter(Boolean).join(' ');
  const bg = [si.components?.backgrounds, si.coreAesthetic?.colorway].filter(Boolean).join(' ');
  return {
    meshGradient: /mesh|blurred?\s*blobs?|\bblobs?\b|soft\s+fog|atmospheric|low opacity|10\s*[-–]\s*20\s*%/i.test(bg),
    headingCaps: /all-?caps|uppercase|font-?black|tracking-?tighter/i.test(typ),
    headingSquash: /scale-y|compressed.*tall|tall aesthetic|scale-y-110/i.test(typ),
    italicEmphasis: /italic|oblique/i.test(si.typography?.styling || ''),
  };
}

/**
 * Parameterized UI kit: colors + type from extraction; radii, shadows, icon geometry from uiGeometry (model or inferred).
 */
export default function ExtractedStyleUiPreview({
  analysisResult,
  geometry: geometryOverride,
  interactive = true,
  /** When set (0…n-1), preview + ramp use that merged-palette step as the main hue. Omit/null = extraction default. */
  palettePrimaryIndex: palettePrimaryIndexProp,
}) {
  const hexes = useMemo(
    () => paletteToHexes(analysisResult?.palette, 11),
    [analysisResult?.palette]
  );
  const useAnchor = typeof palettePrimaryIndexProp === 'number' && !Number.isNaN(palettePrimaryIndexProp);
  const safeIndex = useAnchor
    ? Math.min(Math.max(0, palettePrimaryIndexProp), Math.max(0, hexes.length - 1))
    : 0;

  const t = useMemo(() => {
    if (!useAnchor) {
      const base = deriveTokens(hexes);
      return mergeColorRoles(base, analysisResult?.colorRoles);
    }
    const base = deriveTokensForMainSwatch(hexes, safeIndex);
    const merged = mergeColorRoles(base, analysisResult?.colorRoles);
    applyPrimaryFamily(merged, hexes[safeIndex] || merged.primary);
    return merged;
  }, [hexes, safeIndex, useAnchor, analysisResult?.colorRoles]);
  const fontStacks = useMemo(
    () => resolveExtractedFontLoading(analysisResult?.fonts),
    [analysisResult?.fonts]
  );

  useInjectExtractedGoogleFonts(fontStacks.googleFontsHref);

  const geom = useMemo(
    () => geometryOverride ?? resolveUiGeometry(analysisResult),
    [analysisResult, geometryOverride]
  );
  const ixMerged = useMemo(() => mergeInteractionSpec(analysisResult), [analysisResult]);
  const cssVars = useMemo(() => {
    return { ...geometryToCssVariables(geom), ...interactionSpecToCssVariables(ixMerged) };
  }, [geom, ixMerged]);
  const ir = iconRadius(geom);

  const btnInteractive = useMemo(
    () => buildBtnInteractiveClass(ixMerged, interactive),
    [ixMerged, interactive]
  );

  const previewHints = useMemo(
    () => previewHintsFromIdentification(analysisResult?.styleIdentification),
    [analysisResult?.styleIdentification]
  );

  const shell = {
    ...cssVars,
    backgroundColor: t.pageBg,
    color: t.textMain,
    fontFamily: fontStacks.bodyCSS,
    borderColor: t.border,
  };

  const bw = geom.borderWidth || '1px';

  const blobA = useAnchor ? t.primarySoft || t.primary : hexes[0] || t.primary;
  const blobB = useAnchor ? t.primary : hexes[2] || hexes[1] || t.primary;

  return (
    <section
      className="relative border-2 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      style={{ ...shell, borderRadius: geom.radiusCard }}
      aria-label="Live UI preview using extracted colors, type, and geometry"
    >
      {previewHints.meshGradient ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div
            className="absolute -top-[18%] -left-[22%] w-[88%] h-[58%] rounded-full blur-[72px]"
            style={{ backgroundColor: blobA, opacity: 0.17 }}
          />
          <div
            className="absolute top-[22%] -right-[18%] w-[68%] h-[52%] rounded-full blur-[68px]"
            style={{ backgroundColor: blobB, opacity: 0.13 }}
          />
        </div>
      ) : null}
      <div className="relative z-[1] p-4 sm:p-6 md:p-8" style={{ borderRadius: geom.radiusCard }}>
        <GenomHomePagePreview
          analysisResult={analysisResult}
          t={t}
          geom={geom}
          fontStacks={fontStacks}
          bw={bw}
          interactive={interactive}
          previewHints={previewHints}
          btnInteractive={btnInteractive}
        />
        <UiKitShowcase
          analysisResult={analysisResult}
          t={t}
          geom={geom}
          fontStacks={fontStacks}
          bw={bw}
          interactive={interactive}
          previewHints={previewHints}
          btnInteractive={btnInteractive}
          ir={ir}
        />
      </div>
    </section>
  );
}
