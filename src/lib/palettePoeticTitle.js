import { normalizeHex } from './randomInspiration';

/** 与单色名无关联的整体色盘题名（由五色指纹稳定映射，偏画意、可商用调性）。 */
const PALETTE_TITLES = [
  '松风入墨',
  '春溪叠影',
  '暮山晴雪',
  '烟波微茫',
  '雨洗秋堂',
  '月浸重帘',
  '云扉半掩',
  '竹露清响',
  '荷风送香',
  '梧叶舞风',
  '霜林如醉',
  '雪意未深',
  '晴窗分茶',
  '小院深深',
  '远山自横',
  '水阁听涛',
  '半溪明月',
  '一川芳草',
  '幽兰在谷',
  '孤鸿没云',
  '疏影横斜',
  '暗香浮动',
  '清角吹寒',
  '琼岛春阴',
  '星河欲曙',
  '沧海遗珠',
  '白露为霜',
  '南风知我',
  '北窗高卧',
  '东篱把酒',
  '西洲曲里',
  '长亭晚照',
  '短梦依然',
  '浮生半日',
  '万象静观',
  '五色成章',
  '墨戏淋漓',
  '丹青不渝',
  '素笺留韵',
  '锦时微醺',
  '光风霁月',
  '花阴移午',
  '石瘦苔青',
  '波平如镜',
  '岚气满山',
  '钟鸣古寺',
  '渔火零星',
  '雁字横秋',
  '燕泥芹香',
  '蝶梦栩栩',
];

function fingerprintHexList(hexes) {
  const sorted = [...hexes]
    .map((h) => normalizeHex(h))
    .filter((h) => /^#[0-9A-F]{6}$/.test(h))
    .sort();
  let hash = 5381;
  for (const h of sorted) {
    for (let i = 0; i < h.length; i++) {
      hash = (hash * 33) ^ h.charCodeAt(i);
    }
  }
  return hash >>> 0;
}

/**
 * 稳定题名（同色卡 hex 组合始终相同）
 * @param {string[]} hexes
 * @returns {string}
 */
export function palettePoeticTitleFromHexes(hexes) {
  if (!Array.isArray(hexes) || !hexes.length) return '五色成章';
  const idx = fingerprintHexList(hexes) % PALETTE_TITLES.length;
  return PALETTE_TITLES[idx];
}

/**
 * 随机题名，可排除当前/最近名称以便多次「生成」得到不同结果
 * @param {string[]} hexes
 * @param {string[]} [excludeTitles]
 * @returns {string}
 */
export function randomPalettePoeticTitleFromHexes(hexes, excludeTitles = []) {
  const exclude = new Set(
    (Array.isArray(excludeTitles) ? excludeTitles : [])
      .map((s) => String(s).trim())
      .filter(Boolean),
  );
  let pool = PALETTE_TITLES.filter((t) => !exclude.has(t));
  if (pool.length === 0) pool = [...PALETTE_TITLES];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
