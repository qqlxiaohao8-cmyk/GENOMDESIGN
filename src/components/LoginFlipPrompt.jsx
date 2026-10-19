import React, { useEffect, useRef, useState } from 'react';
import { AccentPalette } from './AccentPalette';
import { authClient, authConfigured } from '../lib/authClient';
import { mapAuthUser } from '../lib/authUser';
import { needsProfileOnboarding } from '../lib/profileOnboarding';
import { PROFILE_ACCENT_PRESETS, normalizeProfileHex } from '../lib/profilePresets';
import { syncProfile } from '../lib/apiClient';

const redirectUrl = () => `${window.location.origin}${window.location.pathname}`;

/**
 * 未登录时登录。登录后在同一张卡片里写名称、选颜色，再进入主页。
 */
export default function LoginFlipPrompt({ onSkip, onAuthed, user, embedded = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState('signup');
  const pendingPassword = useRef(false);
  const [username, setUsername] = useState('');
  const [hex, setHex] = useState(PROFILE_ACCENT_PRESETS[0]);

  useEffect(() => {
    if (pendingPassword.current) return;
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
    // #region agent log
    fetch('http://127.0.0.1:7831/ingest/ef65ef3c-3104-4c0a-be13-54602fb0d2b1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b16066'},body:JSON.stringify({sessionId:'b16066',location:'LoginFlipPrompt.jsx:continueAfterAuth',message:'session after auth',data:{hasSessionUser:Boolean(data?.user),hasPropUser:Boolean(user)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const mapped = mapAuthUser(data?.user) || user;
    if (mapped && needsProfileOnboarding(mapped)) {
      const existing = mapped.user_metadata?.username?.trim();
      if (existing) setUsername(existing);
      setStep('name');
      return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7831/ingest/ef65ef3c-3104-4c0a-be13-54602fb0d2b1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b16066'},body:JSON.stringify({sessionId:'b16066',location:'LoginFlipPrompt.jsx:continueAfterAuth',message:'calling onAuthed',data:{hasMappedUser:Boolean(mapped)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    onAuthed?.();
  };

  const oauthGoogle = async () => {
    if (!authConfigured) return;
    setBusy(true);
    let error;
    let data;
    try {
      ({ error, data } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectUrl(),
      }));
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7831/ingest/ef65ef3c-3104-4c0a-be13-54602fb0d2b1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b16066'},body:JSON.stringify({sessionId:'b16066',location:'LoginFlipPrompt.jsx:oauthGoogle',message:'google threw',data:{name:e?.name||'Error'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setBusy(false);
      setMsg('Google 登录失败');
      return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7831/ingest/ef65ef3c-3104-4c0a-be13-54602fb0d2b1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b16066'},body:JSON.stringify({sessionId:'b16066',location:'LoginFlipPrompt.jsx:oauthGoogle',message:'google result',data:{hasError:Boolean(error),errorCode:error?.code||error?.status||null,hasUrl:Boolean(data?.url),redirect:Boolean(data?.redirect)},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setBusy(false);
    if (error) setMsg(error.message || 'Google 登录失败');
    else await continueAfterAuth();
  };

  const otpError = (error, fallback) => {
    const code = error?.code || '';
    if (code === 'OTP_EXPIRED') return '验证码已过期，请重新发送';
    if (code === 'INVALID_OTP') return '验证码不正确';
    if (code === 'TOO_MANY_ATTEMPTS') return '试太多次了，请重新发送';
    if (code === 'PASSWORD_TOO_SHORT') return '密码至少 8 位';
    if (code === 'INVALID_EMAIL_OR_PASSWORD') return '邮箱或密码不正确';
    return error?.message || fallback;
  };

  const sendEmailCode = async () => {
    if (!authConfigured || !email.trim()) {
      setMsg('请填写邮箱');
      return;
    }
    setBusy(true);
    setMsg('');
    const status = await authClient.signup.emailStatus({ email: email.trim() });
    if (status?.error) {
      setBusy(false);
      setMsg(otpError(status.error, '验证码发送失败'));
      return;
    }
    if (status?.data?.hasPassword) {
      setBusy(false);
      setMsg('这个邮箱已注册，请直接登录');
      return;
    }
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'sign-in',
    });
    setBusy(false);
    if (error) {
      setMsg(otpError(error, '验证码发送失败'));
      return;
    }
    setCodeSent(true);
    setMsg('验证码已发到邮箱');
  };

  const registerAccount = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setMsg('请填写邮箱');
      return;
    }
    if (!codeSent) {
      setMsg('请先发送验证码');
      return;
    }
    if (!otp.trim()) {
      setMsg('请填写验证码');
      return;
    }
    if (password.length < 8) {
      setMsg('密码至少 8 位');
      return;
    }
    pendingPassword.current = true;
    setBusy(true);
    setMsg('');
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: otp.trim(),
    });
    if (error) {
      pendingPassword.current = false;
      setBusy(false);
      setMsg(otpError(error, '验证失败'));
      return;
    }
    const { error: passwordError } = await authClient.setPassword({ newPassword: password });
    setBusy(false);
    if (passwordError) {
      if (passwordError.code === 'PASSWORD_ALREADY_SET') {
        pendingPassword.current = false;
        await authClient.signOut();
        setPassword('');
        setStep('login');
        setMsg('这个邮箱已注册，请直接登录');
        return;
      }
      setMsg(otpError(passwordError, '密码设置失败'));
      return;
    }
    pendingPassword.current = false;
    await continueAfterAuth();
  };

  const signInWithPassword = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMsg('请填写邮箱和密码');
      return;
    }
    setBusy(true);
    setMsg('');
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setMsg(otpError(error, '登录失败'));
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
            if (username.trim()) {
              setMsg('');
              setStep('color');
            }
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
        <AccentPalette hex={normalizeProfileHex(hex)} onChange={setHex} />
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

        <form className="mt-3 space-y-3" onSubmit={signInWithPassword}>
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
            {busy ? '登录中' : '登录'}
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
          className="mt-3 w-full border border-zen-coal py-2 font-heytea text-[15px] disabled:opacity-40"
        >
          用 Google 继续
        </button>

        <form className="mt-3 space-y-1" onSubmit={registerAccount}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setCodeSent(false);
              setOtp('');
            }}
            placeholder="邮箱"
            className="zen-input"
            autoComplete="email"
          />
          <div className="flex items-end gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="验证码"
              className="zen-input min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={sendEmailCode}
              disabled={busy || !email.trim()}
              className="zen-action mb-2 shrink-0 disabled:opacity-40"
            >
              {codeSent ? '重新发送' : '发送验证码'}
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="zen-input"
            autoComplete="new-password"
          />
          <div className="flex justify-end pt-3">
            <button type="submit" disabled={busy} className="login-next disabled:opacity-40">
              {busy ? '请稍候' : '下一步'}
            </button>
          </div>
        </form>

        <div className="mt-auto flex flex-col items-center gap-3 pt-3">
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
