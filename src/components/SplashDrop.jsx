import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoginFlipPrompt from './LoginFlipPrompt';

const INTRO_SRC = '/sekong-ink-intro.mp4?v=rev2';
const INTRO_POSTER = '/sekong-ink-intro-poster.png?v=rev2';
const HANDOFF_EARLIEST_AT = 1.72;
const HANDOFF_FALLBACK_AT = 1.86;
const LAND_HOLD_MS = 16;
const SPREAD_MS = 780;
const HERO_BLOOM_MS = 1180;
const REVEAL_MS = 160;
const FAILSAFE_MS = 10000;
const PLAYBACK_RATE = 1;
const HERO_HEIGHT = 180;
const INK_WATCH_W = 90;
const INK_WATCH_H = 160;
const INK_MIN_SAMPLES = 8;
const HEADER_REACH_SLACK = 22;

function readHomeHeaderBox() {
  const el = document.querySelector('.home-sticky') || document.querySelector('[data-mine-hero]');
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width > 40 && r.height > 40) {
      return {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        color: getComputedStyle(el).backgroundColor,
        radius: getComputedStyle(el).borderRadius,
      };
    }
  }
  const main = document.querySelector('main');
  const mr = main?.getBoundingClientRect();
  return {
    left: mr?.left ?? 0,
    top: mr?.top ?? 0,
    width: Math.max(160, mr?.width ?? window.innerWidth),
    height: HERO_HEIGHT,
    color: '',
    radius: '0px',
  };
}

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

let inkWatchCanvas = null;

function getInkWatchCanvas() {
  if (!inkWatchCanvas || inkWatchCanvas.width !== INK_WATCH_W || inkWatchCanvas.height !== INK_WATCH_H) {
    inkWatchCanvas = document.createElement('canvas');
    inkWatchCanvas.width = INK_WATCH_W;
    inkWatchCanvas.height = INK_WATCH_H;
  }
  return inkWatchCanvas;
}

