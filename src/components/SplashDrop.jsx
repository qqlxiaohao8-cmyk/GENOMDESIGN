import React, { useCallback, useEffect, useRef, useState } from 'react';
import { pickReadableTextOnHex } from '../lib/colorValues';
import LoginFlipPrompt from './LoginFlipPrompt';

const INTRO_SRC = '/sekong-ink-intro.mp4';
const INTRO_POSTER = '/sekong-ink-intro-poster.png';
const LAND_HOLD_MS = 200;
const SPREAD_MS = 920;
const REVEAL_MS = 420;
const FAILSAFE_MS = 10000;
const PLAYBACK_RATE = 2.6;

function applySpeed(video) {
  if (!video) return;
  video.defaultPlaybackRate = PLAYBACK_RATE;
  if (video.playbackRate !== PLAYBACK_RATE) {
    video.playbackRate = PLAYBACK_RATE;
  }
}

function mapToViewport(video, vw, vh, cx, cy, bw, bh) {
  const rect = video.getBoundingClientRect();
  const scale = Math.min(rect.width / vw, rect.height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = rect.left + (rect.width - dw) / 2;
  const oy = rect.top + (rect.height - dh) / 2;
  return {
    x: ox + (cx / vw) * dw,
    y: oy + (cy / vh) * dh,
    w: Math.max(16, Math.min(34, bw * scale * 0.72)),
    h: Math.max(20, Math.min(42, bh * scale * 0.72)),
  };
}

function fallbackDrop(video) {
  const rect = video?.getBoundingClientRect();
  if (!rect) return { x: window.innerWidth / 2, y: window.innerHeight * 0.7, w: 22, h: 28 };
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.7,
    w: 22,
    h: 28,
  };
}

/** 取画面最下方的一团墨，避免把「色空」二字当成落点。 */
function findDropInFrame(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return fallbackDrop(video);

  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallbackDrop(video);
  ctx.drawImage(video, 0, 0, vw, vh);
  const { data } = ctx.getImageData(0, 0, vw, vh);

  const step = 2;
  const bins = 24;
  const counts = new Array(bins).fill(0);
  const sums = Array.from({ length: bins }, () => ({
    x: 0, y: 0, n: 0, minX: vw, maxX: 0, minY: vh, maxY: 0,
  }));

  for (let y = 0; y < vh; y += step) {
    for (let x = 0; x < vw; x += step) {
      const i = (y * vw + x) * 4;
      const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      if (lum > 72) continue;
      const b = Math.min(bins - 1, Math.floor((y / vh) * bins));
      counts[b] += 1;
      const s = sums[b];
      s.x += x;
      s.y += y;
      s.n += 1;
      if (x < s.minX) s.minX = x;
      if (x > s.maxX) s.maxX = x;
      if (y < s.minY) s.minY = y;
      if (y > s.maxY) s.maxY = y;
    }
  }

  const total = counts.reduce((a, b) => a + b, 0);
  if (total < 8) return fallbackDrop(video);

  const minBin = Math.max(3, total * 0.012);
  let end = -1;
  for (let b = bins - 1; b >= 0; b -= 1) {
    if (counts[b] >= minBin) {
      end = b;
      break;
    }
  }
  if (end < 0) return fallbackDrop(video);

  let start = end;
  while (start > 0 && counts[start - 1] >= minBin) start -= 1;
  if (end - start >= 8) start = Math.max(start, end - 2);

  let sx = 0;
  let sy = 0;
  let n = 0;
  let minX = vw;
  let maxX = 0;
  let minY = vh;
  let maxY = 0;
  for (let b = start; b <= end; b += 1) {
    const s = sums[b];
    if (!s.n) continue;
    sx += s.x;
    sy += s.y;
    n += s.n;
    if (s.minX < minX) minX = s.minX;
    if (s.maxX > maxX) maxX = s.maxX;
    if (s.minY < minY) minY = s.minY;
    if (s.maxY > maxY) maxY = s.maxY;
  }
  if (n < 6) return fallbackDrop(video);

  return mapToViewport(video, vw, vh, sx / n, sy / n, maxX - minX, maxY - minY);
}

/**
 * 开场视频 2.6 倍速播完（片里已有水滴落下）。
 * 停在最后一帧，从最下方墨滴长成登录框或「我的」色块。
 */
