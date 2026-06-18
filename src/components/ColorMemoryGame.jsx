/**
 * 色彩记忆挑战：5 轮色彩感知游戏。
 * phases: idle → countdown → memorize → guess → reveal → (results | next round)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  lchToHexClamped,
  oklabDistSqFromHex,
  hexToOklch,
} from '../lib/oklch';
import { getPoeticColorName } from '../lib/poeticColorNaming';

const TOTAL_ROUNDS = 5;
const MEMORIZE_SECS = 5;
const COUNTDOWN_MESSAGES = ['准备好了吗？', '预备……', '开始！'];

// ── Color utilities ─────────────────────────────────────────────────────

function randomGameHex() {
  const h = Math.random() * 360;
  const L = 0.30 + Math.random() * 0.48;
  const C = 0.07 + Math.random() * 0.15;
  return lchToHexClamped(L, C, h);
}

function hsbToHex(h, s, b) {
  const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return b - b * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const r = clampByte(f(5) * 255);
  const g = clampByte(f(3) * 255);
  const bv = clampByte(f(1) * 255);
  const c = (x) => x.toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(bv)}`.toUpperCase();
}

function hexToHsb(hex) {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let hue = 0;
  if (diff > 0) {
    if (max === r) hue = ((g - b) / diff) % 6;
    else if (max === g) hue = (b - r) / diff + 2;
    else hue = (r - g) / diff + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return {
    h: Math.round(hue),
    s: max === 0 ? 0 : diff / max,
    b: max,
  };
}

/** luminance-based adaptive text color */
function adaptiveTextHex(bgHex) {
  if (!bgHex || bgHex === '#000000') return '#FFFFFF';
  const { l } = hexToOklch(bgHex);
  return l > 0.55 ? '#000000' : '#FFFFFF';
}

/** 0-10 perceptual accuracy score */
function calcScore(guessHex, targetHex) {
  const distSq = oklabDistSqFromHex(guessHex, targetHex);
  const dist = Math.sqrt(distSq);
  const raw = 10 * Math.pow(Math.max(0, 1 - dist / 0.35), 2);
  return Math.max(0.01, Math.min(10, raw));
}

function totalDescription(total) {
  if (total >= 45) return '五个颜色，你记住了每一个。';
  if (total >= 38) return '你对色彩有相当的感知力。';
  if (total >= 28) return '我们展示了五个颜色，你记住了其中一些。';
  if (total >= 15) return '我们展示了五个颜色，你没有很好地记住它们。';
  return '我们展示了五个颜色，你几乎没有记住任何一个。';
}

// ── Sub-components ──────────────────────────────────────────────────────

const GAME_NUM_CLASS = 'font-zenSerif font-medium tabular-nums leading-none';

/**
 * 连续滚动的数字动画（rAF，无帧间停顿）。
 * - continuous: 到达目标后仍保持轻微波动（用于倒计时）
 * - initialFrom: 挂载时从该值滚向 value（用于评分揭示）
 */
function FlipNumber({
  value,
  decimals = 2,
  duration = 520,
  initialFrom,
  continuous = false,
  className = '',
}) {
  const displayedRef = useRef(initialFrom ?? value);
  const [displayed, setDisplayed] = useState(initialFrom ?? value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = displayedRef.current;
    const target = value;
    const start = performance.now();
    const span = Math.max(Math.abs(target - from), 0.08);

    const loop = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - t) ** 3;

      let next;
      if (t < 1) {
        const base = from + (target - from) * eased;
        const damp = 1 - eased;
        const w1 = Math.sin(now * 0.019) * span * 0.38 * damp;
        const w2 = Math.sin(now * 0.033 + 1.1) * span * 0.2 * damp;
        const w3 = Math.sin(now * 0.055 + 2.3) * span * 0.09 * damp;
        next = base + w1 + w2 + w3;
      } else if (continuous) {
        const w1 = Math.sin(now * 0.022) * span * 0.07;
        const w2 = Math.sin(now * 0.041 + 0.9) * span * 0.04;
        const w3 = Math.sin(now * 0.063 + 1.7) * span * 0.025;
        next = target + w1 + w2 + w3;
      } else {
        next = target;
        displayedRef.current = next;
        setDisplayed(next);
        return;
      }

      next = Math.max(0, next);
      displayedRef.current = next;
      setDisplayed(next);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, continuous]);

  return (
    <span className={`${GAME_NUM_CLASS} ${className}`}>
      {displayed.toFixed(decimals)}
    </span>
  );
}

/**
 * Vertical gradient slider with draggable white-circle thumb.
 * top = max value, bottom = min value.
 */
