import React, { useEffect, useRef, useState } from 'react';
import {
  DISPLAY_ICON_SLOTS,
  clearAllDisplayIcons,
  clearDisplayIcon,
  saveDisplayIconFile,
  subscribeDisplayIcons,
} from '../lib/displayIcons';
import {
  IconExtract,
  IconMemory,
  IconMine,
  IconSea,
  IconSettings,
  IconShengSe,
  IconWalk,
} from './icons/HeyteaIcons';

const PREVIEW = {
  mine: IconMine,
  sea: IconSea,
  shengse: IconShengSe,
  extract: IconExtract,
  settings: IconSettings,
  memory: IconMemory,
  walk: IconWalk,
};

export default function DisplayIconPicker() {
  const [srcs, setSrcs] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const pendingKey = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => subscribeDisplayIcons(setSrcs), []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    const key = pendingKey.current;
    e.target.value = '';
    pendingKey.current = null;
    if (!file || !key) return;
    setBusy(true);
    setMsg('');
    try {
      await saveDisplayIconFile(key, file);
    } catch (err) {
      setMsg(err.message || '图标没有读进去');
    } finally {
      setBusy(false);
    }
  };

  const uploaded = DISPLAY_ICON_SLOTS.filter((s) => srcs[s.key]).length;

  return (
    <section className="mb-8">
      <p className="type-h4">拙趣图标</p>
      <p className="type-body-sm mt-1 text-zen-stone">
        {uploaded ? `已换上 ${uploaded} 个` : '用你自己画的线，会比代码里的更像喜茶'}
      </p>
      {msg ? <p className="type-body-sm mt-2 text-zen-vermilion">{msg}</p> : null}

      <div className="mt-4 grid grid-cols-4 gap-3">
        {DISPLAY_ICON_SLOTS.map(({ key, label }) => {
          const Fallback = PREVIEW[key];
          return (
            <div key={key} className="flex flex-col items-center gap-1.5 py-2">
              <button
                type="button"
                disabled={busy}
                className="flex flex-col items-center gap-1.5"
                onClick={() => {
                  pendingKey.current = key;
                  inputRef.current?.click();
                }}
                aria-label={`上传${label}图标`}
              >
                <span className="flex h-10 w-10 items-center justify-center text-zen-coal">
                  {srcs[key] ? (
                    <img src={srcs[key]} alt="" className="heytea-icon-upload" />
                  ) : (
                    <Fallback />
                  )}
                </span>
                <span className="type-caption">{label}</span>
              </button>
              {srcs[key] ? (
                <button
                  type="button"
                  className="type-caption text-zen-stone"
                  onClick={() => clearDisplayIcon(key)}
                >
                  还原
                </button>
              ) : (
                <span className="type-caption text-zen-stone">上传</span>
              )}
            </div>
          );
        })}
      </div>

      {uploaded ? (
        <button
          type="button"
          className="zen-quiet mt-3"
          disabled={busy}
          onClick={() => clearAllDisplayIcons()}
        >
          全部还原
        </button>
      ) : null}

      <p className="type-caption mt-3">
        透明底，黑线，svg 或 png。画大一点再缩小，线会更轻。
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />
    </section>
  );
}
