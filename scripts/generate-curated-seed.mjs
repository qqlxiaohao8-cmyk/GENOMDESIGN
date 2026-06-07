#!/usr/bin/env node
/**
 * Generate curated 80 palette seed SQL + stripe PNGs for 色海.
 * Usage:
 *   node scripts/generate-curated-seed.mjs
 *   npm run seed:curated:import        # local D1
 *   npm run seed:curated:import:remote # production D1 + R2
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { encodeStripePng } from './lib/stripe-png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'seed-palettes', 'curated-80');
const SQL_FILE = path.join(OUT_DIR, 'import.sql');
const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');

/** Same seed owner as existing xlsx import rows */
const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET = 'sekong-style-images';

const PALETTES = [
  { no: 1, title: '生椰拿铁', hexes: ['#F7F1E8', '#D9C5A1', '#A67C52', '#7A4E2D'], themes: ['咖啡', '素材', '暖色'] },
  { no: 2, title: '薄巧圈', hexes: ['#2E5E4E', '#9ED9CC', '#4B3621', '#FFF7E8'], themes: ['糖果', '自然', '冷色'] },
  { no: 3, title: '草莓奶昔', hexes: ['#FFD6E0', '#FF9EB5', '#F26B8A', '#FFF5F7'], themes: ['糖果', '粉色系', '暖色'] },
  { no: 4, title: '焦糖布丁', hexes: ['#FCE8B2', '#D8A25E', '#8A5A3C'], themes: ['咖啡', '橙色系', '暖色'] },
  { no: 5, title: '抹茶麻薯', hexes: ['#DDE8D3', '#A7C4A0', '#6D8B74', '#FFF8F0'], themes: ['植物', '绿色系', '低饱和'] },
  { no: 6, title: '甜甜圈', hexes: ['#FFD8B8', '#FF9AA2', '#FFDAC1', '#E2F0CB', '#B5EAD7'], themes: ['糖果', '暖色', '高饱和'] },
  { no: 7, title: '蓝莓酸奶', hexes: ['#E9ECFF', '#B8C0FF', '#6B7FD7', '#F9F8FF'], themes: ['糖果', '蓝色系', '冷色'] },
  { no: 8, title: '红丝绒蛋糕', hexes: ['#F7D9D9', '#C44536', '#6A040F'], themes: ['糖果', '红色系', '暖色'] },
  { no: 9, title: '牛油果吐司', hexes: ['#D9E4C4', '#A3B18A', '#588157', '#F2E8CF'], themes: ['植物', '绿色系', '自然'] },
  { no: 10, title: '海盐芝士', hexes: ['#FFF8E7', '#F6E7C1', '#D9D9D9'], themes: ['咖啡', '浅色', '极简灰'] },
  { no: 11, title: '柠檬气泡水', hexes: ['#FFF275', '#D6FF79', '#A8E6CF', '#F8F9FA'], themes: ['糖果', '绿色系', '浅色'] },
  { no: 12, title: '黑糖珍珠', hexes: ['#F2D6B3', '#A47148', '#5C4033'], themes: ['咖啡', '褐色系', '暖色'] },
  { no: 13, title: '荔枝冰茶', hexes: ['#FFE5EC', '#FFCAD4', '#FFF1E6'], themes: ['糖果', '粉色系', '浅色'] },
  { no: 14, title: '西瓜冰棒', hexes: ['#FF6B6B', '#F7FFF7', '#4ECDC4'], themes: ['热带水果', '红色系', '对比'] },
  { no: 15, title: '热巧克力', hexes: ['#4A2C2A', '#7B4F3D', '#D9A066'], themes: ['咖啡', '褐色系', '深色'] },
  { no: 16, title: '芒果糯米饭', hexes: ['#FFD166', '#FFF4D6', '#E9C46A'], themes: ['热带水果', '黄色系', '暖色'] },
  { no: 17, title: '葡萄果冻', hexes: ['#D8B4FE', '#A855F7', '#6B21A8'], themes: ['热带水果', '紫色系', '高饱和'] },
  { no: 18, title: '蜂蜜松饼', hexes: ['#FFE29A', '#D4A373', '#FAEDCD'], themes: ['糖果', '黄色系', '暖色'] },
  { no: 19, title: '橙香玛德琳', hexes: ['#FFB703', '#FB8500', '#FFF4D6'], themes: ['糖果', '橙色系', '暖色'] },
  { no: 20, title: '香草冰淇淋', hexes: ['#FFF8E8', '#F7F3E9', '#E9ECEF'], themes: ['糖果', '浅色', '白色'] },
  { no: 21, title: '丰收', hexes: ['#A98467', '#DDB892', '#ADC178', '#6C584C', '#FAEDCD'], themes: ['自然', '植物', '暖色'] },
  { no: 22, title: '麦田风', hexes: ['#F4E285', '#DDB967', '#A98443'], themes: ['自然', '黄色系', '暖色'] },
  { no: 23, title: '雨后森林', hexes: ['#344E41', '#588157', '#A3B18A', '#DAD7CD'], themes: ['自然', '森林', '绿色系'] },
  { no: 24, title: '晨雾湖泊', hexes: ['#EAF4F4', '#CDE3E3', '#8FB9A8', '#4A6D7C'], themes: ['自然', '雾感', '冷色'] },
  { no: 25, title: '晚霞', hexes: ['#FF9770', '#FFB5A7', '#FCD5CE', '#F8EDEB'], themes: ['自然', '日落', '暖色'] },
  { no: 26, title: '深海潜游', hexes: ['#001219', '#005F73', '#0A9396', '#94D2BD'], themes: ['自然', '海洋', '深色'] },
  { no: 27, title: '珊瑚礁', hexes: ['#FF6F61', '#F7B267', '#84DCC6', '#95A3B3'], themes: ['自然', '海洋', '热带水果'] },
  { no: 28, title: '北极光', hexes: ['#80FFDB', '#64DFDF', '#5390D9', '#7400B8'], themes: ['自然', '星空', '高饱和'] },
  { no: 29, title: '雪原', hexes: ['#FFFFFF', '#E9ECEF', '#CED4DA'], themes: ['自然', '白色', '极简灰'] },
  { no: 30, title: '沙漠旅人', hexes: ['#E9C46A', '#D4A373', '#BC6C25', '#FAEDCD'], themes: ['自然', '岩石', '暖色'] },
  { no: 31, title: '竹林', hexes: ['#CAD2C5', '#84A98C', '#52796F', '#354F52'], themes: ['自然', '竹林', '绿色系'] },
  { no: 32, title: '枫叶谷', hexes: ['#BC4749', '#D68C45', '#F2E8CF'], themes: ['自然', '植物', '暖色'] },
  { no: 33, title: '火山', hexes: ['#3D0000', '#9D0208', '#DC2F02', '#F48C06'], themes: ['自然', '岩石', '红色系'] },
  { no: 34, title: '湖畔清晨', hexes: ['#D8F3DC', '#95D5B2', '#40916C', '#1B4332'], themes: ['自然', '森林', '绿色系'] },
  { no: 35, title: '银杏大道', hexes: ['#FFE066', '#F4D35E', '#EE964B'], themes: ['自然', '植物', '黄色系'] },
  { no: 36, title: '极夜', hexes: ['#03045E', '#023E8A', '#0077B6', '#90E0EF'], themes: ['自然', '星空', '冷色'] },
  { no: 37, title: '峡谷', hexes: ['#6F1D1B', '#BB9457', '#E6CCB2'], themes: ['自然', '岩石', '褐色系'] },
  { no: 38, title: '云层', hexes: ['#F8F9FA', '#DEE2E6', '#ADB5BD'], themes: ['自然', '雾感', '极简灰'] },
  { no: 39, title: '向日葵田', hexes: ['#FFD60A', '#F4A261', '#588157'], themes: ['自然', '植物', '黄色系'] },
  { no: 40, title: '春芽', hexes: ['#E9F5DB', '#CFE1B9', '#97A97C'], themes: ['自然', '植物', '浅色'] },
  { no: 41, title: '地铁早高峰', hexes: ['#2B2D42', '#8D99AE', '#EDF2F4'], themes: ['设计', '素材', '冷色'] },
  { no: 42, title: '咖啡馆角落', hexes: ['#EDE0D4', '#DDBEA9', '#7F5539', '#432818'], themes: ['咖啡', '设计', '暖色'] },
  { no: 43, title: '书店午后', hexes: ['#FAF3DD', '#C8D5B9', '#8FC0A9'], themes: ['设计', '自然', '浅色'] },
  { no: 44, title: '霓虹街区', hexes: ['#F72585', '#7209B7', '#3A0CA3', '#4CC9F0'], themes: ['艺术', '梦幻', '高饱和'] },
  { no: 45, title: '共享办公', hexes: ['#F8F9FA', '#DEE2E6', '#6C757D'], themes: ['设计', '极简灰', '浅色'] },
  { no: 46, title: '夜班便利店', hexes: ['#0D1B2A', '#1B263B', '#415A77', '#E0E1DD'], themes: ['设计', '深色', '冷色'] },
  { no: 47, title: '城市雨夜', hexes: ['#1D3557', '#457B9D', '#A8DADC'], themes: ['设计', '海洋', '冷色'] },
  { no: 48, title: '地铁终点站', hexes: ['#22223B', '#4A4E69', '#9A8C98', '#F2E9E4'], themes: ['设计', '素材', '低饱和'] },
  { no: 49, title: '黑胶唱片', hexes: ['#0A0908', '#22333B', '#EAE0D5'], themes: ['艺术', '素材', '深色'] },
  { no: 50, title: '复古影院', hexes: ['#6D597A', '#B56576', '#E56B6F', '#EAAC8B'], themes: ['艺术', '情绪', '暖色'] },
  { no: 51, title: '摄影暗房', hexes: ['#111111', '#444444', '#888888'], themes: ['艺术', '黑色', '极简灰'] },
  { no: 52, title: '现代公寓', hexes: ['#FFFFFF', '#D9D9D9', '#A8A8A8'], themes: ['设计', '白色', '极简灰'] },
  { no: 53, title: '机场候机厅', hexes: ['#E9ECEF', '#ADB5BD', '#6C757D'], themes: ['设计', '素材', '冷色'] },
  { no: 54, title: '共享单车', hexes: ['#F4A261', '#2A9D8F', '#264653'], themes: ['设计', '自然', '对比'] },
  { no: 55, title: '唱片店', hexes: ['#3C1642', '#086375', '#1DD3B0'], themes: ['艺术', '素材', '冷色'] },
  { no: 56, title: '程序员深夜', hexes: ['#0B132B', '#1C2541', '#3A506B', '#5BC0BE'], themes: ['设计', '深色', '冷色'] },
  { no: 57, title: '城市天际线', hexes: ['#1F2041', '#4B3F72', '#FFC857'], themes: ['设计', '艺术', '深色'] },
  { no: 58, title: '电竞房', hexes: ['#240046', '#5A189A', '#9D4EDD'], themes: ['艺术', '梦幻', '紫色系'] },
  { no: 59, title: '设计工作室', hexes: ['#F6F5F5', '#EDEDED', '#D6CCC2'], themes: ['设计', '素材', '浅色'] },
  { no: 60, title: '午夜出租车', hexes: ['#111111', '#FFD60A', '#FCA311'], themes: ['设计', '对比', '深色'] },
  { no: 61, title: '初恋', hexes: ['#FFE5EC', '#FFC2D1', '#FF8FAB'], themes: ['情绪', '艺术', '粉色系'] },
  { no: 62, title: '失眠', hexes: ['#0D1B2A', '#1B263B', '#415A77'], themes: ['情绪', '深色', '冷色'] },
  { no: 63, title: '治愈', hexes: ['#D8F3DC', '#B7E4C7', '#95D5B2'], themes: ['情绪', '自然', '绿色系'] },
  { no: 64, title: '想念', hexes: ['#EAE4E9', '#C9ADA7', '#9A8C98'], themes: ['情绪', '艺术', '低饱和'] },
  { no: 65, title: '快乐周末', hexes: ['#FFD60A', '#F77F00', '#FCBF49'], themes: ['情绪', '暖色', '高饱和'] },
  { no: 66, title: '孤独星球', hexes: ['#03045E', '#0077B6', '#90E0EF'], themes: ['情绪', '海洋', '冷色'] },
  { no: 67, title: '热恋', hexes: ['#FF0A54', '#FF477E', '#FF7096'], themes: ['情绪', '红色系', '高饱和'] },
  { no: 68, title: '告别', hexes: ['#D8E2DC', '#FFE5D9', '#FFCAD4'], themes: ['情绪', '艺术', '浅色'] },
  { no: 69, title: '勇气', hexes: ['#E63946', '#F77F00', '#FCBF49'], themes: ['情绪', '暖色', '高饱和'] },
  { no: 70, title: '放空', hexes: ['#EAF4F4', '#DDEDEA', '#FFFFFF'], themes: ['情绪', '雾感', '浅色'] },
  { no: 71, title: '浪漫主义', hexes: ['#F7CAD0', '#F4ACB7', '#9D8189'], themes: ['情绪', '艺术', '粉色系'] },
  { no: 72, title: '成长', hexes: ['#A3B18A', '#588157', '#344E41'], themes: ['情绪', '自然', '绿色系'] },
  { no: 73, title: '自由', hexes: ['#A9DEF9', '#E4C1F9', '#FCF6BD'], themes: ['情绪', '艺术', '冷色'] },
  { no: 74, title: '平静', hexes: ['#BDE0FE', '#A2D2FF', '#F1FAEE'], themes: ['情绪', '冷色', '浅色'] },
  { no: 75, title: '期待', hexes: ['#FFD166', '#06D6A0', '#118AB2'], themes: ['情绪', '暖色', '高饱和'] },
  { no: 76, title: '遗憾', hexes: ['#6D6875', '#B5838D', '#E5989B'], themes: ['情绪', '艺术', '低饱和'] },
  { no: 77, title: '温柔', hexes: ['#FAE1DD', '#FCD5CE', '#F8EDEB'], themes: ['情绪', '粉色系', '浅色'] },
  { no: 78, title: '热血', hexes: ['#9D0208', '#DC2F02', '#F48C06'], themes: ['情绪', '红色系', '高饱和'] },
  { no: 79, title: '梦想', hexes: ['#B8C0FF', '#CDB4DB', '#FFC8DD'], themes: ['情绪', '艺术', '紫色系'] },
  { no: 80, title: '安眠', hexes: ['#4A4E69', '#9A8C98', '#C9ADA7'], themes: ['情绪', '低饱和', '深色'] },
];

function stableId(no) {
  const h = createHash('sha256').update(`sekong-curated-80:v1:${no}`).digest('hex');
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
  const overview = `「${title}」——${themeTags.slice(0, 2).join('、')}气质，可作日常创作的配色参考。`;
  const snapshot = {
    colorCard: true,
    colorCardData: { overview, colors },
    aesthetic: title,
    keywords,
    prompt: overview,
    paletteMeta: {},
    engineTags,
    themeTags,
    sourceType: 'curated_seed',
    seedNo: palette.no,
  };
  const imageKey = `${SEED_USER_ID}/${id}.png`;
  const imageUrl = `/api/v1/media/${imageKey}`;
  return {
    id,
    title,
    hexes,
    keywords,
    overview,
    snapshot,
    imageUrl,
    imageKey,
  };
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
    MANIFEST_FILE,
    JSON.stringify(
      rows.map((r) => ({ no: r.snapshot.seedNo, id: r.id, title: r.title, hexes: r.hexes, keywords: r.keywords })),
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
        ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${row.imageKey}`, `--file=${pngPath}`, '--content-type=image/png', '--remote'],
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
