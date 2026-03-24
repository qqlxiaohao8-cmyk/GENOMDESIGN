import { resolveExtractedFontLoading } from './extractedFonts';
import { mergeIconography, mergeInteractionSpec } from './interactionSpec';

/**
 * UI shape language for previews + export. Model may set analysis.uiGeometry.preset
 * or pass partial overrides; otherwise we infer from aesthetic / keywords / designLogic.
 */

const PRESETS = {
  ultraBrutal: {
    id: 'ultraBrutal',
    label: 'Ultra-rounded brutal',
    description: 'Large container radii (~3rem), 2px black frames, chunky offset shadows — lab/poster brutalism.',
    radiusButton: '9999px',
    radiusCard: '3rem',
    radiusSmall: '1.5rem',
    radiusPaletteOuter: '1.5rem',
    radiusPaletteInner: '0.5rem',
    borderWidth: '2px',
    shadowCard: '12px 12px 0 0 rgba(0,0,0,1)',
    shadowButton: '8px 8px 0 0 rgba(0,0,0,1)',
    iconShape: 'squircle',
    focusRing: '2px solid currentColor',
    motion: 'snappy',
  },
  neoBrutal: {
    id: 'neoBrutal',
    label: 'Neo-brutal blocks',
    description: 'Hard corners, thick borders, offset shadows — square-forward tiles and chunky controls.',
    radiusButton: '6px',
    radiusCard: '4px',
    radiusSmall: '2px',
    radiusPaletteOuter: '6px',
    radiusPaletteInner: '0px',
    borderWidth: '2px',
    shadowCard: '6px 6px 0 0 rgba(0,0,0,1)',
    shadowButton: '4px 4px 0 0 rgba(0,0,0,1)',
    iconShape: 'square',
    focusRing: '2px solid currentColor',
    motion: 'snappy',
  },
  sharpSquares: {
    id: 'sharpSquares',
    label: 'Sharp grid',
    description: 'Minimal radii, straight lines, Swiss-like precision — rectangles and hairline structure.',
    radiusButton: '2px',
    radiusCard: '0px',
    radiusSmall: '0px',
    radiusPaletteOuter: '0px',
    radiusPaletteInner: '0px',
    borderWidth: '1px',
    shadowCard: 'none',
    shadowButton: 'none',
    iconShape: 'square',
    focusRing: '2px solid currentColor',
    motion: 'crisp',
  },
  softRounded: {
    id: 'softRounded',
    label: 'Soft rounded',
    description: 'Friendly medium radii on cards and inputs; gentle depth, not fully pill.',
    radiusButton: '12px',
    radiusCard: '16px',
    radiusSmall: '10px',
    radiusPaletteOuter: '14px',
    radiusPaletteInner: '6px',
    borderWidth: '1px',
    shadowCard: '0 8px 24px rgba(15,23,42,0.08)',
    shadowButton: '0 2px 8px rgba(15,23,42,0.12)',
    iconShape: 'squircle',
    focusRing: '2px solid currentColor',
    motion: 'soft',
  },
  pillForward: {
    id: 'pillForward',
    label: 'Pill & loop',
    description: 'High border-radius on CTAs and chips; circular accents, soft loops.',
    radiusButton: '9999px',
    radiusCard: '24px',
    radiusSmall: '9999px',
    radiusPaletteOuter: '16px',
    radiusPaletteInner: '8px',
    borderWidth: '1px',
    shadowCard: '0 12px 32px rgba(15,23,42,0.1)',
    shadowButton: '0 2px 12px rgba(15,23,42,0.15)',
    iconShape: 'circle',
    focusRing: '2px solid currentColor',
    motion: 'soft',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced default',
    description: 'Moderate radii and borders — versatile SaaS baseline without a strong edge case.',
    radiusButton: '9999px',
    radiusCard: '16px',
    radiusSmall: '10px',
    radiusPaletteOuter: '12px',
    radiusPaletteInner: '4px',
    borderWidth: '1px',
    shadowCard: '0 4px 14px rgba(15,23,42,0.08)',
    shadowButton: '0 1px 4px rgba(15,23,42,0.1)',
    iconShape: 'squircle',
    focusRing: '2px solid currentColor',
    motion: 'balanced',
  },
};

function mergePreset(base, overrides) {
  if (!overrides || typeof overrides !== 'object') return { ...base };
  const { preset: _p, notes: _n, ...rest } = overrides;
  return { ...base, ...rest };
}

