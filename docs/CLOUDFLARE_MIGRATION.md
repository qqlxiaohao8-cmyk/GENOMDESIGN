# Supabase → Cloudflare Migration (色空 / GENOM)

**Target stack:** Cloudflare Workers + **D1** + **R2** + **Better Auth** + Cron Triggers  
**Current stack:** Supabase Auth + Postgres + Storage + client-side `@supabase/supabase-js`

Frontend is already deployed via `wrangler.toml` (static `dist/` SPA). This migration adds a **Worker API** behind `/api/*`.

---

## What Supabase does today

| Layer | Supabase | Cloudflare replacement |
|-------|----------|------------------------|
| Auth | Google OAuth, email/password, PKCE, `user_metadata` | **Better Auth** on Worker (`/api/auth/*`) |
| Database | Postgres + RLS | **D1** + Worker authorization middleware |
| Storage | `style-images` bucket | **R2** bucket `genom-style-images` |
| RPC / triggers | `tally_daily_one_color_winners`, like counts, vote quotas | **Worker routes** + **Cron Trigger** |
| Realtime | `color_hunt_votes` (unused in App) | Polling or Durable Objects (optional) |
| Cron | Client calls tally on page load | `wrangler.toml` `[triggers] crons` |

### Active tables (must migrate)

- `styles` — vault, 色海, daily backing rows
- `style_likes` + `like_count` on styles
- `daily_palette_submissions` / `votes` / `tallies`
- Better Auth tables (auto-created)

### Lower priority / legacy

- `ui_projects` — no UI usage
- `color_hunt_*` — component exists but not routed in App

---

## Architecture

```
Browser SPA (dist/)
    │
    ├─ /api/auth/*     → Better Auth (session cookie)
    ├─ /api/v1/styles  → D1 + R2
    ├─ /api/v1/likes
    ├─ /api/v1/daily-one-color
    └─ /api/v1/upload  → R2

Cron Worker (daily 16:00 UTC = GMT+8 midnight)
    └─ POST /api/internal/tally-daily-winners
```

**Security:** Remove `VITE_SUPABASE_ANON_KEY` from browser. All D1 access goes through Worker with session validation.

---

## Phased rollout

### Phase 1 — Foundation (this repo scaffold)

- [x] D1 schema `migrations/d1/0001_app_schema.sql`
- [x] Worker stub `workers/src/index.ts` + Better Auth factory
- [x] `wrangler.toml` D1 + R2 bindings
- [ ] `npm install` better-auth, hono
- [ ] `wrangler d1 create genom-db`
- [ ] `wrangler r2 bucket create genom-style-images`
- [ ] Set secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Phase 2 — Auth cutover

1. Run Better Auth migrations on D1: `npx @better-auth/cli migrate` (or Worker bootstrap route)
2. Replace `AuthModal` / `SetPasswordModal` to call `/api/auth/*` (Better Auth client)
3. Replace `useColorApp` session: `authClient.getSession()` instead of `supabase.auth`
4. Map `user_metadata` → `profiles` table or Better Auth `additionalFields`

### Phase 3 — Data API

Replace each `supabase.from(...)` with REST:

| Old | New endpoint |
|-----|----------------|
| `styles` select public/own | `GET /api/v1/styles?scope=explore\|vault` |
| `styles` insert/update/delete | `POST/PATCH/DELETE /api/v1/styles/:id` |
| `style_likes` | `POST/DELETE /api/v1/styles/:id/like` |
| `daily_palette_*` | `/api/v1/daily-one-color/*` |
| Storage upload | `POST /api/v1/upload` → R2 |

Implement in `workers/src/routes/` with shared auth middleware.

### Phase 4 — Data migration

1. Export Supabase: `pg_dump` or Dashboard CSV/JSON for `styles`, likes, daily tables
2. Export users via Supabase Auth admin API (or require re-login)
3. Script `scripts/migrate-supabase-to-d1.mjs`:
   - Map `auth.users.id` → Better Auth `user.id`
   - Rewrite `image_url` public URLs → R2 URLs
   - Convert `jsonb` columns to JSON strings for D1

### Phase 5 — Cron & cleanup

1. Add Cron: tally daily winners (replace `runPendingDailyTallies` in browser)
2. Remove `@supabase/supabase-js` dependency
3. Delete `supabase/migrations/` or archive
4. Remove `VITE_SUPABASE_*` from `.env`

---

## Environment variables

### Worker secrets (`wrangler secret put`)

```
BETTER_AUTH_SECRET=   # openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Build-time (optional, for auth client URL)

```
VITE_API_BASE_URL=https://your-worker.workers.dev
```

---

## D1 vs Postgres differences

| Postgres | D1 (SQLite) |
|----------|-------------|
| `uuid` | `TEXT` |
| `jsonb` | `TEXT` (JSON.stringify) |
| `timestamptz` | `TEXT` ISO8601 |
| RLS `auth.uid()` | Worker checks session user id |
| Triggers | Application logic in Worker |
| `SECURITY DEFINER` RPC | Internal route + service binding |

---

## Commands

```bash
# Create resources (once)
npx wrangler d1 create genom-db
npx wrangler r2 bucket create genom-style-images

# Apply D1 schema
npx wrangler d1 execute genom-db --local --file=./migrations/d1/0001_app_schema.sql
npx wrangler d1 execute genom-db --remote --file=./migrations/d1/0001_app_schema.sql

# Dev: API worker + Vite proxy
npm run dev:api    # wrangler dev workers/src/index.ts
npm run dev        # vite (proxy /api → local worker)

# Deploy
npm run deploy:all  # build SPA + deploy worker with assets
```

---

## Files to refactor (frontend)

| File | Change |
|------|--------|
| `src/lib/supabaseClient.js` | → `src/lib/apiClient.js` |
| `src/hooks/useColorApp.js` | fetch API + Better Auth session |
| `src/lib/dailyOneColorApi.js` | REST wrappers |
| `src/lib/styleImageUpload.js` | `POST /api/v1/upload` |
| `src/components/AuthModal.jsx` | Better Auth client |
| `src/pages/Profile*.jsx` | profile API |
| `src/hooks/useDailyOneColor.js` | REST |

---

## Risk notes

1. **User re-auth** — Supabase JWT ≠ Better Auth session; plan a maintenance window or dual-read period.
2. **Base64 `image_url` fallbacks** in DB — migrate to R2 or strip on import.
3. **Client-side daily tally** — must move to Cron before removing Supabase.
4. **Google OAuth redirect** — update Google Console redirect URI to Worker auth callback URL.
