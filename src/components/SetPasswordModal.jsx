import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Shown after user opens the password-reset link from email (Supabase PASSWORD_RECOVERY event).
 */
export default function SetPasswordModal({ supabase, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) return;
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) setError(err.message);
    else onSuccess?.();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zen-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md zen-panel p-8 space-y-4 border border-zen-ink/10 bg-zen-mist"
      >
        <h2 id="recovery-title" className="font-zenSerif text-xl font-medium tracking-tight text-zen-ink">
          Set new password
        </h2>
        <p className="text-xs font-extralight text-zen-ink/55">
          You opened a password reset link. Choose a new password to finish.
        </p>
        {error && (
          <p className="text-sm font-extralight text-red-700 border border-red-200 bg-red-50/80 rounded-xl p-3">{error}</p>
        )}
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className="zen-input"
        />
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          autoComplete="new-password"
          className="zen-input"
        />
        <button type="submit" disabled={loading} className="btn-art w-full py-4 rounded-lg text-[13px]">
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          Update password
        </button>
      </form>
    </div>
  );
}
