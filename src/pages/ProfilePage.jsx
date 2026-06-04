import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, BookOpen, ChevronRight, Check, Pencil } from 'lucide-react';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { PROFILE_FONTS } from '../lib/profileFonts';
import PageHeader from '../components/layout/PageHeader';

const normalizeHex = normalizeProfileHex;

function ProfileHeroCard({ user, username, accentHex, onEdit }) {
  const hex = accentHex || '#C93756';
  const textColor = pickReadableTextOnHex(hex);
  const colorName = getPoeticColorName(hex);

  if (!user) {
    return (
      <div
        className="relative w-full cursor-pointer rounded-2xl border border-dashed border-zen-ink/20 bg-zen-mist/30 transition-all hover:border-zen-ink/30"
        style={{ minHeight: '9rem' }}
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => e.key === 'Enter' && onEdit()}
        aria-label="点击登录"
      >
        <div className="flex h-full min-h-[9rem] items-end p-4">
          <p className="type-body text-zen-ink/30">点击登录</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: hex, minHeight: '9rem' }}
    >
      <button
        type="button"
        onClick={onEdit}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{ backgroundColor: `${textColor}18` }}
        aria-label="编辑资料"
      >
        <Pencil size={14} strokeWidth={2} style={{ color: textColor }} aria-hidden />
      </button>
      <div className="flex h-full min-h-[9rem] flex-col justify-end p-4">
        <p className="type-caption tracking-widest" style={{ color: `${textColor}80` }}>
          {hex} · {colorName}
        </p>
        <p className="type-h3" style={{ color: textColor }}>
          {username || user.email?.split('@')[0] || '用户'}
        </p>
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
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-2xl md:rounded-3xl">
        <h3 className="type-h3 mb-5">编辑资料</h3>

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
            className="type-body w-full rounded-xl border border-zen-ink/15 bg-zen-mist/30 px-4 py-3 focus:border-zen-ink/30 focus:outline-none"
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
                className="relative h-8 w-8 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
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
              className="h-8 w-8 cursor-pointer rounded-lg border border-zen-ink/10"
              aria-label="自定义颜色"
            />
            <span className="text-[11px] font-extralight text-zen-ink/40">或自定义颜色</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-[11px] font-extralight uppercase tracking-widest text-zen-ink/50">
            界面字体
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFontId(f.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                  selectedFontId === f.id
                    ? 'border-zen-ink ring-1 ring-zen-ink/15'
                    : 'border-zen-ink/10 hover:border-zen-ink/20'
                }`}
              >
                <p className="text-[13px] font-medium" style={{ fontFamily: f.cssFamily }}>
                  {f.sample}
                </p>
                <p className="text-[10px] font-extralight text-zen-ink/45">{f.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-zen-ink/15 py-3 text-[11px] font-extralight uppercase tracking-widest text-zen-ink/60 hover:bg-zen-ink/[0.04] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex-1 rounded-full bg-zen-ink py-3 text-[11px] font-extralight uppercase tracking-widest text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, sub, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-zen-ink/[0.04] disabled:opacity-30 disabled:pointer-events-none"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zen-mist">
        <Icon size={17} strokeWidth={1.5} className="text-zen-ink/60" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extralight text-zen-ink">{label}</p>
        {sub && <p className="text-[10px] font-extralight text-zen-ink/40">{sub}</p>}
      </div>
      <ChevronRight size={15} strokeWidth={1.5} className="shrink-0 text-zen-ink/25" aria-hidden />
    </button>
  );
}

export default function ProfilePage({ user, supabase, onOpenAuth, onSignOut }) {
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
      if (!supabase || !user) return;
      setSaveBusy(true);
      try {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            username: newName,
            accent_hex: newHex,
            font_id: newFontId || 'serif',
            profile_complete: true,
          },
        });
      } catch (e) {
        console.error(e);
      } finally {
        setSaveBusy(false);
        setEditOpen(false);
      }
    },
    [supabase, user]
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="px-4 pb-[max(6rem,env(safe-area-inset-bottom,0px))] pt-4 md:px-6 md:pb-8 md:pt-6">
        <PageHeader
          className="mb-5"
          title="我"
          description="你的色彩身份与账号设置"
        />
        {/* Hero card */}
        <div className="mb-5">
          <ProfileHeroCard
            user={user}
            username={username}
            accentHex={accentHex}
            onEdit={openEdit}
          />
        </div>

        {/* Menu list */}
        <div className="space-y-1">
          <MenuRow
            icon={BookOpen}
            label="使用手册"
            sub="了解 GENOM 的功能"
            onClick={() => {/* TODO: open manual */}}
          />
          {/* Placeholder items */}
          <MenuRow icon={BookOpen} label="更多功能" sub="即将开放" disabled />
          <MenuRow icon={BookOpen} label="关于 GENOM" sub="即将开放" disabled />
        </div>

        {/* Sign out */}
        {user && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left transition-colors hover:bg-red-50"
            >
              <LogOut size={16} strokeWidth={1.5} className="text-red-400" aria-hidden />
              <span className="text-[13px] font-extralight text-red-500">退出登录</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit profile sheet */}
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
    </div>
  );
}
