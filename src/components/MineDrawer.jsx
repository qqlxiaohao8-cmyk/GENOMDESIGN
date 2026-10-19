import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconSettings } from './icons/HeyteaIcons';
import { AccentColorDialog } from './AccentPalette';
import { authClient } from '../lib/authClient';
import { syncProfile } from '../lib/apiClient';
import { normalizeProfileHex } from '../lib/profilePresets';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { getHomeActivityCards } from '../lib/homeActivities';
import { fetchMyMonthParticipation } from '../lib/dailyOneColorApi';
import {
  buildMonthCalendar,
  participationFromVault,
  previewMonthParticipation,
} from '../lib/monthDailyCalendar';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function medalTone(rank) {
  if (rank === 1) return { className: 'is-gold', label: '金' };
  if (rank === 2) return { className: 'is-silver', label: '银' };
  if (rank === 3) return { className: 'is-bronze', label: '铜' };
  return null;
}

function IdentityCalendarCard({
  hex,
  username,
  dateKey,
  participation,
  onEdit,
}) {
  const text = pickReadableTextOnHex(hex);
  const cal = useMemo(() => buildMonthCalendar(dateKey), [dateKey]);
  const monthLabel = `${cal.year} · ${String(cal.month).padStart(2, '0')}`;

  return (
    <button
      type="button"
      className="mine-id-square"
      style={{ color: text }}
      onClick={onEdit}
      aria-label="编辑个人颜色"
      data-mine-id
    >
      <span className="mine-id-square__face" style={{ backgroundColor: hex }} aria-hidden />
      <span className="mine-id-square__top" key="id-head">
        <span className="mine-id-square__name">{username}</span>
        <span className="mine-id-square__hex">{String(hex || '').toUpperCase()}</span>
      </span>
      <span className="mine-id-square__month">{monthLabel}</span>

      <span className="mine-cal" aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w} className="mine-cal-wd">{w}</span>
        ))}
        {cal.cells.map((cell) => {
          if (cell.empty) {
            return <span key={cell.key} className="mine-cal-cell is-blank" />;
          }
          const rec = participation[cell.dateKey];
          const filled = Boolean(rec?.participated) && !cell.isFuture;
          const medal = filled ? medalTone(Number(rec?.winnerRank) || 0) : null;
          return (
            <span
              key={cell.key}
              className={`mine-cal-cell${filled ? ' is-filled' : ''}${cell.isToday ? ' is-today' : ''}${cell.isFuture ? ' is-future' : ''}`}
              style={filled ? { backgroundColor: cell.hex } : undefined}
            >
              <span
                className="mine-cal-day"
                style={filled ? { color: pickReadableTextOnHex(cell.hex) } : undefined}
              >
                {cell.day}
              </span>
              {medal ? (
                <span className={`mine-cal-medal ${medal.className}`} title={medal.label} />
              ) : null}
            </span>
          );
        })}
      </span>
    </button>
  );
}

