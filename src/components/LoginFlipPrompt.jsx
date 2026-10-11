import React, { useState } from 'react';
import { authClient, authConfigured } from '../lib/authClient';

const PAGES = [
  {
    title: '把颜色收进抽屉',
    body: '登录后，喜欢的色卡会停在「我的」里，随时打开再用。',
  },
  {
    title: '参加今日的颜色',
    body: '每天一色。用它做一张卡，看看昨天谁画得最像。',
  },
  {
    title: '出门采色，或记住色块',
    body: 'Color Walk 与色彩记忆会记下你走过的颜色。',
  },
];

const redirectUrl = () => `${window.location.origin}${window.location.pathname}`;

/**
 * 未登录翻页：先看解锁内容，最后一页是登录方式。
 */
export default function LoginFlipPrompt({ onSkip, onAuthed, embedded = false }) {
  const [page, setPage] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const last = page >= PAGES.length;

  const oauthGoogle = async () => {
    if (!authConfigured) return;
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectUrl(),
    });
    setBusy(false);
    if (error) setMsg(error.message || 'Google 登录失败');
    else onAuthed?.();
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
    else onAuthed?.();
  };

  const body = !last ? (
    <>
      <p className="font-heytea text-[11px] tracking-[0.16em] text-zen-stone">
        {String(page + 1).padStart(2, '0')} / 04
      </p>
      <h2 className="type-h2 mt-6">{PAGES[page].title}</h2>
      <p className="type-body mt-4 max-w-[16rem]">{PAGES[page].body}</p>
      <div className="mt-auto flex items-baseline justify-between pt-8">
        <button type="button" className="zen-quiet" onClick={onSkip}>
          先去色海
        </button>
        <button
          type="button"
          className="zen-action"
          onClick={() => setPage((n) => n + 1)}
        >
          下一页
        </button>
      </div>
    </>
  ) : (
    <>
      <p className="font-heytea text-[11px] tracking-[0.16em] text-zen-stone">04 / 04</p>
      <h2 className="type-h2 mt-5">登录色空</h2>
      {!authConfigured ? (
        <p className="type-body-sm mt-3 text-zen-stone">登录服务暂未连上。</p>
      ) : null}
      {msg ? <p className="type-body-sm mt-2 text-zen-vermilion">{msg}</p> : null}

      <button
        type="button"
        onClick={oauthGoogle}
        disabled={busy || !authConfigured}
        className="mt-6 w-full border border-zen-coal py-2.5 font-heytea text-[15px] disabled:opacity-40"
      >
        用 Google 继续
      </button>

      <form className="mt-4 space-y-3" onSubmit={passwordSignIn}>
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
          邮箱登录
        </button>
      </form>

      <button type="button" className="zen-quiet mt-auto pt-6" onClick={onSkip}>
        先去色海
      </button>
    </>
  );

  const card = embedded ? (
    <div className="heytea-ink-card-fill flex flex-col">{body}</div>
  ) : (
    <div className="heytea-flip-stage">
      <div className="heytea-flip-card flex flex-col">{body}</div>
    </div>
  );

  if (embedded) return card;

  return (
    <div className="heytea-splash" role="dialog" aria-label="登录提示">
      {card}
    </div>
  );
}
