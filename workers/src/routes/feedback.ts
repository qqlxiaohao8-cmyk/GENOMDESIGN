import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { getSessionUser } from '../middleware/session';
import { sendFeedbackEmail } from '../lib/sendFeedbackEmail';

type Env = WorkerEnv;

const MAX_LEN = 2000;
const recent = new Map<string, number>();

function clientKey(c: { req: { header: (name: string) => string | undefined } }) {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'anon';
}

const feedback = new Hono<{ Bindings: Env }>();

feedback.post('/feedback', async (c) => {
  const now = Date.now();
  const key = clientKey(c);
  const last = recent.get(key) || 0;
  if (now - last < 8000) {
    return c.json({ error: 'too_fast' }, 429);
  }

  let body: { message?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const message = String(body?.message || '').replace(/\r/g, '').trim();
  if (!message) return c.json({ error: 'empty' }, 400);
  if (message.length > MAX_LEN) return c.json({ error: 'too_long' }, 400);

  const user = await getSessionUser(c);
  const fromUser = user
    ? [user.username, user.email].filter(Boolean).join(' · ')
    : '';

  try {
    const sent = await sendFeedbackEmail(c.env, message, { fromUser });
    if (!sent) return c.json({ error: 'unavailable' }, 503);
    recent.set(key, now);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'send_failed' }, 502);
  }
});

export default feedback;
