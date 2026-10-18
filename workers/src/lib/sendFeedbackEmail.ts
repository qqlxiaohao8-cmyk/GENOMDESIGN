type FeedbackMailEnv = {
  FEEDBACK_TO_EMAIL?: string;
  FEEDBACK_FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL?: {
    send: (payload: {
      to: string;
      from: { email: string; name?: string };
      subject: string;
      text: string;
    }) => Promise<unknown>;
  };
};

function inbox(env: FeedbackMailEnv) {
  const to = String(env.FEEDBACK_TO_EMAIL || '').trim();
  return to.includes('@') ? to : '';
}

export async function sendFeedbackEmail(
  env: FeedbackMailEnv,
  text: string,
  meta: { fromUser?: string },
) {
  const to = inbox(env);
  if (!to) return false;

  const from = String(env.FEEDBACK_FROM_EMAIL || 'noreply@sekong.app').trim();
  const subject = '色空 · 建议反馈';
  const body = meta.fromUser ? `${text}\n\n—— ${meta.fromUser}` : text;

  if (typeof env.EMAIL?.send === 'function') {
    await env.EMAIL.send({
      to,
      from: { email: from, name: '色空' },
      subject,
      text: body,
    });
    return true;
  }

  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `色空 <${from}>`,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) throw new Error('mail_failed');
    return true;
  }

  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: subject,
      message: body,
    }),
  });
  if (!res.ok) throw new Error('mail_failed');
  return true;
}
