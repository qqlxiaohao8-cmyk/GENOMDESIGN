#!/usr/bin/env node
/**
 * Remove v2-100 palettes from D1 / R2.
 * Usage:
 *   node scripts/delete-v2-seed.mjs --remote --r2 --clean-local
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const MANIFEST  = path.join(ROOT, 'data', 'seed-palettes', 'v2-100', 'manifest.json');
const SQL_FILE  = path.join(ROOT, 'data', 'seed-palettes', 'v2-100', 'delete-v2-100.sql');
const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET    = 'sekong-style-images';

function loadEntries() {
  if (fs.existsSync(MANIFEST)) {
    const entries = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    if (Array.isArray(entries) && entries.length > 0) return entries;
  }
  if (fs.existsSync(SQL_FILE)) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    const ids = [...sql.matchAll(/'([0-9a-f-]{36})'/gi)].map((m) => m[1]);
    if (ids.length > 0) return ids.map((id) => ({ id }));
  }
  return [];
}

function buildDeleteSql(entries) {
  const ids = entries.map((e) => `'${e.id}'`).join(',\n  ');
  return `-- Remove v2-100 palettes (${entries.length} rows)
PRAGMA foreign_keys = ON;
DELETE FROM styles
WHERE user_id = '${SEED_USER_ID}'
  AND id IN (
  ${ids}
);
`;
}

function cleanLocalSeedArtifacts(entries) {
  const importSql = path.join(ROOT, 'data', 'seed-palettes', 'v2-100', 'import.sql');
  if (fs.existsSync(importSql)) fs.writeFileSync(importSql, '-- v2-100 palettes removed.\n');
  fs.writeFileSync(MANIFEST, '[]\n');

  const imagesDir = path.join(ROOT, 'data', 'seed-palettes', 'v2-100', 'images');
  for (const entry of entries) {
    const png = path.join(imagesDir, `${entry.id}.png`);
    if (fs.existsSync(png)) fs.unlinkSync(png);
  }
}

function deleteFromR2(entries) {
  console.log(`Deleting ${entries.length} PNGs from R2…`);
  let failed = 0;
  for (const entry of entries) {
    const key = `${SEED_USER_ID}/${entry.id}.png`;
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
  const entries = loadEntries();
  if (entries.length === 0) {
    console.log('No v2 palette IDs found.');
    return;
  }

  const sql = buildDeleteSql(entries);
  fs.mkdirSync(path.dirname(SQL_FILE), { recursive: true });
  fs.writeFileSync(SQL_FILE, sql);
  console.log(`Wrote ${SQL_FILE} (${entries.length} IDs)`);

  if (process.argv.includes('--remote') || process.argv.includes('--local')) {
    const flag = process.argv.includes('--remote') ? '--remote' : '--local';
    console.log(`Deleting from ${flag === '--remote' ? 'remote' : 'local'} D1…`);
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', flag, `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('D1 delete complete.');
  }

  if (process.argv.includes('--r2')) {
    deleteFromR2(entries);
  }

  if (process.argv.includes('--clean-local')) {
    cleanLocalSeedArtifacts(entries);
    console.log('Local v2 seed artifacts cleaned.');
  }
}

main();
