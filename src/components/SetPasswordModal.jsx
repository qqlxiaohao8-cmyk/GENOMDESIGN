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
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md border-2 border-black rounded-[2rem] bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 space-y-4"
      >
        <h2 id="recovery-title" className="text-xl font-black uppercase tracking-tighter">
          Set new password
        </h2>
        <p className="text-xs font-bold text-neutral-500">You opened a password reset link. Choose a new password to finish.</p>
        {error && (
          <p className="text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-xl p-3">{error}</p>
        )}
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className="w-full px-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
        />
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          autoComplete="new-password"
          className="w-full px-4 py-3 border-2 border-black rounded-full font-bold text-sm focus:outline-none focus:bg-[#ccff00]/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full border-2 border-black font-black text-xs uppercase tracking-widest bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          Update password
        </button>
      </form>
    </div>
  );
}
