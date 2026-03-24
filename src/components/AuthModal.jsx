import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail, Lock } from 'lucide-react';
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

export default function AuthModal({ open, onClose, supabase }) {
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
    if (!supabase) return;
    resetMsg();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl() },
    });
    if (error) {
      setLoading(false);
      setMsg({ type: 'err', text: error.message });
    }
  };

  const passwordSignIn = async (e) => {
    e?.preventDefault?.();
    if (!supabase || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email.' });
      return;
    }
    if (!password) {
      setMsg({ type: 'err', text: 'Enter your password.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else {
      onClose();
      setPassword('');
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase || !email.trim()) {
      setMsg({ type: 'err', text: 'Enter your email above first.' });
      return;
    }
    resetMsg();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl(),
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else
      setMsg({
        type: 'ok',
        text: 'If that email is registered, you will receive a reset link shortly.',
      });
  };

  const passwordSignUp = async (e) => {
    e?.preventDefault?.();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!supabase || !email.trim()) {
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
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: {
          first_name: meta.first_name,
          last_name: meta.last_name,
          full_name: meta.full_name,
        },
      },
    });
    setLoading(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else
      setMsg({
        type: 'ok',
        text: 'Account created. Confirm your email if required, then sign in.',
      });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md border-2 border-black rounded-[2rem] bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-black hover:bg-[#ccff00] transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 pt-12">
          <h2 id="auth-modal-title" className="text-2xl font-black uppercase tracking-tighter mb-1">
            {panel === 'signup' ? 'Create account' : 'Sign in'}
          </h2>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6">
            {panel === 'signup'
              ? 'New here? Choose email or Google.'
              : 'Welcome back — Google or your email and password.'}
          </p>

          {!supabase && (
            <p className="text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-xl p-3 mb-4">
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.
            </p>
          )}

          {msg && (
            <p
              className={`text-sm font-bold rounded-xl p-3 mb-4 border-2 ${
                msg.type === 'err'
                  ? 'text-red-600 border-red-500 bg-red-50'
                  : 'text-green-800 border-green-600 bg-green-50'
              }`}
            >
              {msg.text}
            </p>
          )}

          {panel === 'main' && (
            <div className="space-y-5">
              <button
                type="button"
                disabled={!supabase || loading}
                onClick={oauthGoogle}
                className="w-full py-4 rounded-full border-2 border-black font-black text-xs uppercase tracking-widest bg-white hover:bg-[#ccff00] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t-2 border-black/15" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-white px-3 text-neutral-500">Or email &amp; password</span>
                </div>
              </div>

              <form className="space-y-3" onSubmit={passwordSignIn}>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                  <input
                    data-auth-focus
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!supabase || loading}
                  className="w-full py-4 rounded-full border-2 border-black font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(204,255,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Sign in
                </button>
                <button
                  type="button"
                  disabled={!supabase || loading}
                  onClick={sendPasswordReset}
                  className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#00c2d6] hover:underline"
                >
                  Forgot password?
                </button>
              </form>

              <div className="pt-2 border-t-2 border-dashed border-black/10">
                <p className="text-[9px] font-bold text-neutral-400 px-1 leading-snug text-center">
                  Supabase → Authentication → Providers: enable Google &amp; Email. Redirect URL:{' '}
                  <span className="font-mono break-all">{redirectUrl()}</span>
                </p>
              </div>

              <p className="text-center text-sm font-bold text-neutral-600 pt-2">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={goSignUp}
                  className="font-black text-black underline decoration-2 underline-offset-4 hover:text-[#00c2d6]"
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
                  className="w-full px-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                />
              </div>
              <button
                type="button"
                disabled={!supabase || loading}
                onClick={oauthGoogle}
                className="w-full py-4 rounded-full border-2 border-black font-black text-xs uppercase tracking-widest bg-white hover:bg-[#ccff00] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t-2 border-black/15" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-white px-3 text-neutral-500">Or create with email</span>
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
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!supabase || loading}
                  className="w-full py-4 rounded-full border-2 border-black font-black text-xs uppercase tracking-widest bg-[#ccff00] hover:brightness-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Create account
                </button>
              </form>

              <p className="text-center text-sm font-bold text-neutral-600 pt-2">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={goSignIn}
                  className="font-black text-black underline decoration-2 underline-offset-4 hover:text-[#00c2d6]"
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
