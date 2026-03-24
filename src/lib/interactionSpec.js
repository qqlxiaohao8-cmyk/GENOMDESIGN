/** Defaults when model omits fields (legacy vault rows). */
export const DEFAULT_ICONOGRAPHY = {
  style: 'outline',
  weight: '1.5px',
  corner: 'rounded',
  sizeScale: 'md',
  library: 'lucide-compatible',
  notes: '',
};

export const DEFAULT_INTERACTION_SPEC = {
  focusRing: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40',
  hoverLift: false,
  pressFeedback: 'active:scale-[0.98]',
  durationMs: 150,
  easing: 'ease-out',
  toggleAndChip: '',
  inputFocus: 'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black/25',
  linkUnderline: 'hover:underline',
  notes: '',
};

function durationClass(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return 'duration-150';
  if (ms <= 75) return 'duration-75';
  if (ms <= 100) return 'duration-100';
  if (ms <= 200) return 'duration-200';
  if (ms <= 300) return 'duration-300';
  return 'duration-500';
}

function easingClass(easing) {
  if (typeof easing !== 'string') return 'ease-out';
  const e = easing.trim().split(/\s+/)[0];
  const map = {
    linear: 'ease-linear',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
  };
  return map[e] || 'ease-out';
}

/**
 * @param {object|null|undefined} interactionSpec
 * @param {boolean} interactive
 */
export function buildBtnInteractiveClass(interactionSpec, interactive) {
  if (!interactive) return '';
  const ix = interactionSpec && typeof interactionSpec === 'object' ? interactionSpec : {};
  const focus =
    typeof ix.focusRing === 'string' && ix.focusRing.trim()
      ? ix.focusRing.trim()
      : DEFAULT_INTERACTION_SPEC.focusRing;
  const press =
    typeof ix.pressFeedback === 'string' && ix.pressFeedback.trim()
      ? ix.pressFeedback.trim()
      : DEFAULT_INTERACTION_SPEC.pressFeedback;
  let hover = 'hover:brightness-95';
  if (ix.hoverLift === true || ix.hoverLift === 'true') hover = 'hover:-translate-y-0.5 hover:shadow-md';
  else if (typeof ix.hoverLift === 'string' && ix.hoverLift.trim()) hover = ix.hoverLift.trim();
  const dur = durationClass(ix.durationMs);
  const ease = easingClass(ix.easing);
  return `cursor-pointer transition-[transform,box-shadow,background-color,filter,translate] ${dur} ${ease} ${hover} ${press} ${focus}`;
}

export function buildInputFocusClass(interactionSpec) {
  const ix = interactionSpec && typeof interactionSpec === 'object' ? interactionSpec : {};
  if (typeof ix.inputFocus === 'string' && ix.inputFocus.trim()) return ix.inputFocus.trim();
  return DEFAULT_INTERACTION_SPEC.inputFocus;
}

export function buildLinkClass(interactionSpec) {
  const ix = interactionSpec && typeof interactionSpec === 'object' ? interactionSpec : {};
  if (typeof ix.linkUnderline === 'string' && ix.linkUnderline.trim()) return ix.linkUnderline.trim();
  return DEFAULT_INTERACTION_SPEC.linkUnderline;
}

export function iconStrokeFromIconography(iconography) {
  const ig = iconography && typeof iconography === 'object' ? iconography : {};
  const w = ig.weight;
  if (w === '2px') return 2;
  if (w === '1px') return 1;
  return 1.5;
}

export function iconPxFromScale(iconography) {
  const ig = iconography && typeof iconography === 'object' ? iconography : {};
  if (ig.sizeScale === 'sm') return 16;
  if (ig.sizeScale === 'lg') return 28;
  return 20;
}

/**
 * CSS variables for motion handoff (optional).
 * @param {object|null|undefined} interactionSpec
 */
export function interactionSpecToCssVariables(interactionSpec) {
  const ix = interactionSpec && typeof interactionSpec === 'object' ? interactionSpec : {};
  const out = {};
  if (typeof ix.durationMs === 'number' && ix.durationMs > 0 && ix.durationMs < 10000) {
    out['--genom-transition-duration'] = `${ix.durationMs}ms`;
  }
  const e = typeof ix.easing === 'string' ? ix.easing.trim().split(/\s+/)[0] : '';
  if (/^(linear|ease|ease-in|ease-out|ease-in-out)$/.test(e)) {
    out['--genom-transition-easing'] = e;
  }
  return out;
}

function sanitizeTwSnippet(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>"']/g, '').trim();
}

/**
 * Copy-paste oriented summary of utilities the kit tends to use.
 * @param {object|null} analysis
 * @param {object} geom resolved uiGeometry
 */
export function buildTailwindKitSnippet(analysis, geom) {
  const ix = { ...DEFAULT_INTERACTION_SPEC, ...(analysis?.interactionSpec && typeof analysis.interactionSpec === 'object' ? analysis.interactionSpec : {}) };
  const lines = [
    '/* GENOM kit — merge with your Tailwind build */',
    `/* geometry: ${geom.label} */`,
    `/* radii: card ${geom.radiusCard}, button ${geom.radiusButton}, small ${geom.radiusSmall} */`,
    `/* border: ${geom.borderWidth} */`,
    '',
    '/* interactionSpec → suggested utilities */',
    sanitizeTwSnippet(ix.focusRing),
    sanitizeTwSnippet(ix.pressFeedback),
    sanitizeTwSnippet(ix.inputFocus),
    sanitizeTwSnippet(ix.linkUnderline),
    typeof ix.hoverLift === 'string' ? sanitizeTwSnippet(ix.hoverLift) : ix.hoverLift ? 'hover:-translate-y-0.5 hover:shadow-md' : 'hover:brightness-95',
    `/* duration ~${ix.durationMs}ms, easing: ${ix.easing} */`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function mergeIconography(analysis) {
  return { ...DEFAULT_ICONOGRAPHY, ...(analysis?.iconography && typeof analysis.iconography === 'object' ? analysis.iconography : {}) };
}

export function mergeInteractionSpec(analysis) {
  return { ...DEFAULT_INTERACTION_SPEC, ...(analysis?.interactionSpec && typeof analysis.interactionSpec === 'object' ? analysis.interactionSpec : {}) };
}
