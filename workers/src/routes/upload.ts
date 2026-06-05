import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { requireUser } from '../middleware/session';

type Env = WorkerEnv & { STYLE_IMAGES: R2Bucket };

const upload = new Hono<{ Bindings: Env }>();

function parseDataUrl(dataUrl: string) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1];
  const bytes = Uint8Array.from(atob(m[2]), (ch) => ch.charCodeAt(0));
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg';
  return { contentType, bytes, ext };
}

upload.post('/upload', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;

  const body = await c.req.json<{ dataUrl?: string }>();
  if (!body.dataUrl) return c.json({ error: 'dataUrl required' }, 400);

  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) return c.json({ error: 'invalid image dataUrl' }, 400);

  const key = `${user.id}/${crypto.randomUUID()}.${parsed.ext}`;
  await c.env.STYLE_IMAGES.put(key, parsed.bytes, {
    httpMetadata: { contentType: parsed.contentType },
  });

  const publicUrl = `/api/v1/media/${key}`;
  return c.json({ publicUrl, key }, 201);
});

upload.get('/media/*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/^\/api\/v1\/media\//, '');
  if (!path) return c.json({ error: 'not found' }, 404);
  const object = await c.env.STYLE_IMAGES.get(path);
  if (!object) return c.json({ error: 'not found' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

export default upload;
