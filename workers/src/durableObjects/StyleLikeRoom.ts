/**
 * Per-style WebSocket room for broadcasting like_count updates.
 * Authoritative count always lives in D1; this DO only fans out notifications.
 */
export class StyleLikeRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.endsWith('/broadcast')) {
      let body = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const likeCount = Math.max(0, Number(body.likeCount) || 0);
      this.broadcast({ type: 'like_count', likeCount });
      return Response.json({ ok: true, clients: this.state.getWebSockets().length });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const styleId = url.searchParams.get('styleId') || '';
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);

    try {
      if (styleId && this.env.DB) {
        const row = await this.env.DB.prepare(
          `SELECT like_count FROM styles WHERE id = ? AND is_public = 1`,
        )
          .bind(styleId)
          .first();
        if (row && typeof row.like_count === 'number') {
          server.send(JSON.stringify({ type: 'like_count', likeCount: row.like_count }));
        }
      }
    } catch {
      /* ignore */
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const msg = typeof message === 'string' ? JSON.parse(message) : null;
      if (msg?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      /* ignore */
    }
  }

  async webSocketClose() {
    /* hibernation API tracks sockets; nothing to clean up */
  }

  async webSocketError() {
    /* ignore */
  }

  broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        /* ignore closed sockets */
      }
    }
  }
}
