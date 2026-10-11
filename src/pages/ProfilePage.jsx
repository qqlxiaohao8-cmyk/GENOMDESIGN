import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { PROFILE_FONTS } from '../lib/profileFonts';
import { authClient } from '../lib/authClient';
import { syncProfile } from '../lib/apiClient';
import { readSfxVolume, writeSfxVolume } from '../lib/sfxVolume';
import sekongLogo from '../assets/sekong-mark.png';

const normalizeHex = normalizeProfileHex;

const HANDBOOK = [
  { title: '我的', body: '收藏的色卡、今日颜色，还有可以参加的小活动，都停在这里。' },
  { title: '色海', body: '看别人做好的色卡。点开一条，可以收藏，或带到生色里接着改。' },
  { title: '生色', body: '从空白开始做一组颜色。调完可以收下，也可以放到色海里。' },
  { title: '取色', body: '从一张照片抽出颜色，再整理成色卡。' },
];

const THANKS = [
  { title: '汉仪字库', body: '标题用汉仪古趣，正文用汉仪宋朱墨。' },
  { title: '一起看颜色的人', body: '色海里每一张被收下的卡，都让这片海更密一点。' },
];

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

function SettingsSheet({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[80vh] w-full max-w-sm overflow-y-auto bg-zen-paper p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <h3 className="type-h3">{title}</h3>
        <div className="mt-5">{children}</div>
        <button type="button" className="zen-quiet mt-8" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

function MenuRow({ label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="zen-hit mb-1 flex w-full items-baseline py-2.5 text-left"
    >
      <span className="type-h4">{label}</span>
      {sub ? <span className="ml-3 text-[12px] text-zen-stone">{sub}</span> : null}
    </button>
  );
}

export default function ProfilePage({
  user,
  onSignOut,
  editOpen: editOpenProp = false,
  onEditConsumed,
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [volume, setVolume] = useState(readSfxVolume);
  const [sheet, setSheet] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const username = user?.user_metadata?.username || '';
  const accentHex = normalizeHex(user?.user_metadata?.accent_hex || '#C93756');
  const fontId = user?.user_metadata?.font_id || 'serif';

  useEffect(() => {
    if (!editOpenProp || !user) return;
    setEditOpen(true);
    onEditConsumed?.();
  }, [editOpenProp, user, onEditConsumed]);

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

  const copyFeedback = async () => {
    const text = feedback.trim();
    if (!text) {
      setFeedbackMsg('先写一点想法');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setFeedbackMsg('已复制，之后可以发给我们');
    } catch {
      setFeedbackMsg('复制没有成功，请再试一次');
    }
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
        <div className="flex shrink-0 flex-col items-center px-5 pb-2 pt-10 md:pt-14">
          <img
            src={sekongLogo}
            alt="色空"
            className="sekong-settings-logo"
            draggable={false}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="zen-page-enter zen-page-body min-h-full pt-4">
            <section className="mb-8">
              <div className="flex items-baseline justify-between">
                <p className="type-h4">音量</p>
                <span className="type-caption tabular-nums">{volume}</span>
              </div>
              <p className="type-caption mt-1">之后会加入点击的特效音</p>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const next = writeSfxVolume(e.target.value);
                  setVolume(next);
                }}
                className="heytea-volume mt-4"
                aria-label="音量"
              />
            </section>

            <MenuRow label="建议反馈" onClick={() => { setFeedbackMsg(''); setSheet('feedback'); }} />
            <MenuRow label="使用手册" onClick={() => setSheet('handbook')} />
            <MenuRow label="特别鸣谢" onClick={() => setSheet('thanks')} />

            {user ? (
              <button type="button" onClick={onSignOut} className="zen-quiet mt-10">
                退出登录
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {sheet === 'feedback' ? (
        <SettingsSheet title="建议反馈" onClose={() => setSheet(null)}>
          <p className="type-body">用得不顺，或想多要一个功能，写在这里。</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            className="zen-input mt-4 resize-none"
            placeholder="想说的话"
          />
          {feedbackMsg ? <p className="type-body-sm mt-2 text-zen-stone">{feedbackMsg}</p> : null}
          <button type="button" className="zen-action mt-5" onClick={copyFeedback}>
            复制这段话
          </button>
        </SettingsSheet>
      ) : null}

      {sheet === 'handbook' ? (
        <SettingsSheet title="使用手册" onClose={() => setSheet(null)}>
          <ul className="space-y-5">
            {HANDBOOK.map((item) => (
              <li key={item.title}>
                <p className="type-h4">{item.title}</p>
                <p className="type-body mt-1.5">{item.body}</p>
              </li>
            ))}
          </ul>
        </SettingsSheet>
      ) : null}

      {sheet === 'thanks' ? (
        <SettingsSheet title="特别鸣谢" onClose={() => setSheet(null)}>
          <ul className="space-y-5">
            {THANKS.map((item) => (
              <li key={item.title}>
                <p className="type-h4">{item.title}</p>
                <p className="type-body mt-1.5">{item.body}</p>
              </li>
            ))}
          </ul>
        </SettingsSheet>
      ) : null}

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
