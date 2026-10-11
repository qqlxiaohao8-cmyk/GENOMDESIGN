/**
 * 100 张正式色卡：主题色必须对上标签，风格只改气质，名字跟着颜色走。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/officialSeaPalettes.js');

function tooSimilar(hexA, hexB) {
  const setA = new Set(hexA);
  const shared = hexB.filter((h) => setA.has(h)).length;
  if (shared >= 2) return true;
  if ([...hexA].sort().join() === [...hexB].sort().join()) return true;
  return false;
}

async function main() {
  const guidesUrl = pathToFileURL(path.join(ROOT, 'src/lib/themeColorGuides.js')).href;
  const vocabUrl = pathToFileURL(path.join(ROOT, 'src/lib/seaTagVocabulary.js')).href;
  const { buildThemedPalette, themeFitsColors, titleFromPaletteVibe } = await import(guidesUrl);
  const { SEA_STYLE_TAGS, SEA_THEME_TAGS } = await import(vocabUrl);

  const accepted = [];
  const usedTitles = new Set();

  for (let i = 0; i < 100; i += 1) {
    const style = SEA_STYLE_TAGS[i % SEA_STYLE_TAGS.length];
    const theme = SEA_THEME_TAGS[i % SEA_THEME_TAGS.length];
    const variant = Math.floor(i / SEA_THEME_TAGS.length);
    let chosen = null;

    for (let attempt = 0; attempt < 40 && !chosen; attempt += 1) {
      const hexes = buildThemedPalette({
        theme,
        style,
        variant: variant + attempt,
        seed: i * 31 + attempt * 97,
        hueShift: ((attempt * 11) % 17) - 8,
        count: 5,
      }).map((h) => String(h).toUpperCase());
      if (hexes.length < 5) continue;
      if (new Set(hexes).size < 4) continue;
      if (!themeFitsColors(theme, hexes)) continue;
      if (accepted.some((row) => tooSimilar(row.hexes, hexes))) continue;
      chosen = hexes;
    }

    if (!chosen) {
      throw new Error(`无法为 ${style}/${theme} 做出对得上标签的色卡`);
    }

    let title = titleFromPaletteVibe(chosen, { theme, exclude: [...usedTitles] });
    let n = 2;
    while (usedTitles.has(title) && n < 20) {
      title = titleFromPaletteVibe(chosen, {
        theme,
        exclude: [...usedTitles, title],
      });
      n += 1;
    }
    if (usedTitles.has(title)) title = `${title}${n}`;
    usedTitles.add(title);

    accepted.push({ title, hexes: chosen, tags: [style, theme] });
  }

  const body = accepted.map((row) => (
    `  { title: '${row.title}', hexes: [${row.hexes.map((h) => `'${h}'`).join(', ')}], tags: [${row.tags.map((t) => `'${t}'`).join(', ')}] },`
  )).join('\n');

  fs.writeFileSync(OUT, `/**
 * 色海正式色卡 100 张。主题色对标签，名字对色卡。
 */
export const OFFICIAL_SEA_PALETTES = [
${body}
];
`);
  console.log(`wrote ${accepted.length} palettes → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
