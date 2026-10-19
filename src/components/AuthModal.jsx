import React, { useEffect } from 'react';
import LoginFlipPrompt from './LoginFlipPrompt';

/**
 * In-app login uses the same ink card as the opening login.
 */
export default function AuthModal({ open, onClose, onAuthed, user }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="auth-login-splash" role="dialog" aria-modal="true" aria-label="登录">
      <div className="heytea-ink-drop is-spread is-flip is-login">
        <LoginFlipPrompt embedded user={user} onSkip={onClose} onAuthed={onAuthed} />
      </div>
    </div>
  );
}
