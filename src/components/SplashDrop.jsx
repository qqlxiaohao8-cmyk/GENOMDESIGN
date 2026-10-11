import React, { useCallback, useEffect, useRef, useState } from 'react';
import { pickReadableTextOnHex } from '../lib/colorValues';

const INTRO_SRC = '/sekong-ink-intro.mp4';
const INTRO_POSTER = '/sekong-ink-intro-poster.png';
const FALL_MS = 560;
const SPREAD_MS = 780;
const REVEAL_MS = 520;
const FAILSAFE_MS = 10000;
const LINK_BEFORE_END = 0.45;

/**
 * 色空视频 → 收成墨滴落下 → 散开成「我的」色块（或登录卡片）→ 露出首页。
 */
export default function SplashDrop({
  ready = false,
  user = null,
  accentHex = '#2C2C2C',
  username = '',
  onLanded,
  onNeedLogin,
}) {
  const videoRef = useRef(null);
  const linkedRef = useRef(false);
  const pendingRef = useRef(false);
  const [phase, setPhase] = useState('play');

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const beginHandoff = useCallback(() => {
    if (linkedRef.current) return;
    if (!ready) {
      pendingRef.current = true;
      return;
    }
    linkedRef.current = true;

    if (reduceMotion) {
      if (user) onLanded?.();
      else onNeedLogin?.();
      return;
    }

    setPhase('fall');
    window.setTimeout(() => setPhase('spread'), FALL_MS);
    window.setTimeout(() => {
      if (user) {
        setPhase('reveal');
        window.setTimeout(() => onLanded?.(), REVEAL_MS);
      } else {
        onNeedLogin?.();
      }
    }, FALL_MS + SPREAD_MS);
  }, [ready, user, reduceMotion, onLanded, onNeedLogin]);

  const beginRef = useRef(beginHandoff);
  beginRef.current = beginHandoff;

  useEffect(() => {
    if (ready && pendingRef.current) {
      pendingRef.current = false;
      beginHandoff();
    }
  }, [ready, beginHandoff]);

  useEffect(() => {
    if (reduceMotion) {
      if (ready) beginRef.current();
      return undefined;
    }

    const video = videoRef.current;
    const play = () => {
      if (!video) return;
      video.muted = true;
      video.play().catch(() => {});
    };

    const onTime = () => {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.duration - video.currentTime <= LINK_BEFORE_END) {
        beginRef.current();
      }
    };

    if (video) {
      if (video.readyState >= 2) play();
      else video.addEventListener('canplay', play, { once: true });
      video.addEventListener('timeupdate', onTime);
    }

    const failsafe = window.setTimeout(() => beginRef.current(), FAILSAFE_MS);
    return () => {
      video?.removeEventListener('canplay', play);
      video?.removeEventListener('timeupdate', onTime);
      window.clearTimeout(failsafe);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  const ink = user ? accentHex : '#1C1C1C';
  const text = pickReadableTextOnHex(ink);
  const dropClass = [
    'heytea-ink-drop',
    `is-${phase}`,
    !user && (phase === 'spread' || phase === 'reveal') ? 'is-flip' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`heytea-splash is-${phase}`}
      role="dialog"
      aria-label="色空开场"
    >
      <video
        ref={videoRef}
        className="heytea-splash-video"
        src={INTRO_SRC}
        poster={INTRO_POSTER}
        muted
        playsInline
        preload="auto"
        autoPlay
        onEnded={() => beginRef.current()}
        onError={() => beginRef.current()}
      />

      {phase !== 'play' && (
        <div className={`heytea-ink-spread-field ${!user ? 'is-center' : ''}`} aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )}

      <div
        className={dropClass}
        style={{ background: phase === 'play' || phase === 'fall' ? '#1C1C1C' : ink }}
      >
        {user && (phase === 'spread' || phase === 'reveal') ? (
          <>
            <span className="heytea-ink-kicker" style={{ color: text }}>我的</span>
            <span className="heytea-ink-name" style={{ color: text }}>{username}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
