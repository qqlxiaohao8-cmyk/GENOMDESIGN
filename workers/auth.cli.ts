/**
 * CLI-only Better Auth config — NOT used at runtime.
 * Workers pass D1 via env at request time; the CLI needs a static sqlite database.
 *
 *   npx @better-auth/cli generate --config workers/auth.cli.ts --output migrations/d1/0002_better_auth.sql -y
 */
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';

const db = new Database(':memory:');

export const auth = betterAuth({
  appName: '色空',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
  secret: process.env.BETTER_AUTH_SECRET || 'cli-dev-secret-must-be-32-chars-min!!',
  database: db,
  trustedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async () => {},
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'cli-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'cli-google-client-secret',
    },
  },
  user: {
    additionalFields: {
      username: { type: 'string', required: false },
      accent_hex: { type: 'string', required: false },
      font_id: { type: 'string', required: false },
      profile_complete: { type: 'boolean', required: false, defaultValue: false },
    },
  },
});
