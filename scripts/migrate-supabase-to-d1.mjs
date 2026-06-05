#!/usr/bin/env node
/**
 * Supabase → Cloudflare D1 + R2 一次性迁移
 *
 * 环境变量（可放在 .env.migration，脚本会自动读取 KEY=VALUE 行）：
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MIGRATION_MEDIA_BASE   默认 /api/v1/media（生产可设 https://你的域名/api/v1/media）
 *
 * 用法：
 *   node scripts/migrate-supabase-to-d1.mjs --dry-run
 *   node scripts/migrate-supabase-to-d1.mjs --target local
 *   node scripts/migrate-supabase-to-d1.mjs --target remote
 *   node scripts/migrate-supabase-to-d1.mjs --target local --skip-images
 *   node scripts/migrate-supabase-to-d1.mjs --export-only   # 仅导出 JSON 到 data/migration/
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXPORT_DIR = path.join(ROOT, 'data', 'migration');
const R2_BUCKET = 'sekong-style-images';
const D1_NAME = 'genom-db';

loadEnvFile(path.join(ROOT, '.env.migration'));
loadEnvFile(path.join(ROOT, '.env'));

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MEDIA_BASE = (process.env.MIGRATION_MEDIA_BASE || '/api/v1/media').replace(/\/$/, '');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const exportOnly = args.includes('--export-only');
const skipImages = args.includes('--skip-images');
const targetArgIdx = args.indexOf('--target');
const targetValue = targetArgIdx >= 0 ? args[targetArgIdx + 1] : 'local';
const target = targetValue === 'remote' ? 'remote' : 'local';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('需要 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY（写在 .env.migration）');
  process.exit(1);
}

// ── Supabase REST helpers ─────────────────────────────────────────────────

async function supabaseFetch(pathname, options = {}) {
  const url = `${SUPABASE_URL}${pathname}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${pathname} → ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.arrayBuffer();
}

async function fetchTable(table, { select = '*', orderBy = 'created_at.asc' } = {}) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const order = orderBy ? `&order=${orderBy}` : '';
    const batch = await supabaseFetch(
      `/rest/v1/${table}?select=${encodeURIComponent(select)}${order}&limit=${pageSize}&offset=${offset}`,
    );
    if (!Array.isArray(batch) || !batch.length) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

/** 表不存在或 schema 不一致时返回 [] */
async function fetchTableOptional(table, opts = {}) {
  try {
    return await fetchTable(table, opts);
  } catch (e) {
    const msg = String(e.message || e);
    if (
      msg.includes('PGRST205') ||
      msg.includes('404') ||
      msg.includes('42703') ||
      msg.includes('400')
    ) {
      console.warn(`   ⚠ 表 ${table} 跳过`);
      return [];
    }
    throw e;
  }
}

