import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { PROFILE_FONTS, applyProfileFont } from '../lib/profileFonts';

/**
 * 首次登录：设置用户名、代表色、界面字体 → 进入个人页
 */
export default function ProfileOnboardingPage({ user, supabase, onComplete }) {
  const defaultName = user?.email?.split('@')[0] || '';
  const [username, setUsername] = useState(defaultName);
  const [hex, setHex] = useState(PROFILE_ACCENT_PRESETS[0]);
  const [customHex, setCustomHex] = useState('');
  const [fontId, setFontId] = useState('serif');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const activeHex = normalizeProfileHex(customHex || hex);
  const textColor = pickReadableTextOnHex(activeHex);
  const colorName = getPoeticColorName(activeHex);
  const activeFont = PROFILE_FONTS.find((f) => f.id === fontId) || PROFILE_FONTS[0];

  useEffect(() => {
    applyProfileFont(fontId);
  }, [fontId]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSubmit = async () => {
    const name = username.trim().slice(0, 20) || defaultName || '用户';
    if (!supabase || !user) {
      setError('无法保存，请稍后重试。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          username: name,
          accent_hex: normalizeProfileHex(activeHex),
          font_id: fontId,
          profile_complete: true,
        },
      });
      if (err) throw err;
      applyProfileFont(fontId);
      onComplete?.();
    } catch (e) {
      setError(e.message || '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col overflow-y-auto bg-zen-paper">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(2.5rem,env(safe-area-inset-top,0px))]">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-extralight uppercase tracking-[0.35em] text-zen-ink/35">
            欢迎来到色空
          </p>
          <h1
            className={`mt-3 font-medium tracking-tight text-zen-ink ${activeFont.tailwindClass}`}
            style={{ fontFamily: activeFont.cssFamily }}
          >
            设置你的色彩身份
          </h1>
          <p className="mt-2 text-[13px] font-extralight leading-relaxed text-zen-ink/50">
            选择代表色与字体，它们会出现在你的个人页与全站阅读体验中。
          </p>
        </header>

        {/* 预览卡 */}
        <div
          className="mb-8 overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5"
          style={{ backgroundColor: activeHex, minHeight: '7.5rem' }}
        >
          <div className="flex min-h-[7.5rem] flex-col justify-end p-4">
            <p className="text-[10px] font-extralight tracking-widest" style={{ color: `${textColor}88` }}>
              {activeHex} · {colorName}
            </p>
            <p
              className={`text-xl font-medium tracking-tight ${activeFont.tailwindClass}`}
              style={{ color: textColor, fontFamily: activeFont.cssFamily }}
            >
              {username.trim() || defaultName || '你的名称'}
            </p>
          </div>
        </div>

        {/* 用户名 */}
        <section className="mb-6">
          <label className="mb-2 block text-[11px] font-extralight uppercase tracking-widest text-zen-ink/45">
            用户名
          </label>
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="输入你的名称…"
            className="w-full rounded-xl border border-zen-ink/12 bg-white px-4 py-3.5 text-sm font-extralight focus:border-zen-ink/25 focus:outline-none"
          />
        </section>

        {/* 代表色 */}
        <section className="mb-6">
          <label className="mb-2 block text-[11px] font-extralight uppercase tracking-widest text-zen-ink/45">
            代表色
          </label>
          <div className="mb-3 flex flex-wrap gap-2.5">
            {PROFILE_ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setHex(c); setCustomHex(''); }}
                className="relative h-9 w-9 rounded-full transition-transform hover:scale-105"
                style={{ backgroundColor: c }}
                aria-label={c}
                aria-pressed={hex === c && !customHex}
              >
                {hex === c && !customHex && (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className="absolute inset-0 m-auto"
                    style={{ color: pickReadableTextOnHex(c) }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHex || hex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-zen-ink/10"
              aria-label="自定义颜色"
            />
            <span className="text-[11px] font-extralight text-zen-ink/40">或自选颜色</span>
          </div>
        </section>

        {/* 字体 */}
        <section className="mb-8">
          <label className="mb-2 block text-[11px] font-extralight uppercase tracking-widest text-zen-ink/45">
            界面字体
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_FONTS.map((f) => {
              const selected = fontId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontId(f.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    selected
                      ? 'border-zen-ink bg-zen-ink/[0.04] ring-1 ring-zen-ink/20'
                      : 'border-zen-ink/10 bg-white hover:border-zen-ink/20'
                  }`}
                  aria-pressed={selected}
                >
                  <p
                    className={`text-lg font-medium leading-none ${f.tailwindClass}`}
                    style={{ fontFamily: f.cssFamily }}
                  >
                    {f.sample}
                  </p>
                  <p className="mt-2 text-[12px] font-extralight text-zen-ink">{f.label}</p>
                  <p className="text-[10px] font-extralight text-zen-ink/40">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <p className="mb-4 text-center text-[12px] font-extralight text-red-600">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !username.trim()}
          className="w-full rounded-full bg-zen-ink py-3.5 text-[12px] font-extralight uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              保存中…
            </span>
          ) : (
            '完成，进入我的页面'
          )}
        </button>
      </div>
    </div>
  );
}
