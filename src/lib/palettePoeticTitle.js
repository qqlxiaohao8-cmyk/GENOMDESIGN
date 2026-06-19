import { normalizeHex } from './randomInspiration';
import { generatePaletteTags } from './paletteTags';

/** 色卡公开名称长度（预览页输入与生成） */
export const PALETTE_TITLE_MAX_LEN = 10;
export const PALETTE_TITLE_MIN_LEN = 1;

const FOOD_TITLES = [
  '生椰拿铁', '薄巧圈', '草莓奶昔', '焦糖布丁', '抹茶麻薯', '甜甜圈', '蓝莓酸奶',
  '红丝绒', '牛油果', '海盐芝士', '柠檬气泡', '黑糖珍珠', '荔枝冰茶', '西瓜冰棒',
  '热巧克力', '芒果糯米', '葡萄果冻', '蜂蜜松饼', '橙香玛德', '香草冰淇淋',
  '生酪拿铁', '燕麦奶咖', '抹茶千层', '芋泥波波', '杨枝甘露',
];

const NATURE_TITLES = [
  '丰收', '麦田风', '雨后森林', '晨雾湖泊', '晚霞', '深海潜游', '珊瑚礁', '北极光',
  '雪原', '沙漠旅人', '竹林', '枫叶谷', '火山', '湖畔清晨', '银杏大道', '极夜',
  '峡谷', '云层', '向日葵田', '春芽', '苔原', '山岚', '稻香', '荷风',
];

const URBAN_TITLES = [
  '地铁早高峰', '咖啡馆', '书店午后', '霓虹街区', '共享办公', '夜班便利店',
  '城市雨夜', '地铁终点', '黑胶唱片', '复古影院', '摄影暗房', '现代公寓',
  '机场候机', '共享单车', '唱片店', '程序员夜', '城市天际', '电竞房',
  '设计工作室', '午夜出租',
];

const EMOTION_TITLES = [
  '初恋', '失眠', '治愈', '想念', '快乐周末', '孤独星球', '热恋', '告别',
  '勇气', '放空', '浪漫主义', '成长', '自由', '平静', '期待', '遗憾',
  '温柔', '热血', '梦想', '安眠',
];

const SCENT_TITLES = [
  '降真香', '沉香', '檀香', '柏子香', '龙涎香', '安息香', '乳香', '桂子', '腊梅', '茉莉',
  '栀子', '柑橘', '松烟', '药香', '旧书气',
];

/** 标签 → 候选题名池（生活化、贴近主题） */
const TAG_POOLS = {
  咖啡: ['生椰拿铁', '焦糖布丁', '黑糖珍珠', '海盐芝士', '热巧克力', '生酪拿铁', '燕麦奶咖', '咖啡馆'],
  糖果: ['草莓奶昔', '甜甜圈', '蓝莓酸奶', '葡萄果冻', '蜂蜜松饼', '香草冰淇淋', '芋泥波波'],
  热带水果: ['芒果糯米', '杨枝甘露', '西瓜冰棒', '荔枝冰茶', '柠檬气泡', '橙香玛德'],
  自然: NATURE_TITLES,
  植物: ['春芽', '雨后森林', '竹林', '向日葵田', '湖畔清晨', '银杏大道', '荷风', '稻香'],
  森林: ['雨后森林', '竹林', '湖畔清晨', '苔原', '山岚'],
  海洋: ['深海潜游', '珊瑚礁', '城市雨夜', '晨雾湖泊', '孤独星球'],
  雾感: ['晨雾湖泊', '云层', '山岚', '城市雨夜', '放空'],
  岩石: ['峡谷', '火山', '沙漠旅人', '极夜'],
  情绪: EMOTION_TITLES,
  艺术: ['黑胶唱片', '复古影院', '摄影暗房', '唱片店', '浪漫主义', '霓虹街区', '梦想'],
  设计: URBAN_TITLES,
  文化: SCENT_TITLES,
  素材: ['设计工作室', '现代公寓', '共享办公', '黑胶唱片'],
  星空: ['北极光', '极夜', '孤独星球', '城市天际', '星河'],
  暖色: ['晚霞', '丰收', '热巧克力', '热恋', '快乐周末', '橙香玛德', '热血', '温柔'],
  冷色: ['晨雾湖泊', '深海潜游', '城市雨夜', '失眠', '平静', '雪原', '北极光'],
  浅色: ['香草冰淇淋', '海盐芝士', '云层', '放空', '温柔', '治愈', '春芽'],
  深色: ['热巧克力', '摄影暗房', '火山', '午夜出租', '程序员夜', '安眠', '失眠'],
  高饱和: ['霓虹街区', '热恋', '北极光', '电竞房', '热血', '期待', '葡萄果冻'],
  低饱和: ['晨雾湖泊', '想念', '遗憾', '降真香', '旧书气', '苔原', '云层'],
  极简灰: ['现代公寓', '共享办公', '云层', '雪原', '设计工作室', '放空'],
  红色系: ['红丝绒', '西瓜冰棒', '热恋', '热血', '枫叶谷', '火山'],
  橙色系: ['橙香玛德', '晚霞', '丰收', '向日葵田', '期待', '勇气'],
  黄色系: ['柠檬气泡', '银杏大道', '快乐周末', '麦田风', '午夜出租'],
  绿色系: ['抹茶麻薯', '雨后森林', '竹林', '治愈', '成长', '春芽', '荷风'],
  青色系: ['晨雾湖泊', '深海潜游', '自由', '平静'],
  蓝色系: ['蓝莓酸奶', '城市雨夜', '孤独星球', '失眠', '平静'],
  紫色系: ['葡萄果冻', '霓虹街区', '梦想', '电竞房', '浪漫主义'],
  粉色系: ['草莓奶昔', '初恋', '温柔', '告别', '荔枝冰茶'],
  褐色系: ['焦糖布丁', '黑糖珍珠', '峡谷', '降真香', '旧书气', '咖啡馆'],
  灰色系: ['云层', '现代公寓', '共享办公', '遗憾'],
  黑色: ['摄影暗房', '午夜出租', '程序员夜', '安眠'],
  白色: ['雪原', '香草冰淇淋', '海盐芝士', '放空'],
};

