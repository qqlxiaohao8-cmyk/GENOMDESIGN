import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { PROFILE_FONTS } from '../lib/profileFonts';
import PageShell from '../components/layout/PageShell';
import DisplayFontPicker from '../components/DisplayFontPicker';
import DisplayIconPicker from '../components/DisplayIconPicker';
import { authClient } from '../lib/authClient';
import { syncProfile } from '../lib/apiClient';

const normalizeHex = normalizeProfileHex;

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
        <h3 className="type-h3">编辑资料</h3>

        <div className="mt-5 mb-5">
          <label className="type-overline mb-1.5 block">用户名</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="zen-input"
          />
        </div>

        <div className="mb-6">
          <label className="type-overline mb-2 block">专属颜色</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {PROFILE_ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setHex(c); setCustomHex(''); }}
                className="relative h-8 w-8"
                style={{ backgroundColor: c }}
                aria-label={c}
              >
                {hex === c && !customHex && (
                  <Check size={14} strokeWidth={1.6} className="absolute inset-0 m-auto" style={{ color: pickReadableTextOnHex(c) }} />
                )}
              </button>
            ))}
          </div>
          <input
            type="color"
            value={customHex || hex}
            onChange={(e) => setCustomHex(e.target.value)}
            className="h-8 w-8 cursor-pointer border border-zen-clay"
            aria-label="自定义颜色"
          />
        </div>

        <div className="mb-6">
          <label className="type-overline mb-2 block">界面字体</label>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFontId(f.id)}
                className={`px-3 py-2.5 text-left ${
                  selectedFontId === f.id ? 'border border-zen-coal' : 'border border-transparent'
                }`}
              >
                <p className="text-[13px]" style={{ fontFamily: f.cssFamily }}>{f.sample}</p>
                <p className="type-caption mt-0.5">{f.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-5">
          <button type="button" onClick={onClose} className="zen-quiet">取消</button>
          <button type="button" onClick={handleSave} disabled={busy} className="zen-action">
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
      className="zen-hit mb-1 flex w-full items-baseline py-2 text-left disabled:opacity-30"
    >
      <span className="type-h4">{label}</span>
      {sub ? <span className="ml-3 text-[12px] text-zen-stone">{sub}</span> : null}
    </button>
  );
}

export default function ProfilePage({
  user,
  onOpenAuth,
  onSignOut,
  editOpen: editOpenProp = false,
  onEditConsumed,
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const username = user?.user_metadata?.username || '';
  const accentHex = normalizeHex(user?.user_metadata?.accent_hex || '#C93756');
  const fontId = user?.user_metadata?.font_id || 'serif';

  useEffect(() => {
    if (!editOpenProp || !user) return;
    setEditOpen(true);
    onEditConsumed?.();
  }, [editOpenProp, user, onEditConsumed]);

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
    [user],
  );

  return (
    <>
      <PageShell title="设定">
        {!user ? (
          <button type="button" className="zen-action mb-6" onClick={onOpenAuth}>
            登录
          </button>
        ) : (
          <MenuRow label="编辑资料" sub={username || '用户名与颜色'} onClick={openEdit} />
        )}
        <DisplayFontPicker />
        <DisplayIconPicker />
        <MenuRow label="使用手册" onClick={() => {}} />
        <MenuRow label="关于色空" sub="把颜色收进抽屉" />
        {user ? (
          <button type="button" onClick={onSignOut} className="zen-quiet mt-8">
            退出登录
          </button>
        ) : null}
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

export { EditProfileSheet };
