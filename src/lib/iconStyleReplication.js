/**
 * Normalize model iconography.style (+ aliases) to a preset for StylizedLucideIcon.
 */
const ALIASES = {
  outline: 'outline',
  line: 'outline',
  linear: 'outline',
  stroke: 'outline',
  filled: 'filled',
  fill: 'filled',
  solid: 'filled',
  bold: 'bold',
  heavy: 'bold',
  strong: 'bold',
  bulk: 'bulk',
  chunky: 'bulk',
  thick: 'bulk',
  duotone: 'duotone',
  'two-tone': 'duotone',
  twotone: 'duotone',
  two_tone: 'duotone',
  '2-tone': 'duotone',
  broken: 'broken',
  dashed: 'broken',
  fragmented: 'broken',
  '3d': '3d',
  dimensional: '3d',
  isometric: '3d',
  depth: '3d',
  skeuomorphism: 'skeuomorphism',
  skeuomorphic: 'skeuomorphism',
  realistic: 'skeuomorphism',
  neumorphism: 'skeuomorphism',
  clay: 'clay',
  soft: 'clay',
  'soft-3d': 'clay',
  illustrated: 'illustrated',
  illustration: 'illustrated',
  sketch: 'illustrated',
  handdrawn: 'illustrated',
  'hand-drawn': 'illustrated',
  glassy: 'glassy',
  glass: 'glassy',
  frosted: 'glassy',
};

const CANONICAL = [
  'outline',
  'filled',
  'bold',
  'bulk',
  'duotone',
  'broken',
  '3d',
  'skeuomorphism',
  'clay',
  'illustrated',
  'glassy',
];

export const ICON_STYLE_DISPLAY = {
  outline: 'Outline',
  filled: 'Filled',
  bold: 'Bold',
  bulk: 'Bulk',
  duotone: 'Two-tone',
  broken: 'Broken',
  '3d': '3D',
  skeuomorphism: 'Skeuomorphism',
  clay: 'Clay',
  illustrated: 'Illustrated',
  glassy: 'Glassy',
};

/**
 * @param {string|undefined|null} raw
 * @returns {string}
 */
export function normalizeIconographyStyle(raw) {
  const s = String(raw || 'outline')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const slug = s.replace(/ /g, '-');
  const underscored = s.replace(/ /g, '_');
  if (ALIASES[s]) return ALIASES[s];
  if (ALIASES[slug]) return ALIASES[slug];
  if (ALIASES[underscored]) return ALIASES[underscored];
  if (CANONICAL.includes(s)) return s;
  return 'outline';
}