function VerticalSlider({ label, value, min, max, gradient, height = 140, onChange }) {
  const trackRef = useRef(null);

  const applyY = useCallback((clientY) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    onChange(min + pct * (max - min));
  }, [min, max, onChange]);

  const onMouseDown = (e) => {
    e.preventDefault();
    applyY(e.clientY);
    const onMove = (ev) => applyY(ev.clientY);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onTouchStart = (e) => {
    applyY(e.touches[0].clientY);
    const onMove = (ev) => applyY(ev.touches[0].clientY);
    const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  const pct = (value - min) / (max - min);
  const thumbTop = `${(1 - pct) * 100}%`;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div
        ref={trackRef}
        className="relative rounded-full cursor-pointer"
        style={{ width: 12, height, background: gradient }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md pointer-events-none"
          style={{ top: thumbTop, width: 20, height: 20 }}
        />
      </div>
      <span className="text-[10px] md:text-xs font-extralight opacity-60 tracking-wider">{label}</span>
    </div>
  );
}

function ActionButton({ onClick, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export default function ColorMemoryGame() {
  const [phase, setPhase] = useState('idle');
  const [countdownIdx, setCountdownIdx] = useState(0);
  const [memorySecs, setMemorySecs] = useState(MEMORIZE_SECS);
  const [targetHex, setTargetHex] = useState('#1A1A1A');
  const [hue, setHue] = useState(180);
  const [sat, setSat] = useState(0.6);
  const [bri, setBri] = useState(0.5);
  const [rounds, setRounds] = useState([]); // { targetHex, guessHex, score }[]
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const guessHex = hsbToHex(hue, sat, bri);

  // ── Phase transition helpers ──────────────────────────────────────────

  const startMemorize = useCallback(() => {
    const hex = randomGameHex();
    setTargetHex(hex);
    setMemorySecs(MEMORIZE_SECS);
    setPhase('memorize');

    let rem = MEMORIZE_SECS;
    const tick = () => {
      rem -= 1;
      if (rem > 0) {
        setMemorySecs(rem);
        timerRef.current = setTimeout(tick, 1000);
      } else {
        const distractor = randomGameHex();
        const hsb = hexToHsb(distractor);
        setHue(hsb.h);
        setSat(hsb.s);
        setBri(hsb.b);
        setPhase('guess');
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, []);

  const runCountdown = useCallback(() => {
    clearTimer();
    setPhase('countdown');
    setCountdownIdx(0);

    let idx = 0;
    const step = () => {
      idx += 1;
      if (idx < COUNTDOWN_MESSAGES.length) {
        setCountdownIdx(idx);
        timerRef.current = setTimeout(step, 1000);
      } else {
        startMemorize();
      }
    };
    timerRef.current = setTimeout(step, 1000);
  }, [startMemorize]);

  const handleStart = useCallback(() => {
    clearTimer();
    setRounds([]);
    runCountdown();
  }, [runCountdown]);

  const handleGo = useCallback(() => {
    clearTimer();
    const score = calcScore(guessHex, targetHex);
    setRounds((prev) => [...prev, { targetHex, guessHex, score }]);
    setPhase('reveal');
  }, [guessHex, targetHex]);

  const handleNext = useCallback(() => {
    clearTimer();
    setRounds((prev) => {
      if (prev.length >= TOTAL_ROUNDS) {
        setPhase('results');
      } else {
        runCountdown();
      }
      return prev;
    });
  }, [runCountdown]);

  useEffect(() => () => clearTimer(), []);

  // ── Shared block dimensions ───────────────────────────────────────────

  const blockBase = 'relative w-full overflow-hidden rounded-2xl';
  const blockHeight = { minHeight: 'clamp(220px, 50vw, 420px)' };
  const guessBlockHeight = { minHeight: 'clamp(320px, 55vw, 460px)' };

  // ── Idle ──────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={handleStart}
        className={`${blockBase} bg-black group cursor-pointer`}
        style={blockHeight}
      >
        <div className="absolute top-5 right-6 md:top-8 md:right-10 text-right">
          <p className="text-white/25 text-[10px] md:text-xs tracking-[0.25em] uppercase font-extralight">
            色彩感知
          </p>
          <p className="text-white/30 text-[10px] md:text-xs font-extralight mt-0.5">
            5 轮挑战
          </p>
        </div>
        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10">
          <p className="text-white text-2xl md:text-4xl font-extralight tracking-wide leading-snug">
            色彩记忆
          </p>
          <p className="text-white/35 text-xs md:text-sm font-extralight mt-1.5 tracking-widest">
            点击开始
          </p>
        </div>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-300 rounded-2xl" />
      </button>
    );
  }

  // ── Countdown ─────────────────────────────────────────────────────────

  if (phase === 'countdown') {
    return (
      <div className={`${blockBase} bg-black`} style={blockHeight}>
        <div className="absolute top-5 right-6 md:top-8 md:right-10 text-right space-y-1.5">
          {COUNTDOWN_MESSAGES.slice(0, countdownIdx + 1).map((msg, i) => (
            <p
              key={i}
              className={`font-extralight tracking-wide zen-shell-fade ${
                i === countdownIdx
                  ? 'text-white text-lg md:text-2xl'
                  : 'text-white/25 text-sm md:text-lg'
              }`}
            >
              {msg}
            </p>
          ))}
        </div>
        <div className="absolute bottom-5 left-6 text-white/20 text-xs font-extralight tracking-widest">
          第 {rounds.length + 1}/{TOTAL_ROUNDS} 轮
        </div>
      </div>
    );
  }

  // ── Memorize ──────────────────────────────────────────────────────────

  if (phase === 'memorize') {
    const tc = adaptiveTextHex(targetHex);
    return (
      <div
        className={`${blockBase} transition-colors duration-700`}
        style={{ ...blockHeight, backgroundColor: targetHex }}
      >
        <div
          className="absolute top-5 right-6 md:top-8 md:right-10 text-right"
          style={{ color: tc }}
        >
          <p className={`text-6xl md:text-9xl ${GAME_NUM_CLASS}`} style={{ color: tc }}>
            <FlipNumber
              value={memorySecs}
              decimals={2}
              duration={720}
              continuous
            />
          </p>
          <p className="text-xs md:text-sm font-extralight opacity-55 mt-1 tracking-wide">
            秒时间记住颜色
          </p>
        </div>
        <div
          className="absolute bottom-5 left-6 text-xs font-extralight tracking-widest opacity-40"
          style={{ color: tc }}
        >
          第 {rounds.length + 1}/{TOTAL_ROUNDS} 轮
        </div>
      </div>
    );
  }

  // ── Guess ─────────────────────────────────────────────────────────────

  if (phase === 'guess') {
    const currentBg = guessHex;
    const tc = adaptiveTextHex(currentBg);

    // Dynamic gradients — top = max, bottom = min
    const hueGrad = [0, 60, 120, 180, 240, 300, 360]
      .map((deg) => hsbToHex(deg, 1, 1))
      .reverse()
      .join(', ');
    const satGrad = `${hsbToHex(hue, 1, Math.max(0.3, bri))}, ${hsbToHex(hue, 0, Math.max(0.3, bri))}`;
    const briGrad = `${hsbToHex(hue, Math.max(0.4, sat), 1)}, #000000`;

    const sliders = [
      {
        label: '色调',
        value: hue,
        min: 0,
        max: 360,
        gradient: `linear-gradient(to bottom, ${hueGrad})`,
        onChange: setHue,
      },
      {
        label: '饱和度',
        value: sat * 100,
        min: 0,
        max: 100,
        gradient: `linear-gradient(to bottom, ${satGrad})`,
        onChange: (v) => setSat(v / 100),
      },
      {
        label: '亮度',
        value: bri * 100,
        min: 0,
        max: 100,
        gradient: `linear-gradient(to bottom, ${briGrad})`,
        onChange: (v) => setBri(v / 100),
      },
    ];

    return (
      <div
        className={`${blockBase} transition-colors`}
        style={{ ...guessBlockHeight, backgroundColor: currentBg, color: tc }}
      >
        {/* Desktop sliders — vertical, left panel */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden md:flex flex-row gap-5 items-center">
          {sliders.map((sl) => (
            <VerticalSlider key={sl.label} height={160} {...sl} />
          ))}
        </div>

        {/* Mobile sliders — vertical, bottom-left row */}
        <div className="absolute bottom-5 left-5 flex flex-row gap-4 items-end md:hidden">
          {sliders.map((sl) => (
            <VerticalSlider key={sl.label} height={90} {...sl} />
          ))}
        </div>

        {/* Round indicator */}
        <div className="absolute top-5 right-6 text-xs font-extralight tracking-widest opacity-50">
          第 {rounds.length + 1}/{TOTAL_ROUNDS} 轮
        </div>

        {/* GO button */}
        <div className="absolute bottom-5 right-5">
          <ActionButton onClick={handleGo} label="提交颜色">
            <span className="text-black text-sm font-light tracking-widest">GO</span>
          </ActionButton>
        </div>
      </div>
    );
  }

  // ── Reveal ────────────────────────────────────────────────────────────

  if (phase === 'reveal') {
    const last = rounds[rounds.length - 1];
    if (!last) return null;
    const { targetHex: tHex, guessHex: gHex, score } = last;
    const tName = getPoeticColorName(tHex);
    const gName = getPoeticColorName(gHex);
    const ttc = adaptiveTextHex(tHex);
    const gtc = adaptiveTextHex(gHex);
    const isLast = rounds.length >= TOTAL_ROUNDS;

    return (
      <div
        className={`${blockBase}`}
        style={blockHeight}
      >
        {/* Split halves */}
        <div className="absolute inset-0 flex flex-col md:flex-row">
          {/* Guess — left / top */}
          <div
            className="flex-1 flex flex-col justify-end p-4 md:p-6"
            style={{ backgroundColor: gHex, color: gtc }}
          >
            <p className="text-[10px] opacity-50 mb-1 font-extralight tracking-widest uppercase">
              你的选择
            </p>
            <p className="text-sm md:text-base font-mono opacity-80">{gHex}</p>
            <p className="text-xs opacity-55 mt-0.5 font-extralight">{gName}</p>
          </div>
          {/* Target — right / bottom */}
          <div
            className="flex-1 flex flex-col justify-end p-4 md:p-6"
            style={{ backgroundColor: tHex, color: ttc }}
          >
            <p className="text-[10px] opacity-50 mb-1 font-extralight tracking-widest uppercase">
              目标颜色
            </p>
            <p className="text-sm md:text-base font-mono opacity-80">{tHex}</p>
            <p className="text-xs opacity-55 mt-0.5 font-extralight">{tName}</p>
          </div>
        </div>

        {/* Score — top right, animated from 0 (key forces remount each round) */}
        <div className="absolute top-5 right-6 md:top-8 md:right-10 text-right pointer-events-none">
          <p className={`text-6xl md:text-9xl ${GAME_NUM_CLASS} text-white drop-shadow-lg`}>
            <FlipNumber
              key={rounds.length}
              value={score}
              initialFrom={0}
              decimals={2}
              duration={900}
            />
          </p>
          <p className="text-xs md:text-sm font-extralight text-white/55 mt-1 tracking-wide">
            /10
          </p>
        </div>

        {/* Next / finish button */}
        <div className="absolute bottom-5 right-5">
          <ActionButton
            onClick={isLast ? () => setPhase('results') : handleNext}
            label={isLast ? '查看结果' : '下一轮'}
          >
            <ArrowRight size={20} className="text-black" />
          </ActionButton>
        </div>

        {/* Round progress */}
        <div className="absolute top-5 left-5 flex gap-1.5">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-5 md:w-6 rounded-full transition-colors ${
                i < rounds.length ? 'bg-white/80' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────

  if (phase === 'results') {
    const total = rounds.reduce((sum, r) => sum + r.score, 0);
    const desc = totalDescription(total);

    return (
      <div
        className={`${blockBase} bg-black p-6 md:p-10`}
        style={{ minHeight: 'clamp(260px, 60vw, 480px)' }}
      >
        {/* Big score */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-5xl md:text-8xl text-white ${GAME_NUM_CLASS}`}>
            <FlipNumber
              value={total}
              initialFrom={0}
              decimals={2}
              duration={1100}
            />
          </span>
          <span className="text-2xl md:text-4xl text-white/35 font-zenSerif font-extralight">/50</span>
        </div>

        <p className="text-white/50 font-extralight text-sm md:text-lg mb-7 md:mb-10 leading-relaxed">
          {desc}
        </p>

        {/* YOU card with color strips */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/5">
            <span className="text-white/50 text-xs tracking-[0.2em] uppercase font-extralight">
              你
            </span>
            <span className="text-white/35 text-xs tabular-nums font-extralight">
              {total.toFixed(2)}/50
            </span>
          </div>
          <div className="flex">
            {rounds.map(({ targetHex: tHex, guessHex: gHex, score: sc }, i) => (
              <div
                key={i}
                className="relative flex-1"
                style={{ aspectRatio: '1 / 1' }}
              >
                {/* Guess fills top-left */}
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: gHex }}
                />
                {/* Target triangle bottom-right */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <polygon points="1,0 1,1 0,1" fill={tHex} />
                </svg>
                {/* Per-round score */}
                <span
                  className={`absolute left-1 top-1 text-[9px] md:text-[11px] font-zenSerif font-medium tabular-nums leading-none`}
                  style={{ color: adaptiveTextHex(gHex) }}
                >
                  {sc.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Restart */}
        <button
          type="button"
          onClick={handleStart}
          className="mt-6 flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-white/50 text-xs font-extralight tracking-widest hover:bg-white/8 transition-colors"
        >
          再来一次
        </button>
      </div>
    );
  }

  return null;
}
