#!/usr/bin/env node
/**
 * 将色卡 keywords / engineTags 迁移到精简标签词表。
 *
 * Usage:
 *   node scripts/migrate-palette-tags.mjs              # local D1
 *   node scripts/migrate-palette-tags.mjs --remote     # production D1
 *   node scripts/migrate-palette-tags.mjs --dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'migration', 'tag-vocabulary');

const args = new Set(process.argv.slice(2));
const remote = args.has('--remote');
const dryRun = args.has('--dry-run');

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function d1Query(sql) {
  const cmd = [
    'wrangler', 'd1', 'execute', 'genom-db',
    ...(remote ? ['--remote'] : ['--local']),
    '--json',
    `--command=${sql}`,
  ];
  const r = spawnSync('npx', cmd, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  const parsed = JSON.parse(r.stdout);
  return parsed[0]?.results ?? [];
}

function d1ExecuteFile(filePath) {
  const r = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'genom-db', ...(remote ? ['--remote'] : ['--local']), `--file=${filePath}`],
    { cwd: ROOT, stdio: 'inherit' },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function loadTagModules() {
  const tagsUrl = pathToFileURL(path.join(ROOT, 'src/lib/paletteTags.js')).href;
  const seaUrl = pathToFileURL(path.join(ROOT, 'src/lib/colorSeaTags.js')).href;
  const [{ generatePaletteTags }, { isDisplayableSeaTag }] = await Promise.all([
    import(tagsUrl),
    import(seaUrl),
  ]);
  return { generatePaletteTags, isDisplayableSeaTag };
}

function parseJsonField(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function rebuildRow(row, { generatePaletteTags, isDisplayableSeaTag }) {
  const hexes = parseJsonField(row.palette, []);
  const oldKeywords = parseJsonField(row.keywords, []);
  const snap = parseJsonField(row.extraction_snapshot, {}) || {};
  const paletteMeta = snap.paletteMeta && typeof snap.paletteMeta === 'object' ? snap.paletteMeta : {};

  const legacyDisplay = [
    ...(Array.isArray(oldKeywords) ? oldKeywords : []),
    ...(Array.isArray(snap.themeTags) ? snap.themeTags : []),
  ]
    .map((k) => String(k).trim())
    .filter(Boolean);

  const engineTags = generatePaletteTags(hexes, paletteMeta, legacyDisplay, row.aesthetic);
  if (legacyDisplay.includes('每日色卡') && !engineTags.includes('每日色卡')) {
    engineTags.unshift('每日色卡');
  }

  const metaKeywords = ['color-extract', 'palette'];
  const keywords = [...metaKeywords, ...engineTags];

  const nextSnap = {
    ...snap,
    engineTags,
    keywords,
  };
  if (Array.isArray(snap.themeTags)) {
    nextSnap.themeTags = engineTags.filter((t) => !['暖色', '冷色', '浅色', '深色', '高饱和', '低饱和'].includes(t) && !/色系$/.test(t) && t !== '黑白');
  }

  return {
    id: row.id,
    aesthetic: row.aesthetic,
    keywords,
    extraction_snapshot: nextSnap,
  };
}

function buildSql(updates) {
  const lines = ['PRAGMA foreign_keys = ON;'];
  for (const u of updates) {
    lines.push(
      `UPDATE styles SET keywords = '${sqlEscape(JSON.stringify(u.keywords))}', extraction_snapshot = '${sqlEscape(JSON.stringify(u.extraction_snapshot))}' WHERE id = '${sqlEscape(u.id)}';`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const { generatePaletteTags, isDisplayableSeaTag } = await loadTagModules();
  const rows = d1Query(
    'SELECT id, aesthetic, palette, keywords, extraction_snapshot FROM styles ORDER BY created_at;',
  );
  console.log(`Found ${rows.length} styles (${remote ? 'remote' : 'local'})`);

  const updates = rows.map((row) => rebuildRow(row, { generatePaletteTags, isDisplayableSeaTag }));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sqlPath = path.join(OUT_DIR, remote ? 'import-remote.sql' : 'import-local.sql');
  const manifestPath = path.join(OUT_DIR, remote ? 'manifest-remote.json' : 'manifest-local.json');

  fs.writeFileSync(sqlPath, buildSql(updates));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      updates.map((u) => ({
        id: u.id,
        aesthetic: u.aesthetic,
        keywords: u.keywords,
        engineTags: u.extraction_snapshot.engineTags,
      })),
      null,
      2,
    ),
  );

  console.log(`Prepared ${updates.length} updates → ${sqlPath}`);
  if (dryRun) {
    console.log('Dry run — SQL not executed.');
    return;
  }
  d1ExecuteFile(sqlPath);
  console.log('Migration complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
