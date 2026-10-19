type LoginCodeEnv = {
  BETTER_AUTH_URL?: string;
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

export async function sendLoginCode(env: LoginCodeEnv, to: string, otp: string) {
  const from = String(env.FEEDBACK_FROM_EMAIL || 'noreply@sekong.app').trim();
  const subject = '色空验证码';
  const text = `你的验证码是 ${otp}，5分钟内有效。`;

  if (typeof env.EMAIL?.send === 'function') {
    await env.EMAIL.send({
      to,
      from: { email: from, name: '色空' },
      subject,
      text,
    });
    return;
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
        text,
      }),
    });
    if (!res.ok) throw new Error('验证码发送失败');
    return;
  }

  const local = String(env.BETTER_AUTH_URL || '').includes('localhost');
  console.log(`[色空] 验证码 ${to}: ${otp}`);
  if (!local) throw new Error('验证码发送失败');
}
