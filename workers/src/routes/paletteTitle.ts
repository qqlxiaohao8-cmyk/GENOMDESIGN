import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { generatePaletteTitleWithAi, type GenerateTitleInput } from '../lib/paletteTitleAi';
import { requireUser } from '../middleware/session';

type Env = WorkerEnv & { AI?: Ai };

const paletteTitle = new Hono<{ Bindings: Env }>();

paletteTitle.post('/palette/generate-title', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;

  if (!c.env.AI) {
    return c.json({ error: 'ai_unavailable' }, 503);
  }

  let body: GenerateTitleInput;
  try {
    body = await c.req.json<GenerateTitleInput>();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const colors = Array.isArray(body?.colors) ? body.colors : [];
  if (colors.length < 2) {
    return c.json({ error: 'need_at_least_two_colors' }, 400);
  }

  try {
    const title = await generatePaletteTitleWithAi(c.env.AI, {
      colors,
      tags: Array.isArray(body.tags) ? body.tags : [],
      paletteMeta: body.paletteMeta && typeof body.paletteMeta === 'object' ? body.paletteMeta : {},
      excludeTitles: Array.isArray(body.excludeTitles) ? body.excludeTitles : [],
      currentTitle: body.currentTitle,
    });

    if (!title) {
      return c.json({ error: 'generation_failed' }, 422);
    }

    return c.json({ data: { title } });
  } catch (err) {
    console.error('[palette/generate-title]', err);
    return c.json({ error: 'ai_error' }, 502);
  }
});

export default paletteTitle;
