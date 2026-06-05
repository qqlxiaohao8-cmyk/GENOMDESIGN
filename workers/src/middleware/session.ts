import type { Context } from 'hono';
import { createAuth, type WorkerEnv } from '../auth';

export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  username?: string | null;
  accent_hex?: string | null;
  font_id?: string | null;
  profile_complete?: boolean | null;
};

type Env = WorkerEnv & { ASSETS?: Fetcher; STYLE_IMAGES?: R2Bucket };

export async function getSessionUser(c: Context<{ Bindings: Env }>): Promise<AppUser | null> {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user;
  if (!user?.id) return null;
  return user as AppUser;
}

export async function requireUser(c: Context<{ Bindings: Env }>): Promise<AppUser | Response> {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  return user;
}