const MOOD_FALLBACK = {
  warm: ['生椰拿铁', '晚霞', '丰收', '热恋', '焦糖布丁', '麦田风', '温柔', '橙香玛德'],
  cool: ['晨雾湖泊', '深海潜游', '城市雨夜', '降真香', '竹林', '平静', '失眠', '自由'],
  muted: ['想念', '云层', '降真香', '旧书气', '遗憾', '苔原', '书店午后', '治愈'],
  vivid: ['霓虹街区', '北极光', '热恋', '电竞房', '葡萄果冻', '期待', '热血', '梦想'],
  neutral: [...new Set([...FOOD_TITLES, ...NATURE_TITLES, ...EMOTION_TITLES, ...SCENT_TITLES])],
};

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

function moodKeyFromTags(tags = []) {
  if (tags.includes('暖色')) return 'warm';
  if (tags.includes('冷色')) return 'cool';
  if (tags.includes('高饱和')) return 'vivid';
  if (tags.includes('低饱和') || tags.includes('极简灰')) return 'muted';
  return 'neutral';
}

function buildCandidatePool(hexes, paletteMeta = {}, tags = []) {
  const safeMeta = paletteMeta && typeof paletteMeta === 'object' ? paletteMeta : {};
  const moodTags = tags.length ? tags : generatePaletteTags(hexes, safeMeta);
  const seen = new Set();
  const out = [];

  const add = (title) => {
    const t = String(title || '').trim();
    if (!t || t.length > PALETTE_TITLE_MAX_LEN || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const tag of moodTags) {
    const pool = TAG_POOLS[tag];
    if (pool) pool.forEach(add);
  }

  if (paletteMeta?.category) {
    const cat = { nature: '自然', art: '艺术', emotion: '情绪', culture: '文化', material: '素材', design: '设计' }[paletteMeta.category];
    if (cat && TAG_POOLS[cat]) TAG_POOLS[cat].forEach(add);
  }

  const styleLabel = String(paletteMeta?.styleLabel || '').trim();
  if (styleLabel.length >= 2 && styleLabel.length <= PALETTE_TITLE_MAX_LEN) add(styleLabel);

  const moodPool = MOOD_FALLBACK[moodKeyFromTags(moodTags)] || MOOD_FALLBACK.neutral;
  moodPool.forEach(add);

  if (!out.length) MOOD_FALLBACK.neutral.forEach(add);
  return out;
}

function pickFromPool(pool, hexes, excludeTitles = []) {
  const exclude = new Set(
    (Array.isArray(excludeTitles) ? excludeTitles : [])
      .map((s) => String(s).trim())
      .filter(Boolean),
  );
  const filtered = pool.filter((t) => !exclude.has(t));
  const usePool = filtered.length ? filtered : [...pool];
  if (!usePool.length) return '未命名';
  const idx = fingerprintHexList(hexes) % usePool.length;
  return usePool[idx];
}

/**
 * 稳定题名（同色卡 hex 组合始终相同）
 */
export function palettePoeticTitleFromHexes(hexes) {
  return paletteTitleFromHexesAndMeta(hexes, {}, []);
}

/**
 * 基于 hex + 标签/元数据的稳定题名
 */
export function paletteTitleFromHexesAndMeta(hexes, paletteMeta = {}, tags = [], excludeTitles = []) {
  if (!Array.isArray(hexes) || !hexes.length) return '春芽';
  const pool = buildCandidatePool(hexes, paletteMeta, tags);
  return pickFromPool(pool, hexes, excludeTitles);
}

/**
 * 随机题名，可排除已有名称以便多次「生成」
 */
export function randomPalettePoeticTitleFromHexes(hexes, excludeTitles = [], paletteMeta = {}, tags = []) {
  const pool = buildCandidatePool(hexes, paletteMeta, tags);
  const exclude = new Set(
    (Array.isArray(excludeTitles) ? excludeTitles : [])
      .map((s) => String(s).trim())
      .filter(Boolean),
  );
  let candidates = pool.filter((t) => !exclude.has(t));
  if (!candidates.length) candidates = pool.length ? [...pool] : MOOD_FALLBACK.neutral;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

export function clampPaletteTitle(s) {
  return String(s || '').trim().slice(0, PALETTE_TITLE_MAX_LEN);
}

export function isValidPaletteTitle(s) {
  const t = String(s || '').trim();
  return t.length >= PALETTE_TITLE_MIN_LEN && t.length <= PALETTE_TITLE_MAX_LEN;
}
