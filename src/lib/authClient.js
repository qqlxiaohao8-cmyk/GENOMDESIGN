import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/** Same-origin /api/auth — Vite proxies to Wrangler in dev. */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL?.trim() || '',
  plugins: [emailOTPClient()],
});

export const authConfigured = true;
