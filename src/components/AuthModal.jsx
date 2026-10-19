import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
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
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [signupPhase, setSignupPhase] = useState('email');
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
    setOtp('');
    setPassword('');
    setCodeSent(false);
    setSignupPhase('email');
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

  const sendEmailCode = async () => {
    if (!authConfigured || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const status = await authClient.signup.emailStatus({ email: email.trim() });
    if (status?.error) {
      setLoading(false);
      setMsg({ type: 'err', text: status.error.message || 'Could not send the code.' });
      return;
    }
    if (status?.data?.hasPassword) {
      setLoading(false);
      setMsg({ type: 'err', text: 'This email is already registered. Sign in with your password.' });
      return;
    }
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'sign-in',
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message || 'Could not send the code.' });
    else {
      setCodeSent(true);
      setSignupPhase('code');
      setMsg({ type: 'ok', text: 'Verification code sent to your email.' });
    }
  };

  const signInWithPassword = async (e) => {
    e?.preventDefault?.();
    if (!email.trim() || !password) {
      setMsg({ type: 'err', text: 'Enter your email and password.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const text = error.code === 'INVALID_EMAIL_OR_PASSWORD'
        ? 'Email or password is incorrect.'
        : (error.message || 'Sign-in failed.');
      setMsg({ type: 'err', text });
      return;
    }
    onClose();
  };

  const continueSignupCode = (e) => {
    e?.preventDefault?.();
    if (!codeSent) {
      sendEmailCode();
      return;
    }
    if (otp.trim().length < 6) {
      setMsg({ type: 'err', text: 'Enter the code from your email.' });
      return;
    }
    resetMsg();
    setSignupPhase('password');
  };

  const finishSignup = async (e) => {
    e?.preventDefault?.();
    if (password.length < 8) {
      setMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    resetMsg();
    const meta = profilePayload();
    setLoading(true);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: otp.trim(),
      ...(meta.full_name ? { name: meta.full_name } : {}),
    });
    if (error) {
      setLoading(false);
      setSignupPhase('code');
      const text = error.code === 'INVALID_OTP'
        ? 'That code is incorrect.'
        : (error.message || 'Could not verify the code.');
      setMsg({ type: 'err', text });
      return;
    }
    const { error: passwordError } = await authClient.setPassword({ newPassword: password });
    setLoading(false);
    if (passwordError) {
      if (passwordError.code === 'PASSWORD_ALREADY_SET') {
        await authClient.signOut();
        setPanel('main');
        setSignupPhase('email');
        setMsg({ type: 'err', text: 'This email is already registered. Sign in with your password.' });
        return;
      }
      setMsg({ type: 'err', text: passwordError.message || 'Could not set the password.' });
      return;
    }
    onClose();
    setOtp('');
    setPassword('');
    setCodeSent(false);
    setSignupPhase('email');
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
          <h2 id="auth-modal-title" className="type-h1 mb-6">
            {panel === 'signup' ? 'Create account' : 'Sign in'}
          </h2>

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
                  <span className="bg-white px-3 text-zen-ink/45">Or email</span>
                </div>
              </div>

              <form className="space-y-3" onSubmit={signInWithPassword}>
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
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="zen-input"
                />
                <button type="submit" disabled={!authConfigured || loading} className="btn-primary w-full py-4 rounded-lg text-[13px]">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Sign in
                </button>
              </form>

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

              {signupPhase === 'password' ? (
                <form className="space-y-3" onSubmit={finishSignup}>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="new-password"
                    className="zen-input"
                  />
                  <button type="submit" disabled={!authConfigured || loading} className="btn-art w-full py-4 rounded-lg text-[13px]">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                    Create account
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={continueSignupCode}>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/35 w-4 h-4 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setCodeSent(false);
                        setOtp('');
                        setSignupPhase('email');
                      }}
                      placeholder="you@email.com"
                      autoComplete="email"
                      className="zen-input pl-11"
                    />
                  </div>
                  {codeSent ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Email code"
                      className="zen-input"
                    />
                  ) : null}
                  <button type="submit" disabled={!authConfigured || loading} className="btn-art w-full py-4 rounded-lg text-[13px]">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                    {codeSent ? 'Next' : 'Send code'}
                  </button>
                </form>
              )}

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
