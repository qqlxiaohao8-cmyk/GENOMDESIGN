import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { PROFILE_FONTS } from '../lib/profileFonts';
import PageShell from '../components/layout/PageShell';
import { authClient } from '../lib/authClient';
import { syncProfile } from '../lib/apiClient';

const normalizeHex = normalizeProfileHex;

function ProfileHeroCard({ user, username, accentHex, onEdit }) {
  const hex = accentHex || '#C93756';
  const colorName = getPoeticColorName(hex);

  if (!user) {
    return (
      <div
        className="zen-specimen relative flex w-full cursor-pointer items-start gap-5 py-2"
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => e.key === 'Enter' && onEdit()}
        aria-label="点击登录"
      >
        <div className="zen-wash h-[7.5rem] w-[6.25rem] shrink-0 bg-zen-sand" />
        <div className="min-w-0 flex-1 pt-2">
          <p className="font-zenTypewriter text-[10px] text-zen-stone">未登录</p>
          <h2 className="type-h3 mt-2 text-zen-ink/50">你的颜色</h2>
          <p className="zen-action mt-4">登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="zen-specimen relative flex items-start gap-5 py-2">
      <div
        className="zen-wash h-[7.5rem] w-[6.25rem] shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 flex-1 pt-2">
        <p className="font-zenTypewriter text-[10px] text-zen-stone">{hex}</p>
        <h2 className="type-h3 mt-2">
          {username || user.email?.split('@')[0] || '用户'}
        </h2>
        <p className="zen-catalog mt-2">{colorName}</p>
        <button
          type="button"
          onClick={onEdit}
          className="zen-action zen-hit mt-3"
        >
          编辑
        </button>
      </div>
    </div>
  );
}

function EditProfileSheet({ user, username, accentHex, fontId, onSave, onClose, busy }) {
  const [name, setName] = useState(username || '');
  const [hex, setHex] = useState(accentHex || '#C93756');
  const [customHex, setCustomHex] = useState('');
  const [selectedFontId, setSelectedFontId] = useState(fontId || 'serif');
  const inputRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSave = () => {
    const finalHex = normalizeHex(customHex || hex);
    onSave({
      username: name.trim().slice(0, 20) || (user.email?.split('@')[0] || '用户'),
      accentHex: finalHex,
      fontId: selectedFontId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-zen-paper p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="mb-5">
          <p className="type-index">04.</p>
          <h3 className="type-h3 mt-2">编辑资料</h3>
        </div>

        {/* Username */}
        <div className="mb-5">
          <label className="type-overline mb-1.5 block text-zen-ink/50">
            用户名
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="输入你的名称…"
            className="zen-input"
          />
        </div>

        {/* Accent color */}
        <div className="mb-6">
          <label className="type-overline mb-2 block text-zen-ink/50">
            专属颜色
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {PROFILE_ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setHex(c); setCustomHex(''); }}
                className="relative h-8 w-8 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderRadius: '0.45rem 0.65rem 0.4rem 0.7rem',
                }}
                aria-label={c}
              >
                {hex === c && !customHex && (
                  <Check size={14} strokeWidth={2.5} className="absolute inset-0 m-auto" style={{ color: pickReadableTextOnHex(c) }} />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHex || hex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="h-8 w-8 cursor-pointer border border-zen-clay/50"
              style={{ borderRadius: '0.45rem 0.6rem 0.4rem 0.65rem' }}
              aria-label="自定义颜色"
            />
            <span className="type-caption">或自定义颜色</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="type-overline mb-2 block text-zen-ink/50">
            界面字体
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFontId(f.id)}
                className={`zen-scrap zen-scrap--flat px-3 py-2.5 text-left ${
                  selectedFontId === f.id
                    ? 'border-zen-coal/30 ring-1 ring-zen-ink/15'
                    : 'hover:border-zen-stone/40'
                }`}
              >
                <p className="text-[13px] font-medium" style={{ fontFamily: f.cssFamily }}>
                  {f.sample}
                </p>
                <p className="type-caption mt-0.5">{f.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="zen-btn-ghost flex-1"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="zen-btn-primary flex-1"
          >
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuRow({ label, sub, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="zen-hit mb-1 flex w-full items-baseline py-2 text-left disabled:pointer-events-none disabled:opacity-30"
    >
      <span className="type-h4">{label}</span>
      {sub ? <span className="zen-catalog ml-3">{sub}</span> : null}
    </button>
  );
}

export default function ProfilePage({ user, onOpenAuth, onSignOut }) {
  const [editOpen, setEditOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const username = user?.user_metadata?.username || '';
  const accentHex = normalizeHex(user?.user_metadata?.accent_hex || '#C93756');
  const fontId = user?.user_metadata?.font_id || 'serif';

  // Open edit sheet (or auth modal if not logged in)
  const openEdit = () => {
    if (!user) { onOpenAuth?.(); return; }
    setEditOpen(true);
  };

  const handleSaveProfile = useCallback(
    async ({ username: newName, accentHex: newHex, fontId: newFontId }) => {
      if (!user) return;
      setSaveBusy(true);
      try {
        const { error } = await authClient.updateUser({
          username: newName,
          accent_hex: newHex,
          font_id: newFontId || 'serif',
          profile_complete: true,
        });
        if (error) throw error;
        await authClient.getSession();
        await syncProfile();
      } catch (e) {
        console.error(e);
      } finally {
        setSaveBusy(false);
        setEditOpen(false);
      }
    },
    [user]
  );

  return (
    <>
      <PageShell title="我" index="04">
        <div className="mb-5">
          <ProfileHeroCard
            user={user}
            username={username}
            accentHex={accentHex}
            onEdit={openEdit}
          />
        </div>

        <div className="space-y-1">
          <MenuRow
            label="使用手册"
            onClick={() => {/* TODO: open manual */}}
          />
          <MenuRow label="更多功能" disabled />
          <MenuRow label="关于色空" disabled />
        </div>

        {user && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onSignOut}
              className="zen-action zen-hit"
            >
              退出登录
            </button>
          </div>
        )}
      </PageShell>

      {editOpen && user && (
        <EditProfileSheet
          user={user}
          username={username}
          accentHex={accentHex}
          fontId={fontId}
          onSave={handleSaveProfile}
          onClose={() => setEditOpen(false)}
          busy={saveBusy}
        />
      )}
    </>
  );
}
