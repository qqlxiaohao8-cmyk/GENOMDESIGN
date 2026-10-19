/**
 * Better Auth factory — instantiate per request with D1 binding (Workers isolate).
 * https://better-auth.com/docs/integrations/cloudflare
 */
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { sendLoginCode } from './lib/sendLoginCode';

export type WorkerEnv = {
  DB: D1Database;
  AI?: Ai;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  EXTRA_TRUSTED_ORIGIN?: string;
  FEEDBACK_TO_EMAIL?: string;
  FEEDBACK_FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL?: {
    send: (payload: {
      to: string;
      from: { email: string; name?: string };
      subject: string;
      text: string;
    }) => Promise<unknown>;
  };
};

function trustedOrigins(env: WorkerEnv) {
  const extra = String(env.EXTRA_TRUSTED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'https://sekong.app',
    'https://www.sekong.app',
    ...extra,
  ];
}

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
    trustedOrigins: trustedOrigins(env),
    ...(socialProviders ? { socialProviders } : {}),
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        storeOTP: 'hashed',
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'sign-in') return;
          await sendLoginCode(env, email, otp);
        },
      }),
    ],
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
