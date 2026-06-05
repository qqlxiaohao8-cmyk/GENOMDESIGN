/**
 * Better Auth factory — instantiate per request with D1 binding (Workers isolate).
 * https://better-auth.com/docs/integrations/cloudflare
 */
import { betterAuth } from 'better-auth';

export type WorkerEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export function createAuth(env: WorkerEnv) {
  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined;

  return betterAuth({
    appName: '色空',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    // Vite dev (5173) proxies /api → Wrangler (8787); browser Origin stays 5173.
    trustedOrigins: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
      'https://genomlab.qqlxiaohao8.workers.dev',
    ],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        // Dev: no mailer yet — log link so you can test reset flow locally.
        console.log(`[better-auth] Password reset for ${user.email}: ${url}`);
      },
    },
    ...(socialProviders ? { socialProviders } : {}),
    user: {
      additionalFields: {
        username: { type: 'string', required: false },
        accent_hex: { type: 'string', required: false },
        font_id: { type: 'string', required: false },
        profile_complete: { type: 'boolean', required: false, defaultValue: false },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
