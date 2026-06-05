const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || '';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message || res.statusText || 'Request failed',
      res.status,
      data?.error,
    );
  }
  return data;
}

export async function syncProfile() {
  return apiFetch('/profiles/sync', { method: 'POST' });
}
