#!/usr/bin/env node
/**
 * Delete palettes by aesthetic title from D1 / R2.
 * Usage:
 *   node scripts/delete-palettes-by-title.mjs --remote --r2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_SQL = path.join(ROOT, 'data', 'seed-palettes', 'delete-by-title.sql');
const R2_BUCKET = 'sekong-style-images';

const TITLES = [
  '松风入墨', '轻黛', '深银', '阳银', '平白', '晴窗分茶', '青青', '依依', '轻黄', '浴金',
  '煌煌', '花阴移午', '藏岫', '玉溪', '溪蓝', '香缥', '缥缈', '晴霁', '沧海遗珠', '须白',
  '烟白', '砚砂', '浮生半日', '绫霞', '桃雾', '髯雪', '暮山晴雪', '花绛', '暮砚', '茶褐',
  '金门', '霜林如醉', '茫茫', '淡碧', '缃裙', '轻霞', '嫩红', '暗香浮动', '望缥', '白露为霜',
  '苍苍', '金粟', '秋桂', '清角吹寒', '铜晖', '灼灼', '灯红', '月浸重帘', '萋萋', '麦秋',
  '铅黄', '一川芳草', '朱霞', '体白', '远缥', '沧浪', '渔火零星', '入青', '碧雾', '大雪',
  '云素', '波平如镜', '水虹', '风黄', '云扉半掩', '紫骝', '爲霓', '藕梦', '霜雪', '长亭晚照',
  '秋照', '底霓', '挼蓝', '南风知我', '淡银', '残雪', '银蟾', '螺黛', '淡墨', '北窗高卧',
  '昏檀', '缕茜', '燕泥芹香', '暮靛', '澄宇', '上雪', '半溪明月', '月纱', '日红', '轻红',
  '西洲曲里', '蕖嫣', '力胭', '脉脉', '丹青不渝', '檀车', '瘦檀', '古驿', '含素', '白发',
  '沙月', '尘褐', '万象静观', '春芥', '淡绿', '畔缥', '江练', '水阁听涛', '甲乌', '到蓝',
  '月黄', '岚气满山', '石瘦苔青', '碎红', '绛雪', '素巾', '轻霰', '小院深深', '云绿', '江霭',
  '幽兰在谷', '烟黛', '溅紫', '染霓', '萼胭', '荷风送香', '眉黛', '紫箫', '紫云', '紫泉',
  '东篱把酒', '飞乌', '堆玄', '干银', '晓霜', '素笺留韵', '琥光', '子丹', '葱茜', '光风霁月',
  '静嫣', '霓红', '晚照', '远山自横', '丁香', '外嫣', '雁字横秋', '眩白', '素姿', '淡绛',
  '竹露清响', '颗素', '縞素', '芦雪', '星河欲曙', '琼岛春阴', '梧叶舞风', '香素', '注檀',
  '墨戏淋漓', '海青', '泪蓝', '深蓝', '粉黛', '清霜', '翦银', '短梦依然', '流玄', '漫漫',
  '淡雪', '春溪叠影', '知白', '成碧', '疏影横斜',
];

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function queryRemote(sql) {
  const r = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'genom-db', '--remote', '--json', `--command=${sql}`],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  const parsed = JSON.parse(r.stdout);
  return parsed[0]?.results ?? [];
}

function buildDeleteSql(rows) {
  const ids = rows.map((r) => `'${r.id}'`).join(',\n  ');
  return `-- Delete ${rows.length} palettes by title
PRAGMA foreign_keys = ON;
DELETE FROM styles
WHERE id IN (
  ${ids}
);
`;
}

function deleteFromR2(rows) {
  console.log(`Deleting ${rows.length} PNGs from R2…`);
  let failed = 0;
  for (const row of rows) {
    const key = row.image_url?.replace(/^\/api\/v1\/media\//, '');
    if (!key) continue;
    const r = spawnSync(
      'npx',
      ['wrangler', 'r2', 'object', 'delete', `${R2_BUCKET}/${key}`, '--remote'],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (r.status !== 0) failed += 1;
  }
  if (failed > 0) {
    console.error(`R2 cleanup finished with ${failed} error(s).`);
    process.exit(1);
  }
  console.log('R2 cleanup done.');
}

function main() {
  const uniqueTitles = [...new Set(TITLES)];
  const inList = uniqueTitles.map((t) => `'${sqlEscape(t)}'`).join(', ');

  console.log(`Looking up ${uniqueTitles.length} titles in remote D1…`);
  const rows = queryRemote(
    `SELECT id, aesthetic, image_url, user_id FROM styles WHERE aesthetic IN (${inList});`,
  );

  console.log(`Found ${rows.length} matching palettes.`);
  if (rows.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const sql = buildDeleteSql(rows);
  fs.writeFileSync(OUT_SQL, sql);
  console.log(`Wrote ${OUT_SQL}`);

  if (process.argv.includes('--remote') || process.argv.includes('--local')) {
    const flag = process.argv.includes('--remote') ? '--remote' : '--local';
    console.log(`Deleting from ${flag === '--remote' ? 'remote' : 'local'} D1…`);
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', flag, `--file=${OUT_SQL}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('D1 delete complete.');
  }

  if (process.argv.includes('--r2')) {
    deleteFromR2(rows);
  }

  const found = new Set(rows.map((r) => r.aesthetic));
  const missing = uniqueTitles.filter((t) => !found.has(t));
  if (missing.length) {
    console.log(`Not found (${missing.length}): ${missing.slice(0, 20).join('、')}${missing.length > 20 ? '…' : ''}`);
  }
}

main();
