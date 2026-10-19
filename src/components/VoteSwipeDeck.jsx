import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUp, X } from 'lucide-react';
import { PALETTE_FEED_STRIPE_HEIGHT_CLASS } from './ColorSeaStripes';

const LIKE_GOAL = 5;
const SWIPE_THRESHOLD = 88;
const FLY_MS = 280;
const THANKS_MS = 1100;

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#888888';
  return `#${s.toUpperCase()}`;
}

/**
 * 投票弹层：色卡叠成一叠，右滑喜欢、左滑跳过。喜欢满 5 张后致谢并关闭。
 */
export default function VoteSwipeDeck({ cards = [], onClose }) {
  const deck = useMemo(
    () => (Array.isArray(cards) ? cards.filter((card) => card?.colors?.length >= 2) : []),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [likes, setLikes] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [fly, setFly] = useState(null);
  const [notice, setNotice] = useState(null);
  const startRef = useRef(null);
  const likesRef = useRef(0);
  const indexRef = useRef(0);
  const flyLock = useRef(false);
  const closeTimer = useRef(null);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    closeTimer.current = window.setTimeout(() => onClose?.(), THANKS_MS);
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [notice, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (notice || flyLock.current) return;
      if (event.key === 'ArrowRight') commit('like');
      if (event.key === 'ArrowLeft') commit('pass');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const finish = (dir) => {
    const nextLikes = dir === 'like' ? likesRef.current + 1 : likesRef.current;
    likesRef.current = nextLikes;
    setLikes(nextLikes);
    setFly(null);
    setDrag({ x: 0, y: 0, active: false });
    flyLock.current = false;
    if (nextLikes >= LIKE_GOAL) {
      setNotice('感谢投票！');
      return;
    }
    const nextIndex = indexRef.current + 1;
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    if (nextIndex >= deck.length) setNotice('色卡都看过了');
  };

  const commit = (dir) => {
    if (flyLock.current || notice) return;
    if (indexRef.current >= deck.length) {
      setNotice(likesRef.current >= LIKE_GOAL ? '感谢投票！' : '色卡都看过了');
      return;
    }
    flyLock.current = true;
    setDrag((prev) => ({ ...prev, active: false }));
    setFly(dir);
    window.setTimeout(() => finish(dir), FLY_MS);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 || flyLock.current || notice) return;
    startRef.current = { x: event.clientX, y: event.clientY, pid: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* 非可信指针事件时仍可按位移结算 */
    }
    setDrag({ x: 0, y: 0, active: true });
  };

  const onPointerMove = (event) => {
    const start = startRef.current;
    if (!start || event.pointerId !== start.pid) return;
    setDrag({
      x: event.clientX - start.x,
      y: event.clientY - start.y,
      active: true,
    });
  };

  const onPointerUp = (event) => {
    const start = startRef.current;
    if (!start || event.pointerId !== start.pid) return;
    const dx = event.clientX - start.x;
    startRef.current = null;
    if (dx > SWIPE_THRESHOLD) commit('like');
    else if (dx < -SWIPE_THRESHOLD) commit('pass');
    else setDrag({ x: 0, y: 0, active: false });
  };

  const visible = deck.slice(index, index + 3);
  const likeOpacity = fly === 'like' ? 1 : Math.min(1, Math.max(0, drag.x / 72));
  const passOpacity = fly === 'pass' ? 1 : Math.min(1, Math.max(0, -drag.x / 72));

  return createPortal(
    <div
      className="vote-deck"
      role="dialog"
      aria-modal="true"
      aria-label="投票"
      onClick={() => onClose?.()}
    >
      <div className="vote-deck__panel" onClick={(event) => event.stopPropagation()}>
        {notice ? (
          <p className="vote-deck__thanks" aria-live="polite">{notice}</p>
        ) : deck.length === 0 ? (
          <p className="vote-deck__thanks">还没有可以投票的色卡</p>
        ) : (
          <>
            <p className="vote-deck__count">{likes} / {LIKE_GOAL}</p>
            <div className="vote-deck__stack">
              {visible.map((card, depth) => {
                const isTop = depth === 0;
                const transform = !isTop
                  ? `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`
                  : fly === 'like'
                    ? 'translate(130%, 28px) rotate(16deg)'
                    : fly === 'pass'
                      ? 'translate(-130%, 28px) rotate(-16deg)'
                      : `translate(${drag.x}px, ${drag.y * 0.35}px) rotate(${drag.x / 18}deg)`;
                const colors = card.colors.slice(0, 8);
                return (
                  <article
                    key={card.id}
                    className="vote-deck__card"
                    style={{
                      transform,
                      zIndex: 5 - depth,
                      transition: isTop && drag.active ? 'none' : undefined,
                    }}
                    onPointerDown={isTop ? onPointerDown : undefined}
                    onPointerMove={isTop ? onPointerMove : undefined}
                    onPointerUp={isTop ? onPointerUp : undefined}
                    onPointerCancel={isTop ? onPointerUp : undefined}
                  >
                    {isTop ? (
                      <>
                        <span className="vote-deck__stamp is-like" style={{ opacity: likeOpacity }}>喜欢</span>
                        <span className="vote-deck__stamp is-pass" style={{ opacity: passOpacity }}>跳过</span>
                      </>
                    ) : null}
                    <div className={`vote-deck__stripes zen-stripe-row flex w-full overflow-hidden ${PALETTE_FEED_STRIPE_HEIGHT_CLASS}`}>
                      {colors.map((color, i) => (
                        <span
                          key={`${card.id}-${i}`}
                          className="zen-stripe"
                          style={{ backgroundColor: normalizeHex(color.hex), flexBasis: 0 }}
                        />
                      ))}
                    </div>
                    <p className="vote-deck__title">{card.title || '未命名色卡'}</p>
                  </article>
                );
              })}
            </div>
            <div className="vote-deck__actions">
              <button type="button" className="vote-deck__btn is-pass" onClick={() => commit('pass')} aria-label="跳过">
                <X size={18} strokeWidth={2.15} />
              </button>
              <button type="button" className="vote-deck__btn is-like" onClick={() => commit('like')} aria-label="喜欢">
                <ThumbsUp size={18} strokeWidth={2.15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
