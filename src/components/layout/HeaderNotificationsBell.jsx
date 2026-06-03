import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Heart, Megaphone } from 'lucide-react';
import NavItem from './NavItem';

const STORAGE_KEY = 'genom-xinxun-v1';

function seedNotifications() {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-interaction-1',
      kind: 'interaction',
      title: '作品互动',
      body: '有观者在社区为你的色卡点赞。连接账号后，互动将在此汇总。',
      createdAt: now,
      read: false,
    },
    {
      id: 'seed-platform-1',
      kind: 'platform',
      title: '平台通知',
      body: '心讯汇集作品互动与官方公告。后续版本将支持推送与邮件提醒。',
      createdAt: now,
      read: false,
    },
  ];
}

function loadItems() {
  if (typeof window === 'undefined') return seedNotifications();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedNotifications();
}

function saveItems(items) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60_000) return '刚刚';
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} 小时前`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * 心讯：作品互动 + 平台通知。数据暂存 localStorage，供后续对接服务端。
 */
export default function HeaderNotificationsBell({ open, onOpenChange, onOpen }) {
  const [items, setItems] = useState(loadItems);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const interactionItems = useMemo(() => items.filter((i) => i.kind === 'interaction'), [items]);
  const platformItems = useMemo(() => items.filter((i) => i.kind === 'platform'), [items]);

  const markRead = (id) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const markAllRead = () => {
    setItems((list) => list.map((i) => ({ ...i, read: true })));
  };

  const toggle = () => {
    const next = !open;
    if (next) onOpen?.();
    onOpenChange(next);
  };

  const Section = ({ title, icon: Icon, list }) => (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon size={14} className="text-zen-ink/45 shrink-0" strokeWidth={2} aria-hidden />
        <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/45">{title}</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zen-ink/10 bg-zen-mist/40 px-3 py-4 text-center text-[11px] text-zen-ink/40">
          暂无通知
        </p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => markRead(n.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                  n.read
                    ? 'border-zen-ink/8 bg-white/60'
                    : 'border-zen-vermilion/25 bg-zen-vermilion/[0.06]'
                }`}
              >
                <p className="text-[11px] font-normal text-zen-ink">{n.title}</p>
                <p className="mt-0.5 text-[10px] font-extralight leading-snug text-zen-ink/55">{n.body}</p>
                <p className="mt-1 text-[9px] font-extralight text-zen-ink/35">{formatTime(n.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="relative" data-notifications-root>
      <div className="relative inline-flex">
        {unreadCount > 0 ? (
          <span
            className="pointer-events-none absolute right-0.5 top-0.5 z-10 min-h-[8px] min-w-[8px] rounded-full bg-zen-vermilion ring-2 ring-white"
            aria-hidden
          />
        ) : null}
        <NavItem icon={Bell} label="心讯" active={open} onClick={toggle} tooltipDir="bottom" />
      </div>
      {open ? (
        <div
          className="absolute right-0 top-full z-[130] mt-2 w-[min(calc(100vw-2rem),20rem)] max-h-[min(70vh,24rem)] overflow-y-auto rounded-2xl border border-zen-ink/10 bg-zen-mist/98 p-4 shadow-lg backdrop-blur-md"
          role="dialog"
          aria-label="心讯通知"
        >
          <div className="mb-3 flex items-start justify-between gap-2 border-b border-zen-ink/10 pb-3">
            <div>
              <p className="text-[10px] font-extralight uppercase tracking-[0.25em] text-zen-vermilion/90">心讯</p>
              <p className="mt-0.5 text-[11px] font-extralight text-zen-ink/50">作品互动与平台通知</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="shrink-0 rounded-full border border-zen-ink/12 px-2.5 py-1 text-[9px] font-extralight uppercase tracking-wider text-zen-ink/70 hover:bg-zen-ink/[0.04]"
              >
                全部已读
              </button>
            ) : null}
          </div>
          <Section title="作品互动" icon={Heart} list={interactionItems} />
          <Section title="平台通知" icon={Megaphone} list={platformItems} />
        </div>
      ) : null}
    </div>
  );
}
