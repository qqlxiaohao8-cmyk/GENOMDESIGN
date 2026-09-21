import React, { useRef } from 'react';
import { Sparkles, Camera, X } from 'lucide-react';
import { compressImageDataUrl } from '../lib/styleImageUpload';

/**
 * Action sheet shown when user taps the center "+" button.
 * Presents two choices: 生色 (generate) or 析色 (extract from image).
 */
export default function CreateActionSheet({ onClose, onShengSe, onExtract }) {
  const fileInputRef = useRef(null);

  const handleExtractClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || '')) {
      alert('请选择 JPG / PNG / WEBP 图片。');
      return;
    }
    if (file.size > 28 * 1024 * 1024) {
      alert('图片过大（需 ≤ 28MB）。');
      return;
    }
    try {
      const raw = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('无法读取文件'));
        r.readAsDataURL(file);
      });
      const compressed = await compressImageDataUrl(raw, 3200, 0.88);
      onClose();
      onExtract(compressed);
    } catch (err) {
      alert(err?.message || '处理图片失败。');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-t-[1.85rem_2rem_0_0] border border-zen-clay/40 bg-zen-paper p-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] shadow-zen-lg md:rounded-[1.6rem_1.85rem_1.45rem_1.9rem]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="type-index" aria-hidden>+</span>
            <h3 className="type-h3">创作</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zen-ink/40 hover:bg-zen-ink/[0.06] transition-colors"
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 生色 */}
          <button
            type="button"
            onClick={() => { onClose(); onShengSe(); }}
            className="zen-scrap group flex flex-col items-center gap-2 bg-zen-sand/50 p-5 text-center hover:border-zen-vermilion/30 hover:bg-zen-vermilion/[0.04]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[0.85rem_1rem_0.75rem_1.05rem] bg-zen-ink text-white">
              <Sparkles size={20} strokeWidth={2} aria-hidden />
            </div>
            <p className="type-h4">生色</p>
          </button>

          {/* 析色 */}
          <button
            type="button"
            onClick={handleExtractClick}
            className="zen-scrap zen-scrap--pos group flex flex-col items-center gap-2 bg-zen-sand/50 p-5 text-center hover:border-zen-vermilion/30 hover:bg-zen-vermilion/[0.04]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[0.85rem_1rem_0.75rem_1.05rem] bg-zen-vermilion text-white">
              <Camera size={20} strokeWidth={2} aria-hidden />
            </div>
            <p className="type-h4">析色</p>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
