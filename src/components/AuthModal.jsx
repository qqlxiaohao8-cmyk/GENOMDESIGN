import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail, Lock } from 'lucide-react';
import { authClient, authConfigured } from '../lib/authClient';
import { buildFullName } from '../lib/pendingProfile';

const redirectUrl = () => `${window.location.origin}${window.location.pathname}`;

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function AuthModal({ open, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [panel, setPanel] = useState('main');

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setMsg(null);
    setPanel('main');
    setFirstName('');
    setLastName('');
    setPassword('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      if (panel === 'main') document.querySelector('[data-auth-focus]')?.focus();
      if (panel === 'signup') document.querySelector('[data-signup-focus]')?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open, panel]);

  if (!open) return null;

  const resetMsg = () => setMsg(null);

  const goSignIn = () => {
    setPanel('main');
    resetMsg();
  };

  const goSignUp = () => {
    setPanel('signup');
    resetMsg();
  };

  const profilePayload = () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const full = buildFullName(fn, ln);
    return {
      first_name: fn,
      last_name: ln,
      full_name: full,
    };
  };

  const oauthGoogle = async () => {
    if (!authConfigured) return;
    resetMsg();
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectUrl(),
    });
    if (error) {
      setLoading(false);
      setMsg({ type: 'err', text: error.message || 'Google sign-in failed.' });
    }
  };

  const passwordSignIn = async (e) => {
    e?.preventDefault?.();
    if (!authConfigured || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email.' });
      return;
    }
    if (!password) {
      setMsg({ type: 'err', text: 'Enter your password.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
      callbackURL: redirectUrl(),
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else {
      onClose();
      setPassword('');
    }
  };

  const sendPasswordReset = async () => {
    if (!authConfigured || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email above first.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: redirectUrl(),
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else
      setMsg({
        type: 'ok',
        text: 'If that email is registered, check the API console for the reset link (dev mode).',
      });
  };

  const passwordSignUp = async (e) => {
    e?.preventDefault?.();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!authConfigured || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email.' });
      return;
    }
    if (!fn || !ln) {
      setMsg({ type: 'err', text: 'Enter your first and last name.' });
      return;
    }
    if (!password) {
      setMsg({ type: 'err', text: 'Choose a password.' });
      return;
    }
    resetMsg();
    const meta = profilePayload();
    setLoading(true);
    const { error } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: meta.full_name,
      callbackURL: redirectUrl(),
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else {
      onClose();
      setPassword('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-zen-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="zen-modal-surface">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-zen-ink/15 text-zen-ink hover:bg-zen-ink/[0.04] transition-colors duration-[2000ms] z-10 focus:outline-none focus-visible:ring-1 focus-visible:ring-zen-vermilion/40"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 pt-12">
          <h2 id="auth-modal-title" className="type-h1 mb-1">
            {panel === 'signup' ? 'Create account' : 'Sign in'}
          </h2>
          <p className="text-xs font-extralight text-zen-ink/50 uppercase tracking-[0.2em] mb-6">
            {panel === 'signup'
              ? 'New here? Choose email or Google.'
              : 'Welcome back — Google or your email and password.'}
          </p>

          {!authConfigured && (
            <p className="text-sm font-extralight text-red-700 border border-red-200 bg-red-50/80 rounded-xl p-3 mb-4">
              Auth API unavailable. Run <code className="font-mono text-xs">npm run dev:api</code> in another terminal.
            </p>
          )}

          {msg && (
            <p
              className={`text-sm font-extralight rounded-xl p-3 mb-4 border ${
                msg.type === 'err'
                  ? 'text-red-700 border-red-200 bg-red-50/80'
                  : 'text-emerald-900 border-emerald-200 bg-emerald-50/80'
              }`}
            >
              {msg.text}
            </p>
          )}

          {panel === 'main' && (
            <div className="space-y-5">
              <button
                type="button"
                disabled={!authConfigured || loading}
                onClick={oauthGoogle}
                className="btn-outline w-full py-4 rounded-lg text-[13px]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-zen-ink/10" />
                </div>
                <div className="relative flex justify-center zen-micro-label">
                  <span className="bg-white px-3 text-zen-ink/45">Or email &amp; password</span>
                </div>
              </div>

              <form className="space-y-3" onSubmit={passwordSignIn}>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/35 w-4 h-4 pointer-events-none" />
                  <input
                    data-auth-focus
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="zen-input pl-11"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/35 w-4 h-4 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="zen-input pl-11"
                  />
                </div>
                <button type="submit" disabled={!authConfigured || loading} className="btn-primary w-full py-4 rounded-lg text-[13px]">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Sign in
                </button>
                <button
                  type="button"
                  disabled={!authConfigured || loading}
                  onClick={sendPasswordReset}
                  className="w-full text-center zen-micro-label text-zen-vermilion/90 hover:underline decoration-zen-vermilion/30 underline-offset-4 transition-colors duration-[2000ms]"
                >
                  Forgot password?
                </button>
              </form>

              <div className="pt-2 border-t border-dashed border-zen-ink/10">
                <p className="text-[9px] font-extralight text-zen-ink/45 px-1 leading-snug text-center">
                  Google OAuth redirect:{' '}
                  <span className="font-mono break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/google
                  </span>
                </p>
              </div>

              <p className="text-center text-sm font-extralight text-zen-ink/60 pt-2">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={goSignUp}
                  className="text-zen-ink underline decoration-zen-ink/25 underline-offset-4 hover:text-zen-vermilion transition-colors duration-[2000ms]"
                >
                  Sign up!
                </button>
              </p>
            </div>
          )}

          {panel === 'signup' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  data-signup-focus
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="zen-input"
                />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="zen-input"
                />
              </div>
              <button
                type="button"
                disabled={!authConfigured || loading}
                onClick={oauthGoogle}
                className="btn-outline w-full py-4 rounded-lg text-[13px]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-zen-ink/10" />
                </div>
                <div className="relative flex justify-center zen-micro-label">
                  <span className="bg-white px-3 text-zen-ink/45">Or create with email</span>
                </div>
              </div>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  passwordSignUp(e);
                }}
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/35 w-4 h-4 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="zen-input pl-11"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/35 w-4 h-4 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                    className="zen-input pl-11"
                  />
                </div>
                <button type="submit" disabled={!authConfigured || loading} className="btn-art w-full py-4 rounded-lg text-[13px]">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Create account
                </button>
              </form>

              <p className="text-center text-sm font-extralight text-zen-ink/60 pt-2">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={goSignIn}
                  className="text-zen-ink underline decoration-zen-ink/25 underline-offset-4 hover:text-zen-vermilion transition-colors duration-[2000ms]"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
