import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy, CheckCircle2, Download } from 'lucide-react';
import ExtractedStyleUiPreview, { fontStacksFromModel, getMergedPaletteHexes } from './ExtractedStyleUiPreview';
import { buildStyleExportPayload, geometryToCssVariables, resolveUiGeometry } from '../lib/styleGeometry';
import {
  buildTailwindKitSnippet,
  mergeIconography,
  mergeInteractionSpec,
  interactionSpecToCssVariables,
} from '../lib/interactionSpec';
import { resolveExtractedFontLoading, useInjectExtractedGoogleFonts } from '../lib/extractedFonts';

function paletteHex(c) {
  if (!c) return null;
  const raw = typeof c === 'string' ? c : c?.hex;
  if (!raw) return null;
  return String(raw).trim().startsWith('#')
    ? String(raw).trim().toUpperCase()
    : `#${String(raw).trim().replace(/^#/, '')}`.toUpperCase();
}

/** Labels aligned with merged kit palette strip (50 → 950). */
const PREVIEW_SCALE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function normalizeKeywordToken(s) {
  return String(s || '')
    .replace(/^#/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/** Drop layout / component anatomy chips; Style preview "Tags" = vibe & look only. */
const STRUCTURAL_KEYWORD_DENY = new Set([
  'navbar',
  'nav-bar',
  'nav',
  'sidebar',
  'side-bar',
  'card-grid',
  'single-column',
  'singlecolumn',
  'multi-column',
  'multicolumn',
  'two-column',
  'three-column',
  'double-column',
  'triple-column',
  'dashboard',
  'modal',
  'table',
  'data-table',
  'form',
  'hero',
  'footer',
  'header',
  'navigation',
  'list-view',
  'split-view',
  'top-nav',
  'side-nav',
  'main-nav',
  'primary-nav',
  'toolbar',
  'breadcrumb',
  'pagination',
  'accordion',
  'stepper',
  'wizard',
  'upload-zone',
  'pricing-row',
  'feature-grid',
  'icon-button',
  'search-bar',
  'app-bar',
  'chip',
  'chips',
  'drawer',
  'sheet',
  'popover',
  'dialog',
  'input',
  'container',
  'layout',
  'section',
  'chrome',
  'rail',
  'menu-bar',
  'status-bar',
  'dock',
  'panel',
  'panels',
  'checkout',
  'cart',
  'image-upload',
  'primary-button',
  'secondary-button',
  'ghost-button',
  'cta-row',
  'grid',
  'card',
  'column',
  'columns',
  'button',
  'buttons',
  'row',
  'rows',
]);

function isStructuralUiKeyword(raw) {
  const t = normalizeKeywordToken(raw);
  if (!t) return true;
  if (STRUCTURAL_KEYWORD_DENY.has(t)) return true;
  const spaced = String(raw || '')
    .replace(/^#/, '')
    .trim()
    .toLowerCase();
  if (/^(single|double|triple|two|three|multi)[\s-]+columns?$/i.test(spaced)) return true;
  if (/^card[\s-]+grid$/i.test(spaced)) return true;
  return false;
}

function styleKeywordsForPreview(analysis) {
  const list = Array.isArray(analysis?.keywords) ? analysis.keywords : [];
  const filtered = list.filter((k) => !isStructuralUiKeyword(k));
  if (filtered.length > 0) return filtered;
  const aes = analysis?.aesthetic;
  if (typeof aes === 'string' && aes.trim()) return [aes.trim()];
  return [];
}

export default function StylePreviewPage({
  analysis,
  onClose,
  onCopyPrompt,
  copyStatus,
  copyPromptKey = 'preview-prompt',
}) {
  const [exportCopied, setExportCopied] = useState(false);
  const [cssCopied, setCssCopied] = useState(false);
  const [twCopied, setTwCopied] = useState(false);
  /** null = use extraction default tokens; number = treat that merged-palette step as main hue */
  const [mainSwatchIndex, setMainSwatchIndex] = useState(null);
  const geom = useMemo(() => resolveUiGeometry(analysis), [analysis]);
  const stacks = useMemo(() => fontStacksFromModel(analysis?.fonts), [analysis?.fonts]);
  const fontLoad = useMemo(() => resolveExtractedFontLoading(analysis?.fonts), [analysis?.fonts]);
  useInjectExtractedGoogleFonts(fontLoad.googleFontsHref);
  const exportPayload = useMemo(
    () => buildStyleExportPayload(analysis, { heading: stacks.heading, body: stacks.body, accent: stacks.accent }),
    [analysis, stacks]
  );

  const cssBlock = useMemo(() => {
    const vars = {
      ...geometryToCssVariables(geom),
      ...interactionSpecToCssVariables(mergeInteractionSpec(analysis)),
    };
    const lines = [':root {', ...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`), '}'];
    return lines.join('\n');
  }, [geom, analysis]);

  const tailwindSnippet = useMemo(() => buildTailwindKitSnippet(analysis, geom), [analysis, geom]);

  const jsonExport = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyExport = () => {
    const el = document.createElement('textarea');
    el.value = jsonExport;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const copyCssVars = () => {
    const el = document.createElement('textarea');
    el.value = cssBlock;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCssCopied(true);
    setTimeout(() => setCssCopied(false), 2000);
  };

  const copyTailwindSnippet = () => {
    const el = document.createElement('textarea');
    el.value = tailwindSnippet;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setTwCopied(true);
    setTimeout(() => setTwCopied(false), 2000);
  };

  const downloadExport = () => {
    const blob = new Blob([jsonExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genom-style-${(analysis?.aesthetic || 'export').replace(/\s+/g, '-').slice(0, 40)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const promptText = analysis?.prompt || '';
  const styleTagList = useMemo(() => styleKeywordsForPreview(analysis), [analysis]);

  const mergedKitHexes = useMemo(() => getMergedPaletteHexes(analysis?.palette, 11), [analysis?.palette]);

  const paletteFingerprint = useMemo(
    () => JSON.stringify((analysis?.palette || []).map((c) => paletteHex(c)).filter(Boolean)),
    [analysis?.palette]
  );

  useEffect(() => {
    setMainSwatchIndex(null);
  }, [paletteFingerprint, analysis?.aesthetic]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white text-black overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-preview-page-title"
    >
      <header className="shrink-0 border-b-2 border-black bg-white px-4 py-4 md:px-8 flex flex-wrap items-center gap-3 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border-2 border-black hover:bg-[#ccff00] transition-colors shrink-0"
            aria-label="Close style preview"
          >
            <X size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00c2d6]">Style preview</p>
            <h1 id="style-preview-page-title" className="text-xl md:text-2xl font-black uppercase tracking-tighter truncate">
              {analysis?.aesthetic || 'Extracted style'}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-black font-black text-[10px] uppercase tracking-widest bg-white hover:bg-neutral-50 shadow-[3px_3px_0_0_#000]"
          >
            {exportCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
            {exportCopied ? 'Copied JSON' : 'Copy export JSON'}
          </button>
          <button
            type="button"
            onClick={downloadExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-black font-black text-[10px] uppercase tracking-widest bg-[#ccff00] hover:brightness-95 shadow-[3px_3px_0_0_#000]"
          >
            <Download size={14} />
            Download JSON
          </button>
          <button
            type="button"
            onClick={copyCssVars}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-black font-black text-[10px] uppercase tracking-widest bg-white hover:bg-neutral-100 shadow-[3px_3px_0_0_#000]"
          >
            {cssCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
            {cssCopied ? 'Copied CSS' : 'Copy CSS vars'}
          </button>
          {onCopyPrompt && promptText ? (
            <button
              type="button"
              onClick={onCopyPrompt}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-black font-black text-[10px] uppercase tracking-widest bg-white hover:bg-[#ccff00]/30"
            >
              {copyStatus === copyPromptKey ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
              {copyStatus === copyPromptKey ? 'Copied prompt' : 'Copy replication prompt'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Overview</h2>
            <p className="text-base md:text-lg font-bold leading-relaxed text-neutral-800 whitespace-pre-wrap">
              {analysis?.designLogic || '—'}
            </p>
          </section>

          {styleTagList.length > 0 ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Tags</h2>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                  Style & vibe — not layout or component names
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {styleTagList.map((k, i) => (
                  <span
                    key={`${String(k)}-${i}`}
                    className="px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase rounded-full"
                  >
                    #{String(k).replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Iconography</h2>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Stroke weight, scale, and style hints for icons in the live kit (merged with defaults if omitted).
            </p>
            <pre className="text-[11px] font-mono bg-neutral-50 text-neutral-900 p-4 rounded-xl overflow-x-auto border-2 border-black whitespace-pre-wrap">
              {JSON.stringify(mergeIconography(analysis), null, 2)}
            </pre>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Interactions &amp; motion</h2>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Focus, hover, press, and timing — mapped to Tailwind-style classes in the component gallery.
            </p>
            <pre className="text-[11px] font-mono bg-neutral-50 text-neutral-900 p-4 rounded-xl overflow-x-auto border-2 border-black whitespace-pre-wrap">
              {JSON.stringify(mergeInteractionSpec(analysis), null, 2)}
            </pre>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Interactive UI kit</h2>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Full-page GENOM mockup (header, toolbar, hero, footer) plus a curated component gallery — all driven by this
              extraction. Use main preview color above to shift the primary hue.
            </p>
            <div className="rounded-2xl border-2 border-black bg-neutral-50 p-4 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Main preview color</p>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Pick which step of the merged palette drives primary, soft fills, and the kit ramp below. Reset restores
                  the extraction default.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {mergedKitHexes.map((hex, i) => {
                  const selected = mainSwatchIndex === i;
                  return (
                    <button
                      key={`${hex}-${i}`}
                      type="button"
                      onClick={() => setMainSwatchIndex(i)}
                      className={`group flex flex-col items-center gap-1 rounded-lg p-1 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                        selected ? 'ring-2 ring-black ring-offset-2 bg-white' : 'hover:ring-1 hover:ring-black/30'
                      }`}
                      title={`Use ${PREVIEW_SCALE_LABELS[i] || i} — ${hex}`}
                      aria-pressed={selected}
                      aria-label={`Set main preview color to scale ${PREVIEW_SCALE_LABELS[i] || i}, ${hex}`}
                    >
                      <span
                        className="w-10 h-10 border border-black/20 shadow-sm"
                        style={{ backgroundColor: hex, borderRadius: geom.radiusSmall }}
                      />
                      <span className="text-[9px] font-black tabular-nums text-neutral-500">{PREVIEW_SCALE_LABELS[i] ?? i}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMainSwatchIndex(null)}
                  className="ml-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black rounded-full bg-white hover:bg-[#ccff00]/40 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
            <ExtractedStyleUiPreview
              analysisResult={analysis}
              interactive
              palettePrimaryIndex={mainSwatchIndex ?? undefined}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Typography</h2>
            <p className="text-sm font-medium text-neutral-600">{analysis?.typography || '—'}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'heading', label: 'Heading', stack: stacks.heading },
                { key: 'body', label: 'Body', stack: stacks.body },
                { key: 'accent', label: 'Accent', stack: stacks.accent },
              ].map(({ key, label, stack }) => {
                const note = analysis?.fonts?.[key];
                return (
                  <div key={key} className="border-2 border-black rounded-2xl p-4 bg-neutral-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{label}</p>
                    <p
                      className="text-xs font-bold text-neutral-800 mb-3 leading-snug"
                      style={{
                        fontFamily:
                          key === 'heading'
                            ? fontLoad.headingCSS
                            : key === 'accent'
                              ? fontLoad.accentCSS
                              : fontLoad.bodyCSS,
                      }}
                    >
                      {note ? String(note) : '—'}
                    </p>
                    <p className="text-[10px] font-mono text-neutral-600 break-all leading-relaxed">CSS: {stack}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Palette</h2>
            <div className="flex flex-wrap gap-3">
              {(analysis?.palette || []).map((c, i) => {
                const hex = paletteHex(c);
                if (!hex) return null;
                return (
                  <div
                    key={`${hex}-${i}`}
                    className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl border-2 border-black bg-white"
                  >
                    <span
                      className="w-9 h-9 shrink-0 border border-black/20"
                      style={{ backgroundColor: hex, borderRadius: geom.radiusSmall }}
                      aria-hidden
                    />
                    <span className="font-mono text-xs font-black">{hex}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 pb-16">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#00c2d6]">Code</h2>
            <p className="text-sm font-bold text-neutral-700">{geom.label}</p>
            <p className="text-sm text-neutral-600 leading-relaxed">{geom.description}</p>
            {geom.notes ? <p className="text-xs font-medium text-neutral-500 italic">{geom.notes}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyTailwindSnippet}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black font-black text-[10px] uppercase tracking-widest bg-white hover:bg-neutral-50 shadow-[3px_3px_0_0_#000]"
              >
                {twCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                {twCopied ? 'Copied' : 'Copy Tailwind hints'}
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-neutral-100 text-neutral-900 p-4 rounded-xl overflow-x-auto border-2 border-black whitespace-pre">
              {tailwindSnippet}
            </pre>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Geometry tokens</p>
                <pre className="text-[11px] font-mono bg-neutral-900 text-neutral-100 p-4 rounded-xl overflow-x-auto border-2 border-black">
                  {JSON.stringify(exportPayload.uiGeometry, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">CSS variables</p>
                <pre className="text-[11px] font-mono bg-neutral-100 text-neutral-900 p-4 rounded-xl overflow-x-auto border-2 border-black whitespace-pre">
                  {cssBlock}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
