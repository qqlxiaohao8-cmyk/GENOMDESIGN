import extractIcon from '../assets/icons/extract.png';
import memoryIcon from '../assets/icons/memory.png';
import mineIcon from '../assets/icons/mine.png';
import seaIcon from '../assets/icons/sea.png';
import settingsIcon from '../assets/icons/settings.png';
import shengseIcon from '../assets/icons/shengse.png';
import walkIcon from '../assets/icons/walk.png';

const DB_NAME = 'sekong-brand-icons';
const STORE = 'icons';
const MAX_BYTES = 800 * 1024;

export const DISPLAY_ICON_SLOTS = [
  { key: 'mine', label: '我的' },
  { key: 'sea', label: '色海' },
  { key: 'shengse', label: '生色' },
  { key: 'extract', label: '析色' },
  { key: 'settings', label: '设定' },
  { key: 'memory', label: '色彩记忆' },
  { key: 'walk', label: 'Color Walk' },
];

export const BUNDLED_ICON_SRC = {
  mine: mineIcon,
  sea: seaIcon,
  shengse: shengseIcon,
  extract: extractIcon,
  settings: settingsIcon,
  memory: memoryIcon,
  walk: walkIcon,
};

const ALLOWED = new Set(['svg', 'png', 'webp']);

let cache = {};
const listeners = new Set();

function extOf(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

function notify() {
  const snap = { ...cache };
  listeners.forEach((fn) => fn(snap));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function txPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

function txDelete(db, key) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

function urlFromRecord(record) {
  if (!record?.buffer) return '';
  const mime = record.mime
    || (record.ext === 'svg' ? 'image/svg+xml' : `image/${record.ext || 'png'}`);
  return URL.createObjectURL(new Blob([record.buffer], { type: mime }));
}

export function getDisplayIconSrc(key) {
  return cache[key] || '';
}

export function subscribeDisplayIcons(fn) {
  listeners.add(fn);
  fn({ ...cache });
  return () => listeners.delete(fn);
}

export async function loadDisplayIcons() {
  try {
    const db = await openDb();
    const next = {};
    await Promise.all(DISPLAY_ICON_SLOTS.map(async ({ key }) => {
      const record = await txGet(db, key);
      if (record) next[key] = urlFromRecord(record);
    }));
    cache = next;
    notify();
  } catch {
    cache = {};
    notify();
  }
  return { ...cache };
}

export async function saveDisplayIconFile(key, file) {
  if (!DISPLAY_ICON_SLOTS.some((s) => s.key === key)) throw new Error('未知图标');
  if (!file) throw new Error('没有选择文件');
  if (file.size > MAX_BYTES) throw new Error('单张请小于 800KB');
  const ext = extOf(file.name);
  if (!ALLOWED.has(ext)) throw new Error('请上传 svg / png / webp');
  const buffer = await file.arrayBuffer();
  const db = await openDb();
  await txPut(db, key, {
    name: file.name,
    mime: file.type || '',
    ext,
    buffer,
    savedAt: Date.now(),
  });
  if (cache[key]) URL.revokeObjectURL(cache[key]);
  cache = { ...cache, [key]: urlFromRecord({ buffer, mime: file.type, ext }) };
  notify();
  return cache[key];
}

export async function clearDisplayIcon(key) {
  const db = await openDb();
  await txDelete(db, key);
  if (cache[key]) URL.revokeObjectURL(cache[key]);
  const next = { ...cache };
  delete next[key];
  cache = next;
  notify();
}

export async function clearAllDisplayIcons() {
  const db = await openDb();
  await Promise.all(DISPLAY_ICON_SLOTS.map(({ key }) => txDelete(db, key)));
  Object.values(cache).forEach((url) => URL.revokeObjectURL(url));
  cache = {};
  notify();
}
