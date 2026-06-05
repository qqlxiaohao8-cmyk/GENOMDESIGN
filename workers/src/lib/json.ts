export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string | null {
  if (value == null) return null;
  return JSON.stringify(value);
}
