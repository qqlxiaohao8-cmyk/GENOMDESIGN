import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { authClient, authConfigured } from '../lib/authClient';
import { mapAuthUser } from '../lib/authUser';
import { needsProfileOnboarding } from '../lib/profileOnboarding';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { syncProfile } from '../lib/apiClient';

const redirectUrl = () => `${window.location.origin}${window.location.pathname}`;

/**
 * 未登录时登录。登录后在同一张卡片里写名称、选颜色，再进入主页。
 */
export default function LoginFlipPrompt({ onSkip, onAuthed, user, embedded = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState('signup');
  const [username, setUsername] = useState('');
  const [hex, setHex] = useState(PROFILE_ACCENT_PRESETS[0]);

  useEffect(() => {
    if ((step !== 'login' && step !== 'signup') || !user) return;
    if (!needsProfileOnboarding(user)) {
      onAuthed?.();
      return;
    }
    const existing = user.user_metadata?.username?.trim();
    if (existing) setUsername(existing);
    setStep('name');
  }, [user, step, onAuthed]);

  const continueAfterAuth = async () => {
    const { data } = await authClient.getSession();
    const mapped = mapAuthUser(data?.user) || user;
    if (mapped && needsProfileOnboarding(mapped)) {
      const existing = mapped.user_metadata?.username?.trim();
      if (existing) setUsername(existing);
      setStep('name');
      return;
    }
    onAuthed?.();
  };

  const oauthGoogle = async () => {
    if (!authConfigured) return;
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectUrl(),
    });
    setBusy(false);
    if (error) setMsg(error.message || 'Google 登录失败');
    else await continueAfterAuth();
  };

  const passwordSignUp = async (e) => {
    e.preventDefault();
    if (!authConfigured || !email.trim() || !password) {
      setMsg('请填写邮箱和密码');
      return;
    }
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: email.trim().split('@')[0],
      callbackURL: redirectUrl(),
    });
    setBusy(false);
    if (error) setMsg(error.message || '注册失败');
    else await continueAfterAuth();
  };

  const passwordSignIn = async (e) => {
    e.preventDefault();
    if (!authConfigured || !email.trim() || !password) {
      setMsg('请填写邮箱和密码');
      return;
    }
    setBusy(true);
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
      callbackURL: redirectUrl(),
    });
    setBusy(false);
    if (error) setMsg(error.message || '登录失败');
    else await continueAfterAuth();
  };

  const finishProfile = async () => {
    const name = username.trim().slice(0, 20);
    if (!name) return;
    setBusy(true);
    setMsg('');
    try {
      const { error } = await authClient.updateUser({
        username: name,
        accent_hex: normalizeProfileHex(hex),
        font_id: 'serif',
        profile_complete: true,
      });
      if (error) throw error;
      await authClient.getSession();
      await syncProfile();
      onAuthed?.();
    } catch (e) {
      setMsg(e.message || '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (step === 'name') {
    body = (
      <>
        <h2 className="type-h2">你的名称</h2>
        <form
          className="mt-6 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim()) setStep('color');
          }}
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            placeholder="输入名称"
            className="zen-input"
            autoComplete="nickname"
            autoFocus
          />
          <div className="mt-auto flex justify-end pt-8">
            <button
              type="submit"
              className="zen-action disabled:opacity-40"
              disabled={!username.trim()}
            >
              下一页
            </button>
          </div>
        </form>
      </>
    );
  } else if (step === 'color') {
    body = (
      <>
        <h2 className="type-h2">你的颜色</h2>
        <div className="mt-6 grid grid-cols-5 gap-3">
          {PROFILE_ACCENT_PRESETS.map((c) => {
            const selected = normalizeProfileHex(hex) === normalizeProfileHex(c);
            return (
              <button
                key={c}
                type="button"
                className="relative mx-auto h-9 w-9 rounded-full"
                style={{ backgroundColor: c }}
                aria-label={c}
                aria-pressed={selected}
                onClick={() => setHex(c)}
              >
                {selected ? (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className="absolute inset-0 m-auto"
                    style={{ color: pickReadableTextOnHex(c) }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        {msg ? <p className="type-body-sm mt-3 text-zen-vermilion">{msg}</p> : null}
        <div className="mt-auto flex justify-end pt-8">
          <button
            type="button"
            className="zen-action disabled:opacity-40"
            disabled={busy}
            onClick={finishProfile}
          >
            {busy ? '保存中' : '进入'}
          </button>
        </div>
      </>
    );
  } else if (step === 'login') {
    body = (
      <>
        <h2 className="type-h2 text-center">登录</h2>
        {!authConfigured ? (
          <p className="type-body-sm mt-3 text-center text-zen-stone">登录服务暂未连上。</p>
        ) : null}
        {msg ? <p className="type-body-sm mt-2 text-center text-zen-vermilion">{msg}</p> : null}

        <button
          type="button"
          onClick={oauthGoogle}
          disabled={busy || !authConfigured}
          className="mt-4 w-full border border-zen-coal py-2.5 font-heytea text-[15px] disabled:opacity-40"
        >
          用 Google 继续
        </button>

        <form className="mt-3 space-y-3" onSubmit={passwordSignIn}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="zen-input"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="zen-input"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="zen-action disabled:opacity-40"
          >
            登录
          </button>
        </form>

        <div className="mt-auto flex flex-col items-center gap-3 pt-3">
          <button
            type="button"
            className="zen-action"
            onClick={() => { setMsg(''); setStep('signup'); }}
          >
            注册账号
          </button>
          <button type="button" className="zen-quiet" onClick={onSkip}>
            旅客模式
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h2 className="type-h2 text-center">注册账号</h2>
        {!authConfigured ? (
          <p className="type-body-sm mt-3 text-center text-zen-stone">登录服务暂未连上。</p>
        ) : null}
        {msg ? <p className="type-body-sm mt-2 text-center text-zen-vermilion">{msg}</p> : null}

        <button
          type="button"
          onClick={oauthGoogle}
          disabled={busy || !authConfigured}
          className="mt-6 w-full border border-zen-coal py-2.5 font-heytea text-[15px] disabled:opacity-40"
        >
          用 Google 继续
        </button>

        <form className="mt-4 space-y-3" onSubmit={passwordSignUp}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="zen-input"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="zen-input"
            autoComplete="new-password"
          />
          <button type="submit" className="sr-only">注册</button>
        </form>

        <div className="mt-auto flex flex-col items-center gap-4 pt-6">
          <button
            type="button"
            className="zen-action"
            onClick={() => { setMsg(''); setStep('login'); }}
          >
            已有账号
          </button>
          <button type="button" className="zen-quiet" onClick={onSkip}>
            旅客模式
          </button>
        </div>
      </>
    );
  }

  const card = embedded ? (
    <div className="heytea-ink-card-fill flex flex-col">{body}</div>
  ) : (
    <div className="heytea-flip-stage">
      <div className="heytea-flip-card flex flex-col">{body}</div>
    </div>
  );

  if (embedded) return card;

  return (
    <div className="heytea-splash" role="dialog" aria-label="登录">
      {card}
    </div>
  );
}