export default function SplashDrop({
  ready = false,
  user = null,
  accentHex = '#2C2C2C',
  username = '',
  startAtLogin = false,
  onLanded,
  onNeedLogin,
  onSkip,
  onAuthed,
}) {
  const videoRef = useRef(null);
  const linkedRef = useRef(false);
  const pendingRef = useRef(false);
  const timersRef = useRef([]);
  const [phase, setPhase] = useState(startAtLogin ? 'login' : 'play');
  const [land, setLand] = useState(null);

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const beginHandoff = useCallback(() => {
    if (linkedRef.current) return;
    if (!ready) {
      pendingRef.current = true;
      return;
    }
    linkedRef.current = true;

    const video = videoRef.current;
    if (video) {
      video.pause();
      setLand(findDropInFrame(video));
    } else {
      setLand(fallbackDrop(null));
    }

    if (reduceMotion) {
      if (user) onLanded?.();
      else {
        setPhase('login');
        onNeedLogin?.();
      }
      return;
    }

    setPhase('land');
    later(() => setPhase('spread'), LAND_HOLD_MS);
    later(() => {
      if (user) {
        setPhase('reveal');
        later(() => onLanded?.(), REVEAL_MS);
      } else {
        setPhase('login');
        onNeedLogin?.();
      }
    }, LAND_HOLD_MS + SPREAD_MS);
  }, [ready, user, reduceMotion, onLanded, onNeedLogin]);

  const beginRef = useRef(beginHandoff);
  beginRef.current = beginHandoff;

  useEffect(() => {
    if (ready && pendingRef.current) {
      pendingRef.current = false;
      beginHandoff();
    }
  }, [ready, beginHandoff]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (startAtLogin) return undefined;
    if (reduceMotion) {
      if (ready) beginRef.current();
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    const keepRate = () => applySpeed(video);
    const play = () => {
      applySpeed(video);
      video.muted = true;
      const start = video.play();
      if (start && typeof start.then === 'function') {
        start.then(() => applySpeed(video)).catch(() => {});
      }
    };

    video.muted = true;
    applySpeed(video);
    video.addEventListener('loadedmetadata', keepRate);
    video.addEventListener('canplay', play, { once: true });
    video.addEventListener('playing', keepRate);
    video.addEventListener('ratechange', keepRate);
    video.addEventListener('timeupdate', keepRate);
    if (video.readyState >= 2) play();

    const failsafe = window.setTimeout(() => beginRef.current(), FAILSAFE_MS);
    return () => {
      video.removeEventListener('loadedmetadata', keepRate);
      video.removeEventListener('canplay', play);
      video.removeEventListener('playing', keepRate);
      video.removeEventListener('ratechange', keepRate);
      video.removeEventListener('timeupdate', keepRate);
      window.clearTimeout(failsafe);
    };
  }, [reduceMotion, ready, startAtLogin]);

  if (reduceMotion && phase !== 'login' && phase !== 'spread' && phase !== 'reveal') {
    return null;
  }

  const ink = user ? accentHex : '#1C1C1C';
  const text = pickReadableTextOnHex(ink);
  const dropClass = [
    'heytea-ink-drop',
    `is-${phase === 'login' ? 'spread' : phase}`,
    !user && phase !== 'play' ? 'is-flip' : '',
    phase === 'login' ? 'is-login' : '',
  ].filter(Boolean).join(' ');

  const landStyle = phase === 'land' && land
    ? {
        left: `${land.x - land.w / 2}px`,
        top: `${land.y - land.h / 2}px`,
        width: `${land.w}px`,
        height: `${land.h}px`,
        background: '#1C1C1C',
      }
    : phase === 'spread' || phase === 'reveal'
      ? { background: user ? ink : '#ffffff' }
      : undefined;

  const showVideo = !startAtLogin && phase !== 'login' && phase !== 'reveal';
  const showDrop = phase !== 'play';
  const showLogin = !user && (phase === 'spread' || phase === 'login');

  return (
    <div
      className={`heytea-splash is-${phase}`}
      role="dialog"
      aria-label="色空开场"
    >
      {showVideo ? (
        <video
          ref={videoRef}
          className="heytea-splash-video"
          src={INTRO_SRC}
          poster={INTRO_POSTER}
          muted
          playsInline
          preload="auto"
          onEnded={() => beginRef.current()}
          onError={() => beginRef.current()}
        />
      ) : null}

      {showDrop ? (
        <div className={dropClass} style={landStyle}>
          {user && (phase === 'spread' || phase === 'reveal') ? (
            <>
              <span className="heytea-ink-kicker" style={{ color: text }}>我的</span>
              <span className="heytea-ink-name" style={{ color: text }}>{username}</span>
            </>
          ) : null}
          {showLogin ? (
            <LoginFlipPrompt embedded onSkip={onSkip} onAuthed={onAuthed} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
