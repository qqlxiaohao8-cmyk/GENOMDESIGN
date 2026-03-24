import React, { useMemo } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { iconStrokeFromIconography, iconPxFromScale, mergeIconography } from '../../lib/interactionSpec';
import { ICON_STYLE_DISPLAY, normalizeIconographyStyle } from '../../lib/iconStyleReplication';
import StylizedLucideIcon from './StylizedLucideIcon';

function truncateWords(s, maxLen) {
  const t = String(s || '').trim();
  if (!t) return 'Design intelligence from your references — extracted colors, type, and UI geometry.';
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const last = cut.lastIndexOf(' ');
  return (last > 40 ? cut.slice(0, last) : cut).trim() + '…';
}

/**
 * Full-page mock: header, toolbar strip, hero with GENOM wordmark, footer — all tokens from extraction.
 */
export default function GenomHomePagePreview({
  analysisResult,
  t,
  geom,
  fontStacks,
  bw,
  interactive,
  btnInteractive,
  previewHints,
}) {
  const ig = mergeIconography(analysisResult);
  const stroke = iconStrokeFromIconography(ig);
  const iconPx = iconPxFromScale(ig);
  const extractedIconStyle = normalizeIconographyStyle(ig.style);
  const logoIconSelfContained = ['skeuomorphism', 'clay', 'glassy'].includes(extractedIconStyle);
  const logoMarkSize = Math.max(26, Math.min(40, Math.round(iconPx * 1.45)));
  const aesthetic = analysisResult?.aesthetic || 'Extracted style';
  const tagline = useMemo(
    () => truncateWords(analysisResult?.designLogic || analysisResult?.typography, 160),
    [analysisResult?.designLogic, analysisResult?.typography]
  );
  const navStyle = analysisResult?.layoutBlueprint?.navStyle || 'top';

  const headerBg = t.surface;
  const toolbarBg = t.primarySoft;
  const mainBg = t.pageBg;

  return (
    <div className="mb-10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: t.textMuted, fontFamily: fontStacks.accentCSS }}
          >
            Sample homepage
          </p>
          <h2
            className={`text-lg sm:text-xl font-bold mt-0.5 ${
              previewHints.headingCaps ? 'uppercase tracking-tighter' : 'tracking-tight'
            }`}
            style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}
          >
            Full page in this style
          </h2>
          <p className="text-xs mt-1 max-w-xl" style={{ color: t.textMuted, fontFamily: fontStacks.bodyCSS }}>
            Header logo uses your{' '}
            <span className="font-semibold" style={{ color: t.primary }}>
              {ICON_STYLE_DISPLAY[extractedIconStyle] || extractedIconStyle}
            </span>{' '}
            iconography (stroke + treatment). Toolbar, hero, and footer share palette, type, radii, and buttons from the
            extraction.
          </p>
        </div>
      </div>

      <div
        className="overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]"
        style={{
          backgroundColor: headerBg,
          borderColor: t.border,
          borderWidth: bw,
          borderStyle: 'solid',
          borderRadius: geom.radiusCard,
        }}
      >
        <header style={{ borderBottom: `${bw} solid ${t.border}` }}>
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6"
            style={{ backgroundColor: headerBg }}
          >
            <div className="flex items-center gap-3 min-w-0" aria-label="GENOM home">
              <span
                className="inline-flex items-center justify-center shrink-0 overflow-visible"
                style={{
                  width: logoMarkSize + 20,
                  height: logoMarkSize + 20,
                  minWidth: logoMarkSize + 20,
                  minHeight: logoMarkSize + 20,
                  backgroundColor: logoIconSelfContained ? 'transparent' : t.primary,
                  borderRadius: ig.corner === 'sharp' ? '2px' : geom.radiusSmall,
                  border:
                    logoIconSelfContained || extractedIconStyle === 'outline' || extractedIconStyle === 'broken'
                      ? `${bw} solid ${t.border}`
                      : undefined,
                }}
                aria-hidden
              >
                <StylizedLucideIcon
                  Icon={Sparkles}
                  styleKey={extractedIconStyle}
                  primary={logoIconSelfContained ? t.primary : '#FFFFFF'}
                  secondary={t.primarySoft}
                  soft={t.primarySoft}
                  size={logoMarkSize}
                  strokeWidth={stroke}
                  radiusSmall={geom.radiusSmall}
                />
              </span>
              <span
                className={`text-lg md:text-xl font-black tracking-tight truncate ${
                  previewHints.headingCaps ? 'uppercase' : ''
                }`}
                style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}
              >
                GENOM
              </span>
            </div>

            {navStyle === 'minimal' ? (
              <button
                type="button"
                disabled={!interactive}
                className={`text-sm font-semibold px-4 py-2 text-white shrink-0 ${interactive ? btnInteractive : ''}`}
                style={{
                  backgroundColor: t.primary,
                  borderRadius: geom.radiusButton,
                  boxShadow: geom.shadowButton === 'none' ? undefined : geom.shadowButton,
                  fontFamily: fontStacks.bodyCSS,
                }}
              >
                Sign in
              </button>
            ) : (
              <>
                <nav
                  className="hidden md:flex items-center gap-6 text-sm font-semibold"
                  style={{ color: t.textMuted, fontFamily: fontStacks.bodyCSS }}
                  aria-label="Primary"
                >
                  <span className="cursor-default hover:opacity-80 transition-opacity">Product</span>
                  <span className="cursor-default hover:opacity-80 transition-opacity">Vault</span>
                  <span className="cursor-default hover:opacity-80 transition-opacity">Community</span>
                  <span className="cursor-default hover:opacity-80 transition-opacity">Docs</span>
                </nav>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="md:hidden p-2 border"
                    style={{
                      borderColor: t.border,
                      borderWidth: bw,
                      borderRadius: geom.radiusSmall,
                      color: t.textMain,
                    }}
                    aria-label="Menu"
                  >
                    <StylizedLucideIcon
                      Icon={Menu}
                      styleKey={extractedIconStyle}
                      primary={t.textMain}
                      secondary={t.primary}
                      soft={t.primarySoft}
                      size={20}
                      strokeWidth={stroke}
                      radiusSmall={geom.radiusSmall}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={!interactive}
                    className={`hidden sm:inline-flex text-sm font-semibold px-4 py-2 border ${interactive ? btnInteractive : ''}`}
                    style={{
                      borderColor: t.border,
                      borderWidth: bw,
                      borderRadius: geom.radiusButton,
                      color: t.textMain,
                      fontFamily: fontStacks.bodyCSS,
                      backgroundColor: 'transparent',
                    }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    disabled={!interactive}
                    className={`text-sm font-semibold px-4 py-2 text-white ${interactive ? btnInteractive : ''}`}
                    style={{
                      backgroundColor: t.primary,
                      borderRadius: geom.radiusButton,
                      boxShadow: geom.shadowButton === 'none' ? undefined : geom.shadowButton,
                      fontFamily: fontStacks.bodyCSS,
                    }}
                  >
                    Get started
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-2 px-4 py-2 md:px-6 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: toolbarBg,
              borderTop: `${bw} solid ${t.border}`,
              color: t.textMuted,
              fontFamily: fontStacks.accentCSS,
            }}
            role="toolbar"
            aria-label="Page toolbar"
          >
            <span
              className="px-2 py-1 rounded-md"
              style={{ backgroundColor: t.surface, border: `${bw} solid ${t.border}`, color: t.textMain }}
            >
              Workspace
            </span>
            <span className="opacity-70">/</span>
            <span>Styles</span>
            <span className="opacity-70">/</span>
            <span style={{ color: t.primary }}>Preview</span>
          </div>
        </header>

        <main
          className="flex flex-col items-center justify-center text-center px-6 py-14 md:py-20"
          style={{ backgroundColor: mainBg, fontFamily: fontStacks.bodyCSS }}
        >
          <p
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-3"
            style={{ color: t.primary, fontFamily: fontStacks.accentCSS }}
          >
            {aesthetic}
          </p>
          <h1
            className={`text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] max-w-[90vw] ${
              previewHints.headingCaps ? 'uppercase tracking-tighter' : 'tracking-tighter'
            } ${previewHints.headingSquash ? 'inline-block origin-center scale-y-110' : ''}`}
            style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}
          >
            {previewHints.italicEmphasis ? (
              <>
                <span className="italic">GENOM</span>
              </>
            ) : (
              'GENOM'
            )}
          </h1>
          <p
            className="mt-5 max-w-md text-sm md:text-base leading-relaxed"
            style={{ color: t.textMuted, fontFamily: fontStacks.bodyCSS }}
          >
            {tagline}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={!interactive}
              className={`px-6 py-3 text-sm font-semibold text-white ${interactive ? btnInteractive : ''}`}
              style={{
                backgroundColor: t.primary,
                borderRadius: geom.radiusButton,
                boxShadow: geom.shadowButton === 'none' ? undefined : geom.shadowButton,
                fontFamily: fontStacks.bodyCSS,
              }}
            >
              Extract a style
            </button>
            <button
              type="button"
              disabled={!interactive}
              className={`px-6 py-3 text-sm font-semibold border ${interactive ? btnInteractive : ''}`}
              style={{
                backgroundColor: t.surface,
                color: t.textMain,
                borderColor: t.border,
                borderWidth: bw,
                borderRadius: geom.radiusButton,
                fontFamily: fontStacks.bodyCSS,
              }}
            >
              View gallery
            </button>
          </div>
        </main>

        <footer
          className="px-4 py-8 md:px-8 md:py-10"
          style={{
            backgroundColor: t.surface,
            borderTop: `${bw} solid ${t.border}`,
            fontFamily: fontStacks.bodyCSS,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex items-center justify-center shrink-0 overflow-visible"
                  style={{
                    width: iconPx + 12,
                    height: iconPx + 12,
                    backgroundColor: logoIconSelfContained ? 'transparent' : t.primarySoft,
                    borderRadius: ig.corner === 'sharp' ? '2px' : geom.radiusSmall,
                    border: `${bw} solid ${t.border}`,
                  }}
                  aria-hidden
                >
                  <StylizedLucideIcon
                    Icon={Sparkles}
                    styleKey={extractedIconStyle}
                    primary={logoIconSelfContained ? t.primary : t.textMain}
                    secondary={t.primary}
                    soft={t.primarySoft}
                    size={iconPx}
                    strokeWidth={stroke}
                    radiusSmall={geom.radiusSmall}
                  />
                </span>
                <p className="text-sm font-black tracking-tight" style={{ color: t.textMain, fontFamily: fontStacks.headingCSS }}>
                  GENOM
                </p>
              </div>
              <p className="text-xs mt-2 max-w-xs" style={{ color: t.textMuted }}>
                Style preview uses your extraction tokens only — not a separate theme.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs font-semibold" style={{ color: t.textMuted }}>
              <span className="cursor-default hover:underline">Privacy</span>
              <span className="cursor-default hover:underline">Terms</span>
              <span className="cursor-default hover:underline">Contact</span>
              <span className="cursor-default hover:underline">Status</span>
            </div>
          </div>
          <p className="text-[10px] mt-8 pt-6 font-medium uppercase tracking-widest" style={{ color: t.textMuted, borderTop: `${bw} solid ${t.border}` }}>
            © {new Date().getFullYear()} GENOM · {aesthetic}
          </p>
        </footer>
      </div>
    </div>
  );
}