function styleIdentificationText(analysis) {
  const si = analysis?.styleIdentification;
  if (!si || typeof si !== 'object') return '';
  const chunks = [];
  for (const key of ['coreAesthetic', 'typography', 'components']) {
    const block = si[key];
    if (block && typeof block === 'object') {
      for (const v of Object.values(block)) {
        if (typeof v === 'string' && v.trim()) chunks.push(v);
      }
    }
  }
  return chunks.join(' ');
}

function inferPresetKey(analysis) {
  const text = [
    analysis?.aesthetic,
    analysis?.designLogic,
    analysis?.typography,
    styleIdentificationText(analysis),
    ...(Array.isArray(analysis?.keywords) ? analysis.keywords : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const brutalish =
    /brutal|neo-?brutal|raw|chunky|hard-?edge|chamfer|stark|\blab\b|high-?tech|scientific|poster|offset shadow/i.test(
      text
    );
  const ultraRound =
    /3rem|rounded-\[3rem\]|ultra-?round|rounded-full|maximal radius|pill|super-?round|bubble card/i.test(text);
  if (brutalish && ultraRound) return 'ultraBrutal';
  if (/brutal|neo-?brutal|raw|chunky|hard-?edge|chamfer|stark/i.test(text)) return 'neoBrutal';
  if (/pill|fully rounded|circular chip|loop/i.test(text)) return 'pillForward';
  if (/square|grid|swiss|orthogonal|rigid|hairline|sharp corner|linear/i.test(text)) return 'sharpSquares';
  if (/glass|friendly|playful|bubble|soft round|rounded xl/i.test(text)) return 'softRounded';
  return 'balanced';
}

/**
 * @param {object|null} analysis
 * @returns {typeof PRESETS.balanced & { notes?: string }}
 */
export function resolveUiGeometry(analysis) {
  let baseKey = inferPresetKey(analysis);
  const raw = analysis?.uiGeometry;
  if (raw && typeof raw === 'object' && typeof raw.preset === 'string' && PRESETS[raw.preset]) {
    baseKey = raw.preset;
  }
  const base = PRESETS[baseKey];
  if (!raw || typeof raw !== 'object') {
    return { ...base };
  }
  const { preset: _p, notes, ...rest } = raw;
  const merged = mergePreset(base, rest);
  if (notes && typeof notes === 'string') merged.notes = notes;
  return merged;
}

export function geometryToCssVariables(geom) {
  return {
    '--genom-radius-button': geom.radiusButton,
    '--genom-radius-card': geom.radiusCard,
    '--genom-radius-small': geom.radiusSmall,
    '--genom-radius-palette-outer': geom.radiusPaletteOuter,
    '--genom-radius-palette-inner': geom.radiusPaletteInner,
    '--genom-border-width': geom.borderWidth,
    '--genom-shadow-card': geom.shadowCard,
    '--genom-shadow-button': geom.shadowButton,
    '--genom-icon-shape': geom.iconShape,
  };
}

export function buildStyleExportPayload(analysis, fontStacks) {
  const geom = resolveUiGeometry(analysis);
  const webFonts = resolveExtractedFontLoading(analysis?.fonts);
  return {
    genomExportVersion: 3,
    aesthetic: analysis?.aesthetic ?? null,
    typographyNote: analysis?.typography ?? null,
    palette: analysis?.palette ?? [],
    webFontsLoaded: webFonts.googleFamilies,
    webFontsStylesheet: webFonts.googleFontsHref,
    colorRoles: analysis?.colorRoles ?? null,
    iconography: mergeIconography(analysis),
    interactionSpec: mergeInteractionSpec(analysis),
    uiObservation: analysis?.uiObservation ?? null,
    recognizedComponents: analysis?.recognizedComponents ?? null,
    layoutBlueprint: analysis?.layoutBlueprint ?? null,
    styleIdentification: analysis?.styleIdentification ?? null,
    fonts: analysis?.fonts ?? {},
    fontStacksCSS: fontStacks ?? {},
    uiGeometry: {
      id: geom.id,
      label: geom.label,
      description: geom.description,
      radiusButton: geom.radiusButton,
      radiusCard: geom.radiusCard,
      radiusSmall: geom.radiusSmall,
      radiusPaletteOuter: geom.radiusPaletteOuter,
      radiusPaletteInner: geom.radiusPaletteInner,
      borderWidth: geom.borderWidth,
      shadowCard: geom.shadowCard,
      shadowButton: geom.shadowButton,
      iconShape: geom.iconShape,
      focusRing: geom.focusRing,
      motion: geom.motion,
      notes: geom.notes ?? undefined,
    },
    keywords: analysis?.keywords ?? [],
    designLogic: analysis?.designLogic ?? null,
  };
}
