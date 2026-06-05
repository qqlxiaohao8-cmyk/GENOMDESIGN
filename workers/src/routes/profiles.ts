import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { syncProfileFromUser } from '../lib/profiles';
import { requireUser } from '../middleware/session';

type Env = WorkerEnv;

const profiles = new Hono<{ Bindings: Env }>();

profiles.post('/profiles/sync', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await syncProfileFromUser(c.env.DB, user);
  return c.json({ ok: true });
});

export default profiles;
