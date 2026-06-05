import { createAuthClient } from 'better-auth/react';

/** Same-origin /api/auth — Vite proxies to Wrangler in dev. */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL?.trim() || '',
});

export const authConfigured = true;