export default function MineDrawer({
  open,
  onClose,
  user,
  isPreview,
  username,
  accentHex,
  dateKey,
  vaultItems = [],
  onEditProfile,
  onOpenMemory,
  onOpenWalk,
  onOpenSettings,
}) {
  const [participation, setParticipation] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(accentHex);
  const [colorBusy, setColorBusy] = useState(false);
  const [colorMsg, setColorMsg] = useState('');
  const panelRef = useRef(null);
  const wasOpenRef = useRef(false);
  const monthKey = String(dateKey || '').slice(0, 7);
  const todayDay = parseInt(String(dateKey || '').slice(8, 10), 10) || 1;
  const activities = useMemo(
    () => getHomeActivityCards().filter((c) => c.kind === 'memory' || c.kind === 'walk'),
    [],
  );

  useEffect(() => {
    if (!open) return undefined;
    const vaultMap = participationFromVault(vaultItems);
    if (isPreview || !user?.id) {
      setParticipation({ ...previewMonthParticipation(monthKey, todayDay), ...vaultMap });
      return undefined;
    }

    let cancelled = false;
    setParticipation(vaultMap);
    fetchMyMonthParticipation(monthKey, user.id).then(({ days }) => {
      if (cancelled) return;
      setParticipation({ ...vaultMap, ...days });
    });
    return () => { cancelled = true; };
  }, [open, isPreview, user?.id, monthKey, todayDay, vaultItems]);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (open) {
      wasOpenRef.current = true;
      setClosing(false);
      setHeldOpen(true);
      if (reduced) {
        setExpanded(true);
        return undefined;
      }
      setExpanded(false);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    if (!wasOpenRef.current) return undefined;
    wasOpenRef.current = false;

    if (reduced) {
      setExpanded(false);
      setClosing(false);
      setHeldOpen(false);
      return undefined;
    }

    setExpanded(false);
    setClosing(true);
    const panel = panelRef.current;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setClosing(false);
      setHeldOpen(false);
    };
    const onEnd = (event) => {
      if (event.target !== panel || event.propertyName !== 'max-height') return;
      finish();
    };
    panel?.addEventListener('transitionend', onEnd);
    const timer = window.setTimeout(finish, 600);
    return () => {
      panel?.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setColorOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (colorOpen) {
        setColorOpen(false);
        return;
      }
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, colorOpen]);

  const openColor = () => {
    if (isPreview || !user) {
      onEditProfile?.();
      return;
    }
    setDraftHex(normalizeProfileHex(accentHex));
    setColorMsg('');
    setColorOpen(true);
  };

  const saveColor = async () => {
    setColorBusy(true);
    setColorMsg('');
    try {
      const { error } = await authClient.updateUser({
        accent_hex: normalizeProfileHex(draftHex),
      });
      if (error) throw error;
      await authClient.getSession();
      await syncProfile();
      setColorOpen(false);
    } catch (e) {
      setColorMsg(e.message || '保存失败，请重试。');
    } finally {
      setColorBusy(false);
    }
  };

  return (
    <div
      className={`mine-drawer${heldOpen ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
      aria-hidden={!heldOpen}
    >
      {heldOpen ? (
        <button
          type="button"
          className="mine-drawer__dim"
          aria-label="关闭"
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={panelRef}
        className={`mine-drawer__panel${expanded ? ' is-expand' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="我的"
        inert={!heldOpen || closing}
      >
        <div className="mine-drawer__wash" aria-hidden />
        <div className="mine-drawer__body">
          <div className="mine-drawer__scroll">
            <IdentityCalendarCard
              hex={accentHex}
              username={username}
              dateKey={dateKey}
              participation={participation}
              onEdit={openColor}
            />

            <div className="mine-drawer-acts">
              {activities.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="mine-drawer-act"
                  onClick={() => {
                    if (card.kind === 'memory') onOpenMemory?.();
                    if (card.kind === 'walk') onOpenWalk?.();
                  }}
                >
                  {card.kind === 'memory' ? (
                    <span className="mine-memory-tiles mine-memory-tiles--mini" aria-hidden>
                      {(card.tiles || []).map((h, i) => (
                        <span
                          key={`${h}-${i}`}
                          className={h === '#E8E0D4' ? 'is-back' : undefined}
                          style={{ backgroundColor: h }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="mine-walk-path mine-walk-path--mini" aria-hidden>
                      {['#C45A6A', '#C4A35A', '#7A9B6A', '#6A8AA8'].map((h) => (
                        <span key={h} style={{ backgroundColor: h }} />
                      ))}
                    </span>
                  )}
                  <span className="mine-drawer-act__copy">
                    <span className="mine-drawer-act__title">{card.title}</span>
                    <span className="mine-drawer-act__hint">{card.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="mine-drawer-settings"
            onClick={onOpenSettings}
            aria-label="设定"
          >
            <IconSettings />
          </button>
        </div>
      </aside>
      {colorOpen
        ? createPortal(
          <AccentColorDialog
            hex={draftHex}
            busy={colorBusy}
            message={colorMsg}
            onChange={setDraftHex}
            onConfirm={saveColor}
            onClose={() => { if (!colorBusy) setColorOpen(false); }}
          />,
          document.body,
        )
        : null}
    </div>
  );
}
