import React, { useEffect, useRef, useState } from 'react';
import { clearDisplayFont, loadDisplayFont, saveDisplayFontFile } from '../lib/displayFont';

/**
 * 设定里上传喜茶感手写字体，立刻用在标题和导航。
 */
export default function DisplayFontPicker() {
  const inputRef = useRef(null);
  const [info, setInfo] = useState({ name: '', source: 'default' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDisplayFont().then((next) => {
      if (!cancelled) setInfo(next);
    });
    return () => { cancelled = true; };
  }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    try {
      const saved = await saveDisplayFontFile(file);
      setInfo({ name: saved.name, source: 'upload' });
    } catch (err) {
      setMsg(err.message || '字体没有读进去');
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setBusy(true);
    setMsg('');
    try {
      await clearDisplayFont();
      setInfo({ name: '', source: 'default' });
    } catch {
      setMsg('还原失败');
    } finally {
      setBusy(false);
    }
  };

  const current = info.source === 'default' || info.source === 'bundled'
    ? '现在用汉仪古趣'
    : `现在用 ${info.name}`;

  return (
    <section className="mb-8">
      <p className="type-h4">标题字体</p>
      <p className="type-body-sm mt-1 text-zen-stone">{current}</p>
      <p className="mt-3 font-heytea text-[1.65rem] tracking-[0.08em] text-zen-coal">色空</p>
      {msg ? <p className="type-body-sm mt-2 text-zen-vermilion">{msg}</p> : null}

      <div className="mt-4 flex flex-wrap items-baseline gap-5">
        <button
          type="button"
          className="zen-action"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          上传字体
        </button>
        {info.source !== 'default' ? (
          <button type="button" className="zen-quiet" disabled={busy} onClick={onReset}>
            还原默认
          </button>
        ) : null}
      </div>
      <p className="type-caption mt-3">ttf / otf / woff / woff2，用在标题和底栏。正文仍保持清淡。</p>
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        className="hidden"
        onChange={onPick}
      />
    </section>
  );
}
