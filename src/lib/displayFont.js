const DB_NAME = 'sekong-brand';
const STORE = 'fonts';
const KEY = 'display';
const STYLE_ID = 'sekong-display-font';
const FAMILY = 'Sekong Display';
const FALLBACK = '"HYGuQuW", "ZCOOL XiaoWei", "Noto Serif SC", serif';
const MAX_BYTES = 8 * 1024 * 1024;

const FORMAT_BY_EXT = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
};

function extOf(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

function formatOf(name, mime) {
  const ext = extOf(name);
  if (FORMAT_BY_EXT[ext]) return FORMAT_BY_EXT[ext];
  if (mime?.includes('woff2')) return 'woff2';
  if (mime?.includes('woff')) return 'woff';
  if (mime?.includes('opentype') || mime?.includes('otf')) return 'opentype';
  return 'truetype';
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

async function idbGet() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function applyFace(src, format) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const fmt = format ? ` format("${format}")` : '';
  el.textContent = `
    @font-face {
      font-family: "${FAMILY}";
      src: url("${src}")${fmt};
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.documentElement.style.setProperty(
    '--font-display',
    `"${FAMILY}", ${FALLBACK}`,
  );
  document.documentElement.dataset.displayFont = 'custom';
}

export function applyDefaultDisplayFont() {
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.style.setProperty('--font-display', FALLBACK);
  document.documentElement.dataset.displayFont = 'default';
}

export async function saveDisplayFontFile(file) {
  if (!file) throw new Error('没有选择文件');
  if (file.size > MAX_BYTES) throw new Error('字体文件请小于 8MB');
  const ext = extOf(file.name);
  if (!FORMAT_BY_EXT[ext]) throw new Error('请上传 ttf / otf / woff / woff2');
  const buffer = await file.arrayBuffer();
  const record = {
    name: file.name,
    mime: file.type || '',
    format: formatOf(file.name, file.type),
    buffer,
    savedAt: Date.now(),
  };
  await idbSet(record);
  const url = URL.createObjectURL(new Blob([buffer], { type: file.type || 'font/ttf' }));
  applyFace(url, record.format);
  return { name: record.name };
}

export async function clearDisplayFont() {
  await idbClear();
  applyDefaultDisplayFont();
}

export async function loadDisplayFont() {
  try {
    const record = await idbGet();
    if (record?.buffer) {
      const url = URL.createObjectURL(new Blob([record.buffer], { type: record.mime || 'font/ttf' }));
      applyFace(url, record.format);
      return { name: record.name, source: 'upload' };
    }
  } catch {
    /* private mode */
  }

  applyDefaultDisplayFont();
  return { name: 'HYGuQuW', source: 'default' };
}
