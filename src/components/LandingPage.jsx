import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDailyPalette } from '../lib/dailyPalette';
import { ChevronDown } from 'lucide-react';
import logoSekong2 from '../../色空2.png';

const STONE_INTRO_SRC = '/sekong-stone-intro.mp4';

const BRUSH_RADIUS = 52;
const BRUSH_JITTER = 28;
const SPAWN_THROTTLE_MS = 10;
const HEAL_ALPHA = 0.005;

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function InkRevealCanvas() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const brushImg = useRef(null);

  useEffect(() => {
    const bCanvas = document.createElement('canvas');
    const size = (BRUSH_RADIUS + BRUSH_JITTER) * 2 + 8;
    bCanvas.width = size;
    bCanvas.height = size;
    const bCtx = bCanvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;
    const grad = bCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.52)');
    grad.addColorStop(0.78, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    bCtx.fill();
    brushImg.current = bCanvas;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.parentElement.clientWidth;
      h = canvas.parentElement.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${HEAL_ALPHA})`;
      ctx.fillRect(0, 0, w, h);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stamp = useCallback((cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas || !brushImg.current) return;
    const ctx = canvas.getContext('2d');
    const r = BRUSH_RADIUS + Math.random() * BRUSH_JITTER;
    const size = r * 2;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(brushImg.current, cx - r, cy - r, size, size);
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const now = performance.now();
      if (now - lastSpawnRef.current < SPAWN_THROTTLE_MS) return;
      lastSpawnRef.current = now;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      stamp(x, y);
      if (Math.random() < 0.65) stamp(x + (Math.random() - 0.5) * 48, y + (Math.random() - 0.5) * 48);
      if (Math.random() < 0.35) stamp(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80);
    },
    [stamp]
  );

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[2] touch-none"
      onPointerMove={onPointerMove}
    />
  );
}

function DailyColorSvg({ fill }) {
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    fetch('/zhuri-guanse.svg')
      .then((r) => r.text())
      .then((text) => {
        const colored = text
          .replace(/fill="#000000"/g, `fill="${fill}"`)
          .replace(/width="[^"]*pt"/, 'width="100%"')
          .replace(/height="[^"]*pt"/, 'height="auto"');
        setSvgMarkup(colored);
      })
      .catch(() => {});
  }, [fill]);

  if (!svgMarkup) return <div className="w-full aspect-[2/3]" />;

  return (
    <div
      className="w-full select-none"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

function DailyColorSection() {
  const daily = useMemo(() => getDailyPalette(new Date()), []);
  const color = daily.colors?.[0];
  const hex = color?.hex || '#888888';
  const name = color?.name || '今日之色';
  const quote = daily.quote;

  const svgStyle = useMemo(() => ({ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.10))' }), []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url(/kongsheng-mist-ink.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden />

      <p className="relative z-10 mb-8 text-[10px] font-extralight uppercase tracking-[0.35em] text-zen-ink/40">
        逐日观色 · Color of the Day
      </p>

      {/* 逐日观色 SVG filled with today's color */}
      <div className="relative z-10 w-64 sm:w-80 lg:w-[400px] transition-transform duration-500 hover:scale-[1.02]" style={svgStyle}>
        <DailyColorSvg fill={hex} />
      </div>

      <p className="relative z-10 mt-6 text-2xl sm:text-3xl font-light tracking-[0.2em] text-zen-ink/80">
        {name}
      </p>
      <p className="relative z-10 mt-2 text-[11px] font-extralight tracking-[0.18em] text-zen-ink/50">
        {hex} · {daily.dateKey}
      </p>

      {quote && (
        <div className="relative z-10 mt-10 max-w-md text-center">
          <p className="text-sm font-extralight leading-relaxed text-zen-ink/70 italic">
            「{quote.zh}」
          </p>
          <p className="mt-1 text-[10px] font-extralight text-zen-ink/40">
            — {quote.zhSource}
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Mobile ink-wash intro — white canvas erased by brush stamps that spread
 * UPWARD from man-on-stone's center. Below the origin stays mostly white
 * with only soft corner fade-out. Screen edges also get ink fade-out vignette.
 * ~2.8s then auto-enters 色海.
 */
function MobileInkIntro({ onDone }) {
  const [phase, setPhase] = useState('idle');
  const canvasRef = useRef(null);
  const brushRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const size = (BRUSH_RADIUS + BRUSH_JITTER) * 2 + 8;
    const bc = document.createElement('canvas');
    bc.width = size;
    bc.height = size;
    const bx = bc.getContext('2d');
    const cx = size / 2;
    const r = size / 2 - 2;
    const grad = bx.createRadialGradient(cx, cx, 0, cx, cx, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.52)');
    grad.addColorStop(0.78, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = grad;
    bx.beginPath();
    bx.arc(cx, cx, r, 0, Math.PI * 2);
    bx.fill();
    brushRef.current = bc;
    setPhase('running');
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const canvas = canvasRef.current;
    const brush = brushRef.current;
    if (!canvas || !brush) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    /* Origin: center of the man-on-stone figure (bottom-right area) */
    const ox = w * 0.72;
    const oy = h * 0.62;
    const maxUpDrift = h * 1.2;

    const DURATION = 2800;
    const FADE_START = 0.72;
    const start = performance.now();

    const stamp = (cx, cy) => {
      const r = BRUSH_RADIUS + Math.random() * BRUSH_JITTER;
      const size = r * 2;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(brush, cx - r, cy - r, size, size);
    };

    const draw = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / DURATION, 1);

      const spread = maxUpDrift * (t * t);
      const stampsPerFrame = Math.floor(3 + t * 10);

      for (let i = 0; i < stampsPerFrame; i++) {
        /*
         * Angle biased upward: -π to 0 is the upper hemisphere.
         * Allow slight bleed to the sides but NOT downward.
         * Range: -π ± 0.35 (about 220° arc spanning upward + sides)
         */
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
        const dist = Math.random() * spread;
        const sx = ox + Math.cos(angle) * dist * (0.9 + Math.random() * 0.3);
        const sy = oy + Math.sin(angle) * dist;
        stamp(sx, sy);
        if (Math.random() < 0.55) {
          stamp(
            sx + (Math.random() - 0.5) * 55,
            sy + (Math.random() - 0.5) * 40
          );
        }
      }

      /* Gentle corner/edge fade-out below origin: sparse light stamps */
      if (t > 0.3 && t < 0.85) {
        const edgeCount = Math.floor(1 + t * 3);
        for (let i = 0; i < edgeCount; i++) {
          const ex = Math.random() * w;
          const ey = oy + Math.random() * (h - oy) * 0.7;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = 0.06 + Math.random() * 0.1;
          ctx.drawImage(
            brush,
            ex - BRUSH_RADIUS,
            ey - BRUSH_RADIUS,
            BRUSH_RADIUS * 2,
            BRUSH_RADIUS * 2
          );
          ctx.globalAlpha = 1;
        }
      }

      /* Fade remaining white into the scene for a natural finish */
      if (t > FADE_START) {
        const fadeT = (t - FADE_START) / (1 - FADE_START);
        canvas.style.opacity = String(1 - fadeT * fadeT);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        setPhase('done');
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(onDone, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[5]"
      style={{ pointerEvents: 'none' }}
    />
  );
}

/** Desktop: play stone intro video, hold last frame, then click to enter. */
function DesktopStoneIntro({ onGoExplore }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [desktopLeaving, setDesktopLeaving] = useState(false);

  const holdLastFrame = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      v.pause();
      v.currentTime = Math.max(0, v.duration - 0.05);
    }
    setPhase('ended');
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const startPlayback = () => {
      if (reduced) {
        holdLastFrame();
        return;
      }
      setPhase('playing');
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => holdLastFrame());
      });
    };

    if (v.readyState >= 1) startPlayback();
    else v.addEventListener('loadedmetadata', startPlayback, { once: true });

    return () => v.removeEventListener('loadedmetadata', startPlayback);
  }, [holdLastFrame]);

  const handleEnter = useCallback(() => {
    if (phase !== 'ended' || desktopLeaving) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onGoExplore();
      return;
    }
    setDesktopLeaving(true);
  }, [phase, desktopLeaving, onGoExplore]);

  useEffect(() => {
    if (!desktopLeaving) return undefined;
    const timer = window.setTimeout(onGoExplore, 720);
    return () => window.clearTimeout(timer);
  }, [desktopLeaving, onGoExplore]);

  return (
    <div
      className={`landing-page-shell fixed inset-0 z-[300] flex bg-black ${phase === 'ended' ? 'cursor-pointer' : 'cursor-default'} ${desktopLeaving ? 'is-leaving' : ''}`}
      onClick={handleEnter}
      onKeyDown={(e) => {
        if (phase !== 'ended') return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleEnter();
        }
      }}
      role={phase === 'ended' ? 'button' : 'presentation'}
      tabIndex={phase === 'ended' ? 0 : -1}
      aria-label={phase === 'ended' ? '进入色空' : undefined}
    >
      <video
        ref={videoRef}
        src={STONE_INTRO_SRC}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        preload="auto"
        muted={false}
        onEnded={holdLastFrame}
      />

      {phase === 'ended' && !desktopLeaving && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex justify-center md:bottom-14">
          <p className="landing-enter-hint text-sm font-extralight tracking-[0.35em] text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            点击屏幕进入
          </p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage({ onGoExplore }) {
  const isMobile = useIsMobile();
  const [mobileAnimDone, setMobileAnimDone] = useState(false);

  const handleMobileAnimDone = useCallback(() => {
    setMobileAnimDone(true);
    onGoExplore();
  }, [onGoExplore]);

  /* ── Mobile: main-page.png underneath, man-on-stone + logo visible,
       white canvas on top slowly erased by brush stamps ── */
  if (isMobile) {
    return (
      <div className="relative flex h-screen max-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-white">
        {/* Background: main-page.png (revealed as white is erased) */}
        <img
          src="/main-page.png"
          alt=""
          draggable={false}
          className="absolute inset-0 z-[1] h-full w-full object-cover select-none"
        />
        {/* Edge vignette: ink fade-out at all screen borders */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: [
              'linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, transparent 18%)',
              'linear-gradient(to top, rgba(255,255,255,0.7) 0%, transparent 14%)',
              'linear-gradient(to right, rgba(255,255,255,0.75) 0%, transparent 12%)',
              'linear-gradient(to left, rgba(255,255,255,0.75) 0%, transparent 12%)',
            ].join(', '),
          }}
          aria-hidden
        />
        {/* Corner fade-out vignette for natural ink bleed at corners */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 110% 100% at 50% 40%, transparent 40%, rgba(255,255,255,0.25) 60%, rgba(255,255,255,0.6) 78%, #fff 100%)',
          }}
          aria-hidden
        />

        {/* man-on-stone — 3× enlarged, anchored bottom-right */}
        <div className="absolute bottom-0 right-0 z-[3] w-[165vw] translate-x-[22%] translate-y-[8%]">
          <img
            src="/man-on-stone.png"
            alt=""
            draggable={false}
            className="block w-full h-auto object-contain object-right-bottom opacity-70 select-none"
          />
        </div>

        {/* Logo centered */}
        <img
          src={logoSekong2}
          alt="色空"
          draggable={false}
          className="relative z-[6] h-24 w-auto object-contain select-none animate-float"
        />

        {/* White canvas overlay — brush stamps erase it to reveal the scene */}
        {!mobileAnimDone && (
          <MobileInkIntro onDone={handleMobileAnimDone} />
        )}
      </div>
    );
  }

  /* ── Desktop: stone intro video → last frame → click to enter ── */
  return <DesktopStoneIntro onGoExplore={onGoExplore} />;
}