/** 取画面里整团墨（「色空」字），不是落地后的雨滴。 */
function findInkInFrame(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const canvas = getInkWatchCanvas();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, INK_WATCH_W, INK_WATCH_H);
  const { data } = ctx.getImageData(0, 0, INK_WATCH_W, INK_WATCH_H);

  let sx = 0;
  let sy = 0;
  let n = 0;
  let minX = INK_WATCH_W;
  let maxX = 0;
  let minY = INK_WATCH_H;
  let maxY = 0;
  for (let y = 0; y < INK_WATCH_H; y += 1) {
    for (let x = 0; x < INK_WATCH_W; x += 1) {
      const i = (y * INK_WATCH_W + x) * 4;
      const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      if (lum > 108) continue;
      n += 1;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (n < 8) return null;

  const mapped = mapToViewport(
    video,
    vw,
    vh,
    (sx / n) * (vw / INK_WATCH_W),
    (sy / n) * (vh / INK_WATCH_H),
    (maxX - minX) * (vw / INK_WATCH_W),
    (maxY - minY) * (vh / INK_WATCH_H),
  );
  return { ...mapped, samples: n };
}

function inkReachedHeader(ink, header) {
  if (!ink || !header) return false;
  if (ink.samples < INK_MIN_SAMPLES) return false;
  const inkTop = ink.y - ink.h / 2;
  return inkTop <= header.top + header.height + HEADER_REACH_SLACK;
}

/**
 * 开场是倒放后压到 1.9 秒的墨迹。播完再交给顶栏。
 * 未登录则展成登录框。
 */
export default function SplashDrop({
  ready = false,
  user = null,
  landOnHero = false,
  accentHex = '#2C2C2C',
  startAtLogin = false,
  onLanded,
  onNeedLogin,
  onSkip,
  onAuthed,
}) {
  const videoRef = useRef(null);
  const linkedRef = useRef(false);
  const pendingRef = useRef(false);
  const pendingLandRef = useRef(null);
  const timersRef = useRef([]);
  const [phase, setPhase] = useState(startAtLogin ? 'login' : 'play');
  const [land, setLand] = useState(null);
  const [heroBox, setHeroBox] = useState(null);
  const [heroBloom, setHeroBloom] = useState(false);
  const toHero = Boolean((user || landOnHero) && !startAtLogin);

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

  const beginHandoff = useCallback((presetLand, force = false) => {
    if (linkedRef.current) return;
    const video = videoRef.current;
    const videoFinished = !video || video.ended || (
      Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration - 0.05
    );
    const hardError = Boolean(video?.error && video.error.code !== 1);
    if (!force && video && !videoFinished && !hardError) return;
    if (toHero && (videoFinished || force)) {
      if (!ready) {
        pendingRef.current = true;
        return;
      }
      linkedRef.current = true;
      if (video) video.pause();
      onLanded?.();
      return;
    }
    const landAt = presetLand || pendingLandRef.current || (video ? findInkInFrame(video) : null) || fallbackDrop(video);
    if (video) video.pause();
    pendingLandRef.current = landAt;
    if (!ready) {
      pendingRef.current = true;
      return;
    }
    linkedRef.current = true;
    setLand(landAt);

    const captureHero = () => setHeroBox(readHomeHeaderBox());
    captureHero();
    requestAnimationFrame(captureHero);

    if (reduceMotion) {
      if (toHero) onLanded?.();
      else {
        setPhase('login');
        onNeedLogin?.();
      }
      return;
    }

    setPhase('land');
    later(() => setPhase('spread'), LAND_HOLD_MS);
    later(() => {
      if (toHero) {
        setPhase('reveal');
        later(() => onLanded?.(), REVEAL_MS);
      } else {
        setPhase('login');
        onNeedLogin?.();
      }
    }, LAND_HOLD_MS + (toHero ? HERO_BLOOM_MS : SPREAD_MS));
  }, [ready, toHero, reduceMotion, onLanded, onNeedLogin]);

  const beginRef = useRef(beginHandoff);
  beginRef.current = beginHandoff;

  useEffect(() => {
    if (!toHero || (phase !== 'spread' && phase !== 'reveal')) {
      setHeroBloom(false);
      return undefined;
    }
    if (phase !== 'spread') return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeroBloom(true));
    });
    return () => cancelAnimationFrame(id);
  }, [phase, toHero]);

  useEffect(() => {
    if (ready && pendingRef.current) {
      pendingRef.current = false;
      beginHandoff();
    }
  }, [ready, beginHandoff]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (startAtLogin) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    const keepRate = () => applySpeed(video);
    const play = () => {
      if (linkedRef.current || video.ended) return;
      applySpeed(video);
      video.muted = true;
      const start = video.play();
      if (start && typeof start.then === 'function') {
        start.then(() => applySpeed(video)).catch(() => {});
      }
    };

    video.muted = true;
    applySpeed(video);
    play();

    video.addEventListener('loadedmetadata', keepRate);
    video.addEventListener('canplay', play);
    video.addEventListener('playing', keepRate);
    video.addEventListener('ratechange', keepRate);
    const failsafe = window.setTimeout(() => beginRef.current(undefined, true), FAILSAFE_MS);
    return () => {
      video.removeEventListener('loadedmetadata', keepRate);
      video.removeEventListener('canplay', play);
      video.removeEventListener('playing', keepRate);
      video.removeEventListener('ratechange', keepRate);
      window.clearTimeout(failsafe);
    };
  }, [startAtLogin]);

  const heroRect = heroBox || (toHero ? readHomeHeaderBox() : null);
  const ink = toHero ? (heroRect?.color || accentHex) : '#1C1C1C';
  const dropClass = [
    'heytea-ink-drop',
    `is-${phase === 'login' ? 'spread' : phase}`,
    !toHero && phase !== 'play' ? 'is-flip' : '',
    phase === 'login' ? 'is-login' : '',
    toHero && phase !== 'play' ? 'is-hero' : '',
    toHero && heroBloom && (phase === 'spread' || phase === 'reveal') ? 'is-bloom' : '',
  ].filter(Boolean).join(' ');

  const landStyle = phase === 'land' && land
    ? {
        left: `${land.x - land.w / 2}px`,
        top: `${land.y - land.h / 2}px`,
        width: `${land.w}px`,
        height: `${land.h}px`,
        background: '#1C1C1C',
      }
    : (phase === 'spread' || phase === 'reveal') && toHero && heroRect
      ? {
          left: `${heroRect.left}px`,
          top: `${heroRect.top}px`,
          width: `${heroRect.width}px`,
          height: `${heroRect.height}px`,
          background: '#ffffff',
          borderRadius: '0px',
          '--ink-x': land
            ? `${Math.min(heroRect.width - 8, Math.max(8, land.x - heroRect.left))}px`
            : '50%',
          '--ink-y': land
            ? `${Math.min(heroRect.height - 4, Math.max(heroRect.height * 0.72, land.y - heroRect.top))}px`
            : '88%',
        }
      : phase === 'spread' || phase === 'reveal'
        ? { background: '#ffffff' }
        : undefined;

  const showVideo = !startAtLogin && phase !== 'login' && !(phase === 'reveal' && !toHero);
  const showDrop = phase !== 'play';
  const showLogin = !toHero && (phase === 'spread' || phase === 'login');

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
          autoPlay
          playsInline
          preload="auto"
          onEnded={() => beginRef.current()}
          onError={() => beginRef.current()}
        />
      ) : null}

      {showDrop ? (
        <div className={dropClass} style={landStyle}>
          {toHero && (phase === 'spread' || phase === 'reveal') ? (
            <span className="heytea-ink-fill" style={{ color: ink }} />
          ) : null}
          {showLogin ? (
            <LoginFlipPrompt embedded onSkip={onSkip} onAuthed={onAuthed} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
