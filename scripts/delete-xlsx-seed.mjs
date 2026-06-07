#!/usr/bin/env node
/**
 * Remove the 44 xlsx_seed palettes (南风知我·1 … 月浸重帘·44) from D1 / R2.
 * Usage:
 *   node scripts/delete-xlsx-seed.mjs              # write SQL only
 *   node scripts/delete-xlsx-seed.mjs --remote     # delete from production D1
 *   node scripts/delete-xlsx-seed.mjs --local      # delete from local D1
 *   node scripts/delete-xlsx-seed.mjs --r2         # delete PNGs from R2 (uses manifest or delete-xlsx-44.sql)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seed-palettes', 'manifest.json');
const SQL_FILE = path.join(ROOT, 'data', 'seed-palettes', 'delete-xlsx-44.sql');
const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET = 'sekong-style-images';

function loadEntries() {
  if (fs.existsSync(MANIFEST)) {
    const fromManifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    if (Array.isArray(fromManifest) && fromManifest.length > 0) return fromManifest;
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
  return `-- Remove 44 xlsx_seed palettes (${entries.length} rows)
PRAGMA foreign_keys = ON;
DELETE FROM styles
WHERE user_id = '${SEED_USER_ID}'
  AND id IN (
  ${ids}
);
`;
}

function cleanLocalSeedArtifacts(entries) {
  const importSql = path.join(ROOT, 'data', 'seed-palettes', 'import.sql');
  fs.writeFileSync(importSql, '-- xlsx_seed palettes removed; see curated-80 for active seed data.\n');
  fs.writeFileSync(MANIFEST, '[]\n');

  const imagesDir = path.join(ROOT, 'data', 'seed-palettes', 'images');
  for (const entry of entries) {
    const byId = path.join(imagesDir, `${entry.id}.png`);
    const byNo = path.join(imagesDir, `seed-palette-${String(entry.no).padStart(2, '0')}.png`);
    for (const p of [byId, byNo]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
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
    console.log('No palette IDs found (manifest.json empty and no delete-xlsx-44.sql).');
    return;
  }

  const remote = process.argv.includes('--remote');
  const local = process.argv.includes('--local');
  const r2Only = process.argv.includes('--r2') && !remote && !local;

  if (!r2Only) {
    const sql = buildDeleteSql(entries);
    fs.writeFileSync(SQL_FILE, sql);
    console.log(`Wrote ${SQL_FILE} (${entries.length} IDs)`);
  }

  if (remote || local) {
    const flag = remote ? '--remote' : '--local';
    console.log(`Deleting from ${remote ? 'remote' : 'local'} D1…`);
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', flag, `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('D1 delete complete.');
  }

  if (remote || local || process.argv.includes('--clean-local')) {
    cleanLocalSeedArtifacts(entries);
    console.log('Local xlsx seed artifacts cleaned.');
  }

  if (process.argv.includes('--r2')) {
    deleteFromR2(entries);
  }
}

main();
