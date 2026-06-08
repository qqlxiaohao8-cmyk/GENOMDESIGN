/**
 * GENOM API Worker — Better Auth + D1 + R2
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, type WorkerEnv } from './auth';
import { tallyDailyWinners, yesterdayDateKey } from './lib/tally';
import { todayChallengeDateKey } from './lib/dailyDate';
import dailyRoutes from './routes/dailyOneColor';
import paletteTitleRoutes from './routes/paletteTitle';
import profilesRoutes from './routes/profiles';
import stylesRoutes from './routes/styles';
import uploadRoutes from './routes/upload';

type Env = WorkerEnv & {
  ASSETS: Fetcher;
  STYLE_IMAGES: R2Bucket;
  AI?: Ai;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

app.get('/api/v1/health', (c) =>
  c.json({
    ok: true,
    service: 'genom-api',
    storage: 'cloudflare-d1-r2',
  }),
);

app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route('/api/v1', stylesRoutes);
app.route('/api/v1', uploadRoutes);
app.route('/api/v1', dailyRoutes);
app.route('/api/v1', profilesRoutes);
app.route('/api/v1', paletteTitleRoutes);

app.post('/api/internal/tally-daily-winners', async (c) => {
  const cronSecret = c.req.header('X-Cron-Secret');
  if (cronSecret !== c.env.BETTER_AUTH_SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const today = todayChallengeDateKey();
  const yesterday = yesterdayDateKey(today);
  const result = await tallyDailyWinners(c.env.DB, yesterday);
  return c.json(result);
});

app.get('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      fetch(new URL('/api/internal/tally-daily-winners', env.BETTER_AUTH_URL), {
        method: 'POST',
        headers: { 'X-Cron-Secret': env.BETTER_AUTH_SECRET },
      }),
    );
  },
} satisfies ExportedHandler<Env>;
