const KEY = 'sekong-sfx-volume';
const DEFAULT_VOLUME = 72;

export function readSfxVolume() {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw == null || raw === '') return DEFAULT_VOLUME;
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
  } catch {
    /* private mode */
  }
  return DEFAULT_VOLUME;
}

export function writeSfxVolume(value) {
  const n = Math.min(100, Math.max(0, Number(value) || 0));
  try {
    window.localStorage.setItem(KEY, String(n));
  } catch {
    /* private mode */
  }
  return n;
}