async function fetchAuthUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const data = await supabaseFetch(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function listStorageObjects(prefix = '', acc = []) {
  const body = { prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } };
  const list = await supabaseFetch('/storage/v1/object/list/style-images', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  for (const item of list || []) {
    if (item.id) acc.push(item.name);
    else if (item.name?.endsWith('/')) {
      await listStorageObjects(item.name, acc);
    }
  }
  return acc;
}

async function downloadStorageObject(objectPath) {
  return supabaseFetch(`/storage/v1/object/style-images/${objectPath}`);
}

// ── D1 / R2 via wrangler ──────────────────────────────────────────────────

function wrangler(cmd) {
  return execSync(`npx wrangler ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function d1Query(sql, { remote = target === 'remote' } = {}) {
  const flag = remote ? '--remote' : '--local';
  const out = wrangler(`d1 execute ${D1_NAME} ${flag} --command ${JSON.stringify(sql)} --json`);
  try {
    const parsed = JSON.parse(out);
    return parsed?.[0]?.results ?? [];
  } catch {
    return [];
  }
}

function d1ExecuteFile(filePath, { remote = target === 'remote' } = {}) {
  const flag = remote ? '--remote' : '--local';
  wrangler(`d1 execute ${D1_NAME} ${flag} --file=${JSON.stringify(filePath)}`);
}

function r2Put(key, filePath) {
  wrangler(`r2 object put ${R2_BUCKET}/${key} --file=${JSON.stringify(filePath)} --remote`);
}

function r2PutLocal(key, filePath) {
  try {
    wrangler(`r2 object put ${R2_BUCKET}/${key} --file=${JSON.stringify(filePath)} --local`);
  } catch {
    r2Put(key, filePath);
  }
}

// ── SQL helpers ───────────────────────────────────────────────────────────

function sqlStr(v) {
  if (v == null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toJsonText(v) {
  if (v == null) return 'NULL';
  if (typeof v === 'string') {
    try {
      JSON.parse(v);
      return sqlStr(v);
    } catch {
      return sqlStr(v);
    }
  }
  return sqlStr(JSON.stringify(v));
}

function boolInt(v) {
  return v ? 1 : 0;
}

// ── Image URL → R2 ────────────────────────────────────────────────────────

const imageCache = new Map();

function extractStoragePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const m = imageUrl.match(/\/storage\/v1\/object\/public\/style-images\/(.+)$/i);
  return m ? decodeURIComponent(m[1]) : null;
}

async function migrateImageUrl(imageUrl, oldUserId, newUserId) {
  if (!imageUrl || /^data:image\//i.test(imageUrl)) return imageUrl;
  if (imageCache.has(imageUrl)) return imageCache.get(imageUrl);

  const storagePath = extractStoragePath(imageUrl);
  if (!storagePath) {
    imageCache.set(imageUrl, imageUrl);
    return imageUrl;
  }

  const parts = storagePath.split('/');
  const fileName = parts[parts.length - 1];
  const newKey = `${newUserId}/${fileName}`;
  const newUrl = `${MEDIA_BASE}/${newKey}`;

  if (dryRun || skipImages) {
    imageCache.set(imageUrl, newUrl);
    return newUrl;
  }

  const tmpDir = path.join(EXPORT_DIR, '_tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, fileName.replace(/[^\w.-]/g, '_'));

  try {
    const buf = await downloadStorageObject(storagePath);
    fs.writeFileSync(tmpFile, Buffer.from(buf));
    if (target === 'remote') r2Put(newKey, tmpFile);
    else r2PutLocal(newKey, tmpFile);
    imageCache.set(imageUrl, newUrl);
    return newUrl;
  } catch (e) {
    console.warn(`  ⚠ 图片跳过 ${storagePath}: ${e.message}`);
    imageCache.set(imageUrl, imageUrl);
    return imageUrl;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n色空 Supabase → D1 迁移 (${dryRun ? 'DRY RUN' : target})\n`);

  console.log('1/6 拉取 Supabase 数据…');
  const [styles, styleLikes, dailySubs, dailyVotes, dailyTallies, authUsers] = await Promise.all([
    fetchTable('styles'),
    fetchTableOptional('style_likes'),
    fetchTableOptional('daily_palette_submissions'),
    fetchTableOptional('daily_palette_votes'),
    fetchTableOptional('daily_palette_tallies', { orderBy: 'challenge_date.asc' }),
    fetchAuthUsers(),
  ]);

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const exportPayload = { styles, styleLikes, dailySubs, dailyVotes, dailyTallies, authUsers };
  fs.writeFileSync(path.join(EXPORT_DIR, 'export.json'), JSON.stringify(exportPayload, null, 2));
  console.log(`   已写入 ${path.relative(ROOT, path.join(EXPORT_DIR, 'export.json'))}`);
  console.log(`   styles=${styles.length} likes=${styleLikes.length} daily_sub=${dailySubs.length} users=${authUsers.length}`);

  if (exportOnly) {
    console.log('\n--export-only 完成。');
    return;
  }

  console.log('2/6 读取 D1 Better Auth 用户（按邮箱映射）…');
  const baUsers = d1Query('SELECT id, email, name, username, accent_hex, font_id, profile_complete FROM user');
  const emailToBa = new Map(
    baUsers.map((u) => [String(u.email || '').toLowerCase(), u]),
  );

  const userMap = new Map();
  const skippedUsers = [];

  for (const su of authUsers) {
    const email = String(su.email || '').toLowerCase();
    const ba = emailToBa.get(email);
    if (ba) {
      userMap.set(su.id, ba.id);
    } else {
      skippedUsers.push({ id: su.id, email: su.email });
    }
  }

  console.log(`   映射成功 ${userMap.size} / ${authUsers.length} 用户`);
  if (skippedUsers.length) {
    console.log(`   ⚠ ${skippedUsers.length} 个用户未在 Better Auth 注册，其数据将跳过`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'skipped-users.json'),
      JSON.stringify(skippedUsers, null, 2),
    );
  }

  console.log('3/6 同步图片到 R2…');
  const mappedStyles = [];
  for (const row of styles) {
    const newUid = userMap.get(row.user_id);
    if (!newUid) continue;
    const image_url = await migrateImageUrl(row.image_url, row.user_id, newUid);
    mappedStyles.push({ ...row, user_id: newUid, image_url });
  }

  console.log('4/6 生成 SQL…');
  const statements = ['PRAGMA foreign_keys = ON;'];

  for (const su of authUsers) {
    const newId = userMap.get(su.id);
    if (!newId) continue;
    const meta = su.user_metadata || su.raw_user_meta_data || {};
    const nameParts = String(su.user_metadata?.full_name || su.user_metadata?.name || '').trim().split(/\s+/);
    statements.push(
      `INSERT INTO profiles (user_id, username, accent_hex, font_id, first_name, last_name, profile_complete, created_at, updated_at)
       VALUES (${sqlStr(newId)}, ${sqlStr(meta.username || null)}, ${sqlStr(meta.accent_hex || '#888888')}, ${sqlStr(meta.font_id || 'serif')}, ${sqlStr(nameParts[0] || null)}, ${sqlStr(nameParts.slice(1).join(' ') || null)}, ${boolInt(meta.profile_complete)}, datetime('now'), datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         username = excluded.username,
         accent_hex = excluded.accent_hex,
         font_id = excluded.font_id,
         profile_complete = excluded.profile_complete,
         updated_at = datetime('now');`,
    );
  }

  for (const row of mappedStyles) {
    statements.push(
      `INSERT OR REPLACE INTO styles (
        id, user_id, is_public, image_url, aesthetic, typography, fonts, palette,
        design_logic, keywords, prompt, extraction_snapshot, like_count, created_at
      ) VALUES (
        ${sqlStr(row.id)}, ${sqlStr(row.user_id)}, ${boolInt(row.is_public)},
        ${sqlStr(row.image_url)}, ${sqlStr(row.aesthetic)}, ${sqlStr(row.typography)},
        ${toJsonText(row.fonts)}, ${toJsonText(row.palette)}, ${sqlStr(row.design_logic)},
        ${toJsonText(row.keywords)}, ${sqlStr(row.prompt)}, ${toJsonText(row.extraction_snapshot)},
        ${Number(row.like_count) || 0}, ${sqlStr(row.created_at || new Date().toISOString())}
      );`,
    );
  }

  for (const row of styleLikes) {
    const uid = userMap.get(row.user_id);
    if (!uid) continue;
    statements.push(
      `INSERT OR IGNORE INTO style_likes (style_id, user_id, created_at)
       VALUES (${sqlStr(row.style_id)}, ${sqlStr(uid)}, ${sqlStr(row.created_at || new Date().toISOString())});`,
    );
  }

  for (const row of dailySubs) {
    const uid = userMap.get(row.user_id);
    if (!uid) continue;
    let image_url = row.image_url;
    if (uid) image_url = await migrateImageUrl(row.image_url, row.user_id, uid);
    statements.push(
      `INSERT OR REPLACE INTO daily_palette_submissions (
        id, challenge_date, user_id, style_id, title, palette, image_url, tags,
        daily_anchor_hex, winner_rank, created_at
      ) VALUES (
        ${sqlStr(row.id)}, ${sqlStr(row.challenge_date)}, ${sqlStr(uid)}, ${sqlStr(row.style_id)},
        ${sqlStr(row.title)}, ${toJsonText(row.palette)}, ${sqlStr(image_url)},
        ${toJsonText(row.tags)}, ${sqlStr(row.daily_anchor_hex)}, ${row.winner_rank ?? 'NULL'},
        ${sqlStr(row.created_at || new Date().toISOString())}
      );`,
    );
  }

  for (const row of dailyVotes) {
    const uid = userMap.get(row.voter_user_id);
    if (!uid) continue;
    statements.push(
      `INSERT OR IGNORE INTO daily_palette_votes (id, submission_id, voter_user_id, challenge_date, created_at)
       VALUES (${sqlStr(row.id)}, ${sqlStr(row.submission_id)}, ${sqlStr(uid)}, ${sqlStr(row.challenge_date)}, ${sqlStr(row.created_at || new Date().toISOString())});`,
    );
  }

  for (const row of dailyTallies) {
    statements.push(
      `INSERT OR REPLACE INTO daily_palette_tallies (challenge_date, tallied_at, winner_submission_ids)
       VALUES (${sqlStr(row.challenge_date)}, ${sqlStr(row.tallied_at || new Date().toISOString())}, ${toJsonText(row.winner_submission_ids || [])});`,
    );
  }

  const sqlPath = path.join(EXPORT_DIR, 'import.sql');
  fs.writeFileSync(sqlPath, statements.join('\n'));
  console.log(`   ${statements.length} 条语句 → ${path.relative(ROOT, sqlPath)}`);

  if (dryRun) {
    console.log('\n--dry-run 完成，未写入 D1/R2。');
    return;
  }

  console.log(`5/6 写入 D1 (${target})…`);
  d1ExecuteFile(sqlPath, { remote: target === 'remote' });

  console.log('6/6 完成。\n');
  console.log('请让用户用相同邮箱登录 Better Auth；未映射用户见 data/migration/skipped-users.json');
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
