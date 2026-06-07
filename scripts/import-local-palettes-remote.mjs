#!/usr/bin/env node
/**
 * Import specific palettes from local D1 to remote D1 + R2 (stripe preview PNGs).
 * Usage:
 *   node scripts/import-local-palettes-remote.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { encodeStripePng } from './lib/stripe-png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'migration', 'local-8');
const SQL_FILE = path.join(OUT_DIR, 'import.sql');
const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET = 'sekong-style-images';

const TITLES = [
  '橙香玛德',
  '谷雨煎茶',
  '曲院风荷',
  '清明雨上',
  '大漠孤烟直',
  '一抹焙茶',
  '山茶花',
  '暮雪椰青',
];

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function queryLocal() {
  const inList = TITLES.map((t) => `'${sqlEscape(t)}'`).join(', ');
  const cmd = `SELECT id, aesthetic, palette, keywords, design_logic, extraction_snapshot FROM styles WHERE is_public=1 AND aesthetic IN (${inList}) ORDER BY aesthetic;`;
  const r = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'genom-db', '--local', '--json', `--command=${cmd}`],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  const parsed = JSON.parse(r.stdout);
  const rows = parsed[0]?.results ?? [];
  if (rows.length !== TITLES.length) {
    const found = new Set(rows.map((x) => x.aesthetic));
    const missing = TITLES.filter((t) => !found.has(t));
    console.error(`Expected ${TITLES.length} palettes, found ${rows.length}. Missing: ${missing.join(', ')}`);
    process.exit(1);
  }
  return rows;
}

function buildSql(rows) {
  const lines = ['PRAGMA foreign_keys = ON;'];
  for (const row of rows) {
    const hexes = JSON.parse(row.palette);
    const imageUrl = `/api/v1/media/${SEED_USER_ID}/${row.id}.png`;
    lines.push(`INSERT OR REPLACE INTO styles (
      id, user_id, is_public, image_url, aesthetic, typography, fonts, palette,
      design_logic, keywords, prompt, extraction_snapshot, like_count, created_at
    ) VALUES (
      '${sqlEscape(row.id)}', '${SEED_USER_ID}', 1,
      '${sqlEscape(imageUrl)}', '${sqlEscape(row.aesthetic)}', NULL, NULL,
      '${sqlEscape(row.palette)}',
      '${sqlEscape(row.design_logic || row.aesthetic)}',
      '${sqlEscape(row.keywords)}',
      '${sqlEscape(row.design_logic || row.aesthetic)}',
      '${sqlEscape(row.extraction_snapshot)}',
      0, datetime('now')
    );`);
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = queryLocal();
  fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });

  for (const row of rows) {
    const hexes = JSON.parse(row.palette);
    const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
    fs.writeFileSync(pngPath, encodeStripePng(hexes));
  }

  fs.writeFileSync(SQL_FILE, buildSql(rows));
  console.log(`Prepared ${rows.length} palettes → ${OUT_DIR}`);

  console.log('Uploading PNGs to R2…');
  for (const row of rows) {
    const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
    const r = spawnSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${SEED_USER_ID}/${row.id}.png`,
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
  for (const row of rows) console.log(`  ✓ ${row.aesthetic}`);
}

main();
