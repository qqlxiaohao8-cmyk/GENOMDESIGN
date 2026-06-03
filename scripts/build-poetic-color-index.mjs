#!/usr/bin/env node
/**
 * 从 data/chinese-poetry 精选语料生成诗词色名索引。
 * 输出：src/data/poeticColorIndex.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { POETIC_COLOR_OVERRIDES } from '../src/lib/poeticColorOverrides.js';
import {
  cleanPoemLine,
  inferHexFromLine,
  oklabBucketKey,
  pickName2,
  scorePoemLine,
  toSimplified,
  normalizeHex,
} from '../src/lib/poetryColorLexicon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS_ROOT = path.join(ROOT, 'data', 'chinese-poetry');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'poeticColorIndex.json');

const CORPUS_FILES = [
  '全唐诗/唐诗三百首.json',
  '水墨唐诗/shuimotangshi.json',
  '诗经/shijing.json',
  '楚辞/chuci.json',
];

function walkJsonFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkJsonFiles(full));
    else if (ent.name.endsWith('.json') && ent.name !== 'authors.json' && ent.name !== 'intro.json') {
      out.push(full);
    }
  }
  return out;
}

function collectCorpusPaths() {
  const paths = CORPUS_FILES.map((p) => path.join(CORPUS_ROOT, p));
  paths.push(...walkJsonFiles(path.join(CORPUS_ROOT, '宋词')));
  paths.push(...walkJsonFiles(path.join(CORPUS_ROOT, '五代诗词')));
  return paths.filter((p) => fs.existsSync(p));
}

function* iterRecords(data) {
  if (!data) return;
  const arr = Array.isArray(data) ? data : [data];
  for (const rec of arr) {
    if (rec && typeof rec === 'object') yield rec;
  }
}

function* iterLines(record) {
  const author = toSimplified(record.author || record.poet || '佚名').trim() || '佚名';
  const source = toSimplified(
    record.title || record.rhythmic || record.section || record.name || '未知'
  ).trim();
  const tags = Array.isArray(record.tags) ? record.tags.map((t) => toSimplified(String(t))) : [];
  const blocks = record.paragraphs || record.content || [];
  for (const block of blocks) {
    if (typeof block !== 'string') continue;
    const simplified = toSimplified(block);
    const parts = simplified.split(/[。！？；\n]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const subParts =
        part.length > 32
          ? part.split(/[，、]/).map((p) => p.trim()).filter((p) => p.length >= 4)
          : [part];
      for (const line of subParts) {
        yield { line, author, source, tags };
      }
    }
  }
}

function addCandidate(bucketMap, entry, score) {
  const key = oklabBucketKey(entry.hex);
  const prev = bucketMap.get(key);
  if (!prev || score > prev.score) {
    bucketMap.set(key, { entry, score });
  }
}

function buildFromCorpus() {
  const bucketMap = new Map();
  const paths = collectCorpusPaths();
  if (!paths.length) {
    console.error(
      `未找到语料目录 ${CORPUS_ROOT}。请将 chinese-poetry 精选 JSON 放入该目录后重试。`
    );
    process.exit(1);
  }

  let lineCount = 0;
  let hitCount = 0;

  for (const filePath of paths) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn('跳过无法解析:', filePath, e.message);
      continue;
    }
    for (const record of iterRecords(raw)) {
      for (const ctx of iterLines(record)) {
        lineCount += 1;
        const poem = cleanPoemLine(ctx.line);
        const score = scorePoemLine({ line: poem, tags: ctx.tags });
        if (score < 0) continue;
        const hex = inferHexFromLine(poem);
        if (!hex) continue;
        const name2 = pickName2(poem);
        if (!name2) continue;
        hitCount += 1;
        addCandidate(
          bucketMap,
          {
            hex: normalizeHex(hex),
            name2,
            poem,
            poet: ctx.author,
            source: ctx.source,
          },
          score
        );
      }
    }
  }

  console.log(`语料文件 ${paths.length} 个，扫描诗句 ${lineCount} 行，有色 ${hitCount} 条，分桶 ${bucketMap.size} 个`);
  return bucketMap;
}

function mergeOverrides(bucketMap) {
  for (const o of POETIC_COLOR_OVERRIDES) {
    const poem = cleanPoemLine(o.poem);
    addCandidate(
      bucketMap,
      {
        hex: normalizeHex(o.hex),
        name2: o.name2,
        poem,
        poet: o.poet,
        source: o.source,
      },
      10000
    );
  }
}

function main() {
  if (!fs.existsSync(CORPUS_ROOT)) {
    if (fs.existsSync(OUT_FILE)) {
      console.log(`语料目录不存在，保留已有索引：${OUT_FILE}`);
      return;
    }
    console.error(
      `未找到 ${CORPUS_ROOT}，且不存在 ${OUT_FILE}。请按 data/chinese-poetry/README.md 准备语料后重试。`
    );
    process.exit(1);
  }
  const bucketMap = buildFromCorpus();
  mergeOverrides(bucketMap);
  const index = [...bucketMap.values()]
    .map((v) => v.entry)
    .sort((a, b) => a.hex.localeCompare(b.hex));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(index, null, 0)}\n`, 'utf8');
  console.log(`已写入 ${OUT_FILE}（${index.length} 条）`);
}

main();
