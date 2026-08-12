/**
 * Matrix palette engine — 10 aesthetic themes × 8 color harmonies.
 * Used by 生色 / 空生色 via randomPaletteHarmonyWithMeta.
 */
import { getPoeticColorName } from './poeticColorNaming';

/** @typedef {{ name: string, sMin: number, sMax: number, lMin: number, lMax: number, hBias: null | 'sunset' | 'ocean' }} ThemeProfile */
/** @typedef {{ name: string, id: string }} HarmonyModel */

/** 10 种美学主题配置 */
export const THEME_PROFILES = [
  { name: '侘寂和风 (Wabi-Sabi)', sMin: 15, sMax: 38, lMin: 35, lMax: 72, hBias: null },
  { name: '莫兰迪 (Morandi Muted)', sMin: 20, sMax: 45, lMin: 50, lMax: 82, hBias: null },
  { name: '复古波普 (Retro Vintage)', sMin: 55, sMax: 85, lMin: 40, lMax: 65, hBias: null },
  { name: '鲜彩高光 (Vibrant Pop)', sMin: 70, sMax: 100, lMin: 50, lMax: 75, hBias: null },
  { name: '北欧极简 (Nordic Minimal)', sMin: 10, sMax: 30, lMin: 60, lMax: 90, hBias: null },
  { name: '日落晚霞 (Warm Sunset)', sMin: 50, sMax: 90, lMin: 45, lMax: 75, hBias: 'sunset' },
  { name: '海洋沉思 (Misty Ocean)', sMin: 30, sMax: 70, lMin: 30, lMax: 70, hBias: 'ocean' },
  { name: '莫奈花园 (Impressionist)', sMin: 40, sMax: 75, lMin: 55, lMax: 85, hBias: null },
  { name: '暗夜月影 (Deep Dark)', sMin: 25, sMax: 60, lMin: 12, lMax: 38, hBias: null },
  { name: '赛博霓虹 (Cyber Neon)', sMin: 80, sMax: 100, lMin: 45, lMax: 70, hBias: null },
];

