import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiClient';

const WS_RECONNECT_MS = 2500;
const POLL_FALLBACK_MS = 45000;

function wsUrlForStyle(styleId) {
  if (typeof window === 'undefined' || !styleId) return null;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/v1/styles/${encodeURIComponent(styleId)}/likes/ws`;
}

/**
 * Live like/favorite count for a public style.
 * Prefers WebSocket from StyleLikeRoom; falls back to polling GET /styles/:id.
 *
 * @param {string|null} styleId public style id
 * @param {{ initialCount?: number, onUpdate?: (styleId: string, count: number) => void }} [opts]
 */
export function useStyleLikeCount(styleId, opts = {}) {
  const { initialCount = 0, onUpdate } = opts;
  const [likeCount, setLikeCount] = useState(() => Math.max(0, Number(initialCount) || 0));
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const styleIdRef = useRef(styleId);
  styleIdRef.current = styleId;

  const applyCount = useCallback((count) => {
    const n = Math.max(0, Number(count) || 0);
    setLikeCount(n);
    const id = styleIdRef.current;
    if (id) onUpdateRef.current?.(id, n);
  }, []);

  useEffect(() => {
    setLikeCount(Math.max(0, Number(initialCount) || 0));
  }, [styleId, initialCount]);

  useEffect(() => {
    if (!styleId) return undefined;

    let cancelled = false;
    let ws = null;
    let reconnectTimer = null;
    let pollTimer = null;
    let usingWs = false;

    const fetchOnce = async () => {
      try {
        const res = await apiFetch(`/styles/${styleId}`);
        if (cancelled) return;
        if (typeof res?.data?.like_count === 'number') {
          applyCount(res.data.like_count);
        }
      } catch {
        /* ignore */
      }
    };

    const startPoll = () => {
      if (pollTimer) return;
      void fetchOnce();
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void fetchOnce();
      }, POLL_FALLBACK_MS);
    };

    const stopPoll = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectWs = () => {
      const url = wsUrlForStyle(styleId);
      if (!url) {
        startPoll();
        return;
      }
      try {
        ws = new WebSocket(url);
      } catch {
        startPoll();
        return;
      }

      ws.onopen = () => {
        usingWs = true;
        stopPoll();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'like_count' && typeof msg.likeCount === 'number') {
            applyCount(msg.likeCount);
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        /* onclose handles reconnect */
      };

      ws.onclose = () => {
        usingWs = false;
        ws = null;
        if (cancelled) return;
        startPoll();
        reconnectTimer = window.setTimeout(() => {
          if (!cancelled) connectWs();
        }, WS_RECONNECT_MS);
      };
    };

    const onVis = () => {
      if (document.visibilityState === 'visible' && !usingWs) {
        void fetchOnce();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    connectWs();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      stopPoll();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [styleId, applyCount]);

  return { likeCount };
}
