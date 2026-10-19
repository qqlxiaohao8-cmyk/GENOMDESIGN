/**
 * Better Auth factory — instantiate per request with D1 binding (Workers isolate).
 * https://better-auth.com/docs/integrations/cloudflare
 */
import { betterAuth } from 'better-auth';
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api';
import { BASE_ERROR_CODES } from '@better-auth/core/error';
import { emailOTP } from 'better-auth/plugins';
import * as z from 'zod';
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

/** Expose set-password over HTTP, and tell signup whether this email already has a password. */
function credentialPasswordPlugin() {
  return {
    id: 'credential-password',
    endpoints: {
      setPassword: createAuthEndpoint(
        '/set-password',
        {
          method: 'POST',
          body: z.object({ newPassword: z.string() }),
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const { newPassword } = ctx.body;
          const session = ctx.context.session;
          const minPasswordLength = ctx.context.password.config.minPasswordLength;
          if (newPassword.length < minPasswordLength) {
            throw APIError.from('BAD_REQUEST', BASE_ERROR_CODES.PASSWORD_TOO_SHORT);
          }
          const maxPasswordLength = ctx.context.password.config.maxPasswordLength;
          if (newPassword.length > maxPasswordLength) {
            throw APIError.from('BAD_REQUEST', BASE_ERROR_CODES.PASSWORD_TOO_LONG);
          }
          const account = (await ctx.context.internalAdapter.findAccounts(session.user.id)).find(
            (row) => row.providerId === 'credential' && row.password,
          );
          if (account) throw APIError.from('BAD_REQUEST', BASE_ERROR_CODES.PASSWORD_ALREADY_SET);
          const passwordHash = await ctx.context.password.hash(newPassword);
          await ctx.context.internalAdapter.linkAccount({
            userId: session.user.id,
            providerId: 'credential',
            accountId: session.user.id,
            password: passwordHash,
          });
          return ctx.json({ status: true });
        },
      ),
      signupEmailStatus: createAuthEndpoint(
        '/signup/email-status',
        {
          method: 'POST',
          body: z.object({ email: z.string() }),
        },
        async (ctx) => {
          const email = ctx.body.email.toLowerCase().trim();
          if (!z.email().safeParse(email).success) {
            throw APIError.from('BAD_REQUEST', BASE_ERROR_CODES.INVALID_EMAIL);
          }
          const found = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
          const hasPassword = Boolean(
            found?.accounts?.some((row) => row.providerId === 'credential' && row.password),
          );
          return ctx.json({ hasPassword });
        },
      ),
    },
  };
}

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
    // Password sign-in for existing accounts. New accounts go through email OTP, then set a password.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
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
      credentialPasswordPlugin(),
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