/** 8 种色彩调和模型 */
export const HARMONY_MODELS = [
  { id: 'analogous', name: '类似色调和 (Analogous)' },
  { id: 'complementary', name: '互补撞色 (Complementary)' },
  { id: 'splitComplementary', name: '分裂补色 (Split-Comp)' },
  { id: 'triadic', name: '三原色和弦 (Triadic)' },
  { id: 'tetradic', name: '双重撞色 (Tetradic)' },
  { id: 'monochromatic', name: '单色渐变 (Monochromatic)' },
  { id: 'accentNeutral', name: '主色+中性色 (Accent & Neutral)' },
  { id: 'warmCool', name: '冷暖交融 (Warm-Cool Split)' },
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

/** 辅助区间随机数工具 */
export function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function hexToHsl(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return [0, 0, 50];
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: break;
    }
  }
  return [Math.round(h * 360), Math.round(sat * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  const hh = wrapHue(h);
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + hh / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function pickTheme(forcedName) {
  if (forcedName) {
    const found = THEME_PROFILES.find((t) => t.name === forcedName || t.name.includes(forcedName));
    if (found) return found;
  }
  return THEME_PROFILES[Math.floor(Math.random() * THEME_PROFILES.length)];
}

function pickHarmony(forcedIdOrName) {
  if (forcedIdOrName) {
    const found = HARMONY_MODELS.find(
      (h) => h.id === forcedIdOrName || h.name === forcedIdOrName || h.name.includes(String(forcedIdOrName)),
    );
    if (found) return found;
  }
  return HARMONY_MODELS[Math.floor(Math.random() * HARMONY_MODELS.length)];
}

function sampleBaseHue(theme) {
  if (theme.hBias === 'sunset') {
    return Math.random() > 0.5
      ? Math.floor(Math.random() * 50) + 330
      : Math.floor(Math.random() * 45);
  }
  if (theme.hBias === 'ocean') {
    return Math.floor(Math.random() * 70) + 160;
  }
  return Math.floor(Math.random() * 360);
}

function baseHueFromLocked(lockedColors) {
  if (!lockedColors?.length) return null;
  for (const entry of lockedColors) {
    const hex = entry?.hex ?? entry;
    if (!hex) continue;
    const [h, s] = hexToHsl(hex);
    if (s > 8) return h;
  }
  const first = lockedColors[0]?.hex ?? lockedColors[0];
  if (first) return hexToHsl(first)[0];
  return null;
}

/** Build exactly `n` hex colors for a theme + harmony + base hue. */
function buildHarmonyColors(n, theme, harmonyId, baseH) {
  const count = clamp(Math.round(n), 2, 10);

  switch (harmonyId) {
    case 'analogous': {
      const spread = Math.floor(Math.random() * 20) + 12;
      const mid = (count - 1) / 2;
      return Array.from({ length: count }, (_, i) => {
        const h = baseH + (i - mid) * spread;
        const s = randRange(theme.sMin, theme.sMax);
        const l = randRange(theme.lMin, theme.lMax);
        return hslToHex(h, s, l);
      });
    }
    case 'complementary': {
      const compH = baseH + 180;
      const pool = [
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), Math.max(15, theme.lMin - 10)),
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(baseH, Math.max(10, theme.sMin - 15), Math.min(90, theme.lMax + 10)),
        hslToHex(compH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(compH, randRange(theme.sMin, theme.sMax), Math.min(92, theme.lMax + 15)),
      ];
      while (pool.length < count) {
        const useComp = pool.length % 2 === 1;
        const h = useComp ? compH : baseH;
        pool.push(hslToHex(h, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)));
      }
      return pool.slice(0, count);
    }
    case 'splitComplementary': {
      const h2 = baseH + 150;
      const h3 = baseH + 210;
      const pool = [
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), Math.min(90, theme.lMax + 12)),
        hslToHex(h2, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h3, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h3, Math.max(10, theme.sMin - 10), Math.max(15, theme.lMin - 15)),
      ];
      const hubs = [baseH, h2, h3];
      while (pool.length < count) {
        const h = hubs[pool.length % hubs.length];
        pool.push(hslToHex(h, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)));
      }
      return pool.slice(0, count);
    }
    case 'triadic': {
      const h2 = baseH + 120;
      const h3 = baseH + 240;
      const pool = [
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), Math.max(20, theme.lMin - 15)),
        hslToHex(h2, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h3, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h3, randRange(theme.sMin, theme.sMax), Math.min(90, theme.lMax + 15)),
      ];
      const hubs = [baseH, h2, h3];
      while (pool.length < count) {
        const h = hubs[pool.length % hubs.length];
        pool.push(hslToHex(h, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)));
      }
      return pool.slice(0, count);
    }
    case 'tetradic': {
      const h2 = baseH + 60;
      const h3 = baseH + 180;
      const h4 = baseH + 240;
      const pool = [
        hslToHex(baseH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h2, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h3, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(h4, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(baseH, Math.max(10, theme.sMin - 20), Math.min(95, theme.lMax + 15)),
      ];
      const hubs = [baseH, h2, h3, h4];
      while (pool.length < count) {
        const h = hubs[pool.length % hubs.length];
        pool.push(hslToHex(h, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)));
      }
      return pool.slice(0, count);
    }
    case 'monochromatic': {
      const sat = randRange(theme.sMin, theme.sMax);
      const step = count > 1 ? (theme.lMax - theme.lMin) / (count - 1) : 0;
      return Array.from({ length: count }, (_, i) => {
        const l = theme.lMin + i * step;
        return hslToHex(baseH, sat, l);
      });
    }
    case 'accentNeutral': {
      const satAccent = Math.min(100, theme.sMax + 20);
      const pool = [
        hslToHex(baseH, satAccent, randRange(45, 65)),
        hslToHex(baseH, 12, 92),
        hslToHex(baseH, 15, 80),
        hslToHex(baseH, 20, 45),
        hslToHex(baseH, 25, 20),
      ];
      while (pool.length < count) {
        pool.push(hslToHex(baseH, randRange(10, 28), randRange(18, 90)));
      }
      return pool.slice(0, count);
    }
    case 'warmCool':
    default: {
      const warmH = Math.floor(Math.random() * 60);
      const coolH = Math.floor(Math.random() * 80) + 170;
      const pool = [
        hslToHex(warmH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(warmH, randRange(theme.sMin, theme.sMax), Math.min(90, theme.lMax + 15)),
        hslToHex((warmH + 30) % 360, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(coolH, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)),
        hslToHex(coolH, randRange(theme.sMin, theme.sMax), Math.max(15, theme.lMin - 15)),
      ];
      while (pool.length < count) {
        const h = pool.length % 2 === 0 ? warmH : coolH;
        pool.push(hslToHex(h, randRange(theme.sMin, theme.sMax), randRange(theme.lMin, theme.lMax)));
      }
      return pool.slice(0, count);
    }
  }
}

/**
 * Core matrix generator.
 * @param {{
 *   count?: number,
 *   themeName?: string | null,
 *   harmonyId?: string | null,
 *   lockedColors?: Array<{hex:string}|string> | null,
 * }} [options]
 * @returns {{ colors: Array<{hex:string,label:string}>, meta: object }}
 */
export function generateMatrixPalette(options = {}) {
  const count = options.count != null
    ? clamp(Math.round(options.count), 2, 10)
    : 5;

  const theme = pickTheme(options.themeName || options.styleId || null);
  const harmony = pickHarmony(options.harmonyId || null);

  let baseH = sampleBaseHue(theme);
  const lockedHue = baseHueFromLocked(options.lockedColors);
  if (lockedHue != null) baseH = lockedHue;

  const hexes = buildHarmonyColors(count, theme, harmony.id, baseH);
  const colors = hexes.map((hex) => ({
    hex,
    label: getPoeticColorName(hex),
  }));

  const meta = {
    styleId: theme.name,
    styleLabel: theme.name,
    theme: theme.name,
    category: 'matrix',
    mood: [theme.name, harmony.name],
    harmonyId: harmony.id,
    harmonyMode: harmony.id,
    harmonyName: harmony.name,
    saturationMode: theme.sMax >= 70 ? 'vibrant' : theme.sMax <= 38 ? 'muted' : 'balanced',
    brightnessMode: theme.lMax <= 40 ? 'lowKey' : theme.lMin >= 55 ? 'highKey' : 'balanced',
    primaryHue: Math.round(baseH),
    count,
    beautyScore: 78,
    beautyGrade: 'good',
    dominantColor: hexes[0],
    accentColor: hexes[hexes.length - 1],
    surprise: false,
    engine: 'matrix',
  };

  return { colors, meta };
}
