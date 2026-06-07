#!/usr/bin/env node
/**
 * 88 张命题色卡 v3 — 用户指定配色
 * Usage:
 *   node scripts/generate-v3-seed.mjs                 # 仅生成 SQL + PNG
 *   node scripts/generate-v3-seed.mjs --import-remote # 写入生产 D1 + R2
 *   node scripts/generate-v3-seed.mjs --import-local  # 写入本地 D1
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { encodeStripePng } from './lib/stripe-png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const OUT_DIR   = path.join(ROOT, 'data', 'seed-palettes', 'v3-88');
const SQL_FILE  = path.join(OUT_DIR, 'import.sql');
const MANIFEST  = path.join(OUT_DIR, 'manifest.json');

const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET    = 'sekong-style-images';

const PALETTES = [
  // 🍹 美食饮品 (1–16) — 未列出的 7 张保留原配色
  { no: 1, title: '浮云椰雪', hexes: ['#F9F6F0', '#C9DFE8', '#6B4F3A', '#D4A373', '#6B8E4E'], themes: ['美食', '咖啡', '浅色'] },
  { no: 2, title: '杨枝弄月', hexes: ['#FFB347', '#FF6B6B', '#FFF5E1', '#FFD700', '#4CAF50'], themes: ['热带水果', '美食', '高饱和'] },
  { no: 3, title: '满杯金露', hexes: ['#FFA500', '#8B4513', '#FFD700', '#E0F7FA', '#00BFFF'], themes: ['美食', '橙色系', '对比'] },
  { no: 4, title: '斑斓生椰', hexes: ['#4C9A2A', '#FFFDD0', '#A8E4A0', '#5E3E1C', '#DAF7A6'], themes: ['美食', '绿色系', '清新'] },
  { no: 5, title: '暮雪椰青', hexes: ['#6A5ACD', '#F0F8FF', '#D4F1E4', '#3CB371', '#DAA520'], themes: ['美食', '紫色系', '冷色'] },
  { no: 6, title: '山茶花拿铁', hexes: ['#F8A7C7', '#6F4E37', '#FFF0F5', '#C2185B', '#556B2F'], themes: ['咖啡', '粉色系', '暖色'] },
  { no: 7, title: '碎银桂花酿', hexes: ['#FFD700', '#C0C0C0', '#FAF0D7', '#B8860B', '#DAA520'], themes: ['美食', '黄色系', '低饱和'] },
  { no: 8, title: '秋香燕麦拿铁', hexes: ['#E3CDA9', '#6B4226', '#C9CC3F', '#D2B48C', '#8B6B4A'], themes: ['咖啡', '褐色系', '暖色'] },
  { no: 9, title: '玫瑰海盐芝士', hexes: ['#FFB6C1', '#87CEEB', '#FFDEAD', '#FF69B4', '#F4A460'], themes: ['美食', '粉色系', '冷色'] },
  { no: 10, title: '柚见青提', hexes: ['#98FB98', '#FFD700', '#FFFACD', '#FF6347', '#ADFF2F'], themes: ['热带水果', '绿色系', '高饱和'] },
  { no: 11, title: '青梅煮茶', hexes: ['#6B8E23', '#8B4513', '#DEB887', '#556B2F', '#FFF8DC'], themes: ['美食', '绿色系', '自然'] },
  { no: 12, title: '冰酿荔枝', hexes: ['#D2695E', '#FFF0F5', '#FFB6C1', '#C4E4EC', '#DDA0DD'], themes: ['热带水果', '粉色系', '冷色'] },
  { no: 13, title: '琥珀核桃酪', hexes: ['#FFBF00', '#8B5A2B', '#F5E6CA', '#CD7F32', '#5C3317'], themes: ['美食', '褐色系', '暖色'] },
  { no: 14, title: '竹蔗茅根爽', hexes: ['#6B8E23', '#F5DEB3', '#C4DFB6', '#E0F5EB', '#D9E68E'], themes: ['美食', '绿色系', '浅色'] },
  { no: 15, title: '一抹焙茶', hexes: ['#8B7355', '#2E8B57', '#F5DEB3', '#D2B48C', '#FFFAF0'], themes: ['咖啡', '褐色系', '低饱和'] },
  { no: 16, title: '海盐焦糖云', hexes: ['#C67B4B', '#7EC8E3', '#FDFCFF', '#FFD700', '#FFFDD0'], themes: ['美食', '橙色系', '对比'] },

  // 🏞️ 自然风景 (17–33)
  { no: 17, title: '月牙泉边', hexes: ['#C2B280', '#20B2AA', '#FFD700', '#A0522D', '#191970'], themes: ['自然', '黄色系', '对比'] },
  { no: 18, title: '大漠孤烟直', hexes: ['#D2B48C', '#A9A9A9', '#FF4500', '#708090', '#87CEEB'], themes: ['自然', '岩石', '暖色'] },
  { no: 19, title: '苏堤春晓', hexes: ['#FFB7C5', '#98FB98', '#87CEEB', '#FFFAF0', '#FF69B4'], themes: ['自然', '植物', '高饱和'] },
  { no: 20, title: '曲院风荷', hexes: ['#FFA07A', '#2E8B57', '#F0FFF0', '#CD853F', '#E0FFFF'], themes: ['自然', '植物', '清新'] },
  { no: 21, title: '荷塘泛月', hexes: ['#B0C4DE', '#006400', '#F8C8DC', '#4682B4', '#F5F5DC'], themes: ['自然', '深色', '冷色'] },
  { no: 22, title: '藕花深处', hexes: ['#C71585', '#1A4D2E', '#4A7C82', '#FFE4E1', '#8B4513'], themes: ['自然', '粉色系', '深色'] },
  { no: 23, title: '烟雨西湖', hexes: ['#A9BCC6', '#4682B4', '#D8BFD8', '#B8860B', '#F5F5F5'], themes: ['自然', '雾感', '极简灰'] },
  { no: 24, title: '云栖竹径', hexes: ['#6B8E23', '#2F4F4F', '#A9A9A9', '#F0FFF0', '#FFDAB9'], themes: ['自然', '植物', '绿色系'] },
  { no: 25, title: '漓江渔唱', hexes: ['#20B2AA', '#2F4F4F', '#FF4500', '#8B4513', '#F0E68C'], themes: ['自然', '海洋', '对比'] },
  { no: 26, title: '稻城牛奶海', hexes: ['#E0FFFF', '#F0F8FF', '#4682B4', '#BDB76B', '#FFFAFA'], themes: ['自然', '青色系', '浅色'] },
  { no: 27, title: '暮光森林', hexes: ['#1A3A2A', '#B8860B', '#4A3060', '#3E2723', '#9ACD32'], themes: ['自然', '森林', '深色'] },
  { no: 28, title: '风之谷', hexes: ['#7CFC00', '#87CEEB', '#FFFAF0', '#FFD700', '#8B7355'], themes: ['自然', '绿色系', '高饱和'] },
  { no: 29, title: '落日橙海', hexes: ['#FF4500', '#FF8C00', '#FFD700', '#4B0082', '#CD853F'], themes: ['自然', '橙色系', '高饱和'] },
  { no: 30, title: '星野冰川', hexes: ['#B0E0E6', '#191970', '#F0FFFF', '#4682B4', '#00FA9A'], themes: ['自然', '蓝色系', '冷色'] },
  { no: 31, title: '断桥残雪', hexes: ['#F8F8FF', '#708090', '#4682B4', '#4A3B32', '#ADD8E6'], themes: ['自然', '极简灰', '冷色'] },
  { no: 32, title: '镜湖映月', hexes: ['#C0C0C0', '#FFFACD', '#191970', '#6A5ACD', '#F5F5DC'], themes: ['自然', '蓝色系', '深色'] },
  { no: 33, title: '鸣沙晴雪', hexes: ['#DAA520', '#FFFAFA', '#00BFFF', '#CD853F', '#FFDEAD'], themes: ['自然', '黄色系', '对比'] },

  // 🏺 传统文化 (34–51)
  { no: 34, title: '天青汝窑', hexes: ['#7AA1C7', '#D3D3D3', '#F5F5F0', '#A0522D', '#5F7D9C'], themes: ['文化', '青色系', '冷色'] },
  { no: 35, title: '冰裂纹', hexes: ['#E0F7FA', '#2F4F4F', '#B0E0E6', '#F5DEB3', '#FFFFFF'], themes: ['文化', '冷色', '浅色'] },
  { no: 36, title: '青花缠枝', hexes: ['#0A2472', '#FFFFFF', '#4169E1', '#708090', '#8B0000'], themes: ['文化', '蓝色系', '对比'] },
  { no: 37, title: '云锦天孙', hexes: ['#B8860B', '#B22222', '#191970', '#008080', '#DDA0DD'], themes: ['文化', '红色系', '高饱和'] },
  { no: 38, title: '剔红流霞', hexes: ['#B22222', '#FF4500', '#800000', '#FFD700', '#1C1C1C'], themes: ['文化', '红色系', '暖色'] },
  { no: 39, title: '点翠鎏金', hexes: ['#00468B', '#FFD700', '#008B8B', '#FFF8DC', '#FF1493'], themes: ['文化', '蓝色系', '对比'] },
  { no: 40, title: '缂丝如画', hexes: ['#E8D5B5', '#5F9EA0', '#C19DA5', '#3B5988', '#D3D3D3'], themes: ['文化', '低饱和', '暖色'] },
  { no: 41, title: '珐琅彩雀', hexes: ['#FF69B4', '#1E90FF', '#32CD32', '#FFD700', '#FFFAFA'], themes: ['文化', '高饱和', '对比'] },
  { no: 42, title: '活字印迹', hexes: ['#1C1C1C', '#FAEBD7', '#8B7355', '#696969', '#B22222'], themes: ['文化', '黑色', '极简灰'] },
  { no: 43, title: '漆盒藏香', hexes: ['#8B0000', '#1C1C1C', '#DAA520', '#5C4033', '#696969'], themes: ['文化', '褐色系', '深色'] },
  { no: 44, title: '油纸伞骨', hexes: ['#DAA520', '#9ACD32', '#8B4513', '#008080', '#FFB6C1'], themes: ['文化', '橙色系', '暖色'] },
  { no: 45, title: '徽墨松烟', hexes: ['#1C1C1C', '#4A4A4A', '#2F4F4F', '#FAEBD7', '#DAA520'], themes: ['文化', '黑色', '极简灰'] },
  { no: 46, title: '团扇扑萤', hexes: ['#FFF8DC', '#556B2F', '#ADFF2F', '#191970', '#FF69B4'], themes: ['文化', '绿色系', '对比'] },
  { no: 47, title: '汉瓦当', hexes: ['#808080', '#B22222', '#D2B48C', '#556B2F', '#4A3B32'], themes: ['文化', '褐色系', '低饱和'] },
  { no: 48, title: '敦煌藻井', hexes: ['#B22222', '#00468B', '#008080', '#DAA520', '#FFFAF0'], themes: ['文化', '红色系', '对比'] },
  { no: 49, title: '螺钿漆盒', hexes: ['#87CEEB', '#DDA0DD', '#1C1C1C', '#C0C0C0', '#FFF0F5'], themes: ['文化', '青色系', '对比'] },
  { no: 50, title: '篆香印灰', hexes: ['#D3D3D3', '#5C4033', '#B8860B', '#4A4A4A', '#8B0000'], themes: ['文化', '极简灰', '低饱和'] },
  { no: 51, title: '宋版书眉', hexes: ['#DEB887', '#1C1C1C', '#800000', '#2F4F4F', '#8B7355'], themes: ['文化', '褐色系', '暖色'] },

  // 🌾 节气时令 (52–68)
  { no: 52, title: '谷雨煎茶', hexes: ['#556B2F', '#8FBC8F', '#DAA520', '#FFF8DC', '#32CD32'], themes: ['自然', '绿色系', '暖色'] },
  { no: 53, title: '夏至蝉歌', hexes: ['#006400', '#8B7355', '#D2691E', '#1E90FF', '#FFD700'], themes: ['自然', '绿色系', '高饱和'] },
  { no: 54, title: '霜降柿红', hexes: ['#FF6347', '#FFFAF0', '#8B4513', '#708090', '#FF8C00'], themes: ['自然', '橙色系', '暖色'] },
  { no: 55, title: '冬至围炉', hexes: ['#B22222', '#2F4F4F', '#FF8C00', '#FFF8DC', '#1C1C1C'], themes: ['自然', '红色系', '深色'] },
  { no: 56, title: '惊蛰春醒', hexes: ['#9ACD32', '#FFB6C1', '#8B4513', '#87CEEB', '#FFD700'], themes: ['自然', '植物', '暖色'] },
  { no: 57, title: '白露横江', hexes: ['#F0FFF0', '#20B2AA', '#DEB887', '#B0C4DE', '#4682B4'], themes: ['自然', '冷色', '浅色'] },
  { no: 58, title: '秋分拜月', hexes: ['#E6E6FA', '#FFD700', '#191970', '#D3D3D3', '#CD853F'], themes: ['自然', '紫色系', '深色'] },
  { no: 59, title: '小满未满', hexes: ['#BDB76B', '#F0E68C', '#6B8E23', '#FFFAFA', '#8B7355'], themes: ['自然', '黄色系', '暖色'] },
  { no: 60, title: '芒种煮梅', hexes: ['#6B8E23', '#FFD700', '#B22222', '#8B4513', '#FFF8DC'], themes: ['自然', '红色系', '暖色'] },
  { no: 61, title: '大雪拥炉', hexes: ['#FFFAFA', '#FF4500', '#4A4A4A', '#2F4F4F', '#228B22'], themes: ['自然', '红色系', '对比'] },
  { no: 62, title: '清明雨上', hexes: ['#A9BCC6', '#9ACD32', '#FFB7C5', '#8B7355', '#1E90FF'], themes: ['自然', '绿色系', '低饱和'] },
  { no: 63, title: '立春咬绿', hexes: ['#FFF8DC', '#32CD32', '#ADFF2F', '#8B4513', '#FF6347'], themes: ['自然', '绿色系', '高饱和'] },
  { no: 64, title: '小暑荷风', hexes: ['#006400', '#FF69B4', '#E0FFFF', '#FFDAB9', '#8B4513'], themes: ['自然', '粉色系', '对比'] },
  { no: 65, title: '处暑凉簪', hexes: ['#F5F5DC', '#87CEEB', '#32CD32', '#D3D3D3', '#DEB887'], themes: ['自然', '绿色系', '低饱和'] },
  { no: 66, title: '寒露拾菊', hexes: ['#FFD700', '#FF8C00', '#E0FFFF', '#006400', '#8B7355'], themes: ['自然', '黄色系', '暖色'] },
  { no: 67, title: '大寒瑞雪', hexes: ['#FFFAFA', '#ADD8E6', '#708090', '#2F4F4F', '#4A3B32'], themes: ['自然', '蓝色系', '对比'] },
  { no: 68, title: '立秋梧桐', hexes: ['#FFD700', '#6B8E23', '#87CEEB', '#A9A9A9', '#D2B48C'], themes: ['自然', '黄色系', '暖色'] },

  // 📻 文艺氛围 / 怀旧质感 (69–88，已删暗房红灯·半截铅笔)
  { no: 69, title: '胶卷时代', hexes: ['#1C1C1C', '#8B4513', '#F5DEB3', '#B22222', '#696969'], themes: ['设计', '褐色系', '暖色'] },
  { no: 70, title: '老旧皮革', hexes: ['#5C4033', '#556B2F', '#DEB887', '#3E2723', '#DAA520'], themes: ['素材', '褐色系', '低饱和'] },
  { no: 72, title: '黄铜镇纸', hexes: ['#B8860B', '#008080', '#1C1C1C', '#FAEBD7', '#800000'], themes: ['素材', '黄色系', '对比'] },
  { no: 73, title: '羊皮信笺', hexes: ['#D2B48C', '#3E2723', '#800000', '#8B7355', '#191970'], themes: ['设计', '黄色系', '暖色'] },
  { no: 74, title: '打字机情书', hexes: ['#2F4F4F', '#B22222', '#F5DEB3', '#696969', '#4682B4'], themes: ['设计', '黑色', '暖色'] },
  { no: 75, title: '黑胶密纹', hexes: ['#1C1C1C', '#4A4A4A', '#5C4033', '#FFD700', '#191970'], themes: ['设计', '黑色', '对比'] },
  { no: 76, title: '搪瓷暖瓶', hexes: ['#FFFAF0', '#B22222', '#C0C0C0', '#8B7355', '#87CEEB'], themes: ['设计', '蓝色系', '对比'] },
  { no: 77, title: '藤编夏椅', hexes: ['#D2B48C', '#F5DEB3', '#228B22', '#808080', '#FFD700'], themes: ['素材', '褐色系', '暖色'] },
  { no: 78, title: '阁楼斜阳', hexes: ['#FF8C00', '#DEB887', '#5C4033', '#4682B4', '#696969'], themes: ['设计', '橙色系', '暖色'] },
  { no: 79, title: '雨巷回音', hexes: ['#708090', '#006400', '#D3D3D3', '#2F4F4F', '#8B4513'], themes: ['情绪', '蓝色系', '低饱和'] },
  { no: 80, title: '生锈的信箱', hexes: ['#8B4513', '#556B2F', '#A9A9A9', '#1C1C1C', '#DEB887'], themes: ['素材', '红色系', '低饱和'] },
  { no: 81, title: '月台票根', hexes: ['#DEB887', '#191970', '#B22222', '#696969', '#8B7355'], themes: ['设计', '黄色系', '对比'] },
  { no: 82, title: '风干玫瑰', hexes: ['#C71585', '#556B2F', '#F5DEB3', '#4A3060', '#DAA520'], themes: ['情绪', '粉色系', '低饱和'] },
  { no: 83, title: '旧书店的猫', hexes: ['#B8860B', '#DEB887', '#5C4033', '#006400', '#FFD700'], themes: ['设计', '褐色系', '暖色'] },
  { no: 84, title: '绿皮火车夜', hexes: ['#2F4F2F', '#FFD700', '#4A4A4A', '#191970', '#8B4513'], themes: ['设计', '绿色系', '深色'] },
  { no: 86, title: '午夜收音机', hexes: ['#5C4033', '#FFD700', '#1C1C1C', '#191970', '#32CD32'], themes: ['设计', '橙色系', '深色'] },
  { no: 87, title: '长满青苔的邮筒', hexes: ['#006400', '#9ACD32', '#8B4513', '#A9A9A9', '#FFFAF0'], themes: ['素材', '绿色系', '对比'] },
  { no: 88, title: '夏日终曲', hexes: ['#1E90FF', '#FFD700', '#FF8C00', '#32CD32', '#FFFAF0'], themes: ['情绪', '蓝色系', '高饱和'] },
];

function stableId(no) {
  const h = createHash('sha256').update(`sekong-v3:v1:${no}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

async function loadModules() {
  const tagsUrl = pathToFileURL(path.join(ROOT, 'src/lib/paletteTags.js')).href;
  const { generatePaletteTags } = await import(tagsUrl);
  return { generatePaletteTags };
}

function buildKeywords(themeTags, engineTags) {
  const base = ['color-extract', 'palette', '色海导入'];
  const seen = new Set(base);
  const out = [...base];
  for (const t of [...themeTags, ...engineTags]) {
    const k = String(t).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function buildRow(palette, { generatePaletteTags }) {
  const id = stableId(palette.no);
  const hexes = palette.hexes.map((h) => h.toUpperCase());
  const engineTags = generatePaletteTags(hexes, {});
  const themeTags = palette.themes || [];
  const keywords = buildKeywords(themeTags, engineTags);
  const colors = hexes.map((hex) => ({ hex, name: '' }));
  const title = palette.title;
  const themeDesc = themeTags.slice(0, 2).join('、');
  const overview = `「${title}」——${themeDesc}气质，可作日常创作的配色参考。`;
  const snapshot = {
    colorCard: true,
    colorCardData: { overview, colors },
    aesthetic: title,
    keywords,
    prompt: overview,
    paletteMeta: {},
    engineTags,
    themeTags,
    sourceType: 'curated_seed_v3',
    seedNo: palette.no,
  };
  const imageKey = `${SEED_USER_ID}/${id}.png`;
  const imageUrl = `/api/v1/media/${imageKey}`;
  return { id, title, hexes, keywords, overview, snapshot, imageUrl, imageKey };
}

function writeSql(rows) {
  const lines = ['PRAGMA foreign_keys = ON;'];
  for (const row of rows) {
    lines.push(`INSERT OR REPLACE INTO styles (
      id, user_id, is_public, image_url, aesthetic, typography, fonts, palette,
      design_logic, keywords, prompt, extraction_snapshot, like_count, created_at
    ) VALUES (
      '${sqlEscape(row.id)}', '${SEED_USER_ID}', 1,
      '${sqlEscape(row.imageUrl)}', '${sqlEscape(row.title)}', NULL, NULL,
      '${sqlEscape(JSON.stringify(row.hexes))}',
      '${sqlEscape(row.overview)}',
      '${sqlEscape(JSON.stringify(row.keywords))}',
      '${sqlEscape(row.overview)}',
      '${sqlEscape(JSON.stringify(row.snapshot))}',
      0, datetime('now')
    );`);
  }
  fs.writeFileSync(SQL_FILE, `${lines.join('\n')}\n`);
}

async function main() {
  const { generatePaletteTags } = await loadModules();
  fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });

  const rows = PALETTES.map((p) => buildRow(p, { generatePaletteTags }));

  for (const row of rows) {
    const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
    fs.writeFileSync(pngPath, encodeStripePng(row.hexes));
  }

  writeSql(rows);
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      rows.map((r) => ({
        no: r.snapshot.seedNo,
        id: r.id,
        title: r.title,
        hexes: r.hexes,
        keywords: r.keywords,
      })),
      null,
      2,
    ),
  );

  console.log(`Generated ${rows.length} palettes → ${OUT_DIR}`);
  console.log(`  SQL: ${SQL_FILE}`);

  if (process.argv.includes('--import-remote')) {
    console.log('Uploading PNGs to R2…');
    for (const row of rows) {
      const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
      const r = spawnSync(
        'npx',
        ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${row.imageKey}`,
          `--file=${pngPath}`, '--content-type=image/png', '--remote'],
        { cwd: ROOT, stdio: 'inherit' },
      );
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
    console.log('Importing SQL to remote D1…');
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', '--remote', `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('Remote import complete.');
  } else if (process.argv.includes('--import-local')) {
    console.log('Importing SQL to local D1…');
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', '--local', `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('Local import complete.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
