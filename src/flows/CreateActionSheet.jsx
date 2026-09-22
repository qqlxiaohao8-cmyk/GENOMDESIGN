import React, { useRef } from 'react';
import { compressImageDataUrl } from '../lib/styleImageUpload';

/**
 * Action sheet shown when user taps the center "+" button.
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
      className="fixed inset-0 z-[180] flex items-end justify-center bg-zen-ink/20 backdrop-blur-[2px] md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-zen-paper px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] md:rounded-sm">
        <div className="mb-8 flex items-start justify-between">
          <h3 className="type-h3">创作</h3>
          <button
            type="button"
            onClick={onClose}
            className="zen-quiet zen-hit px-0"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="flex items-end justify-between gap-6 pb-2">
          <button
            type="button"
            onClick={() => { onClose(); onShengSe(); }}
            className="group flex min-h-[7rem] flex-col items-start gap-3 text-left"
          >
            <div className="zen-wash--tile flex h-[5.75rem] w-[5.5rem] overflow-hidden">
              {['#2C2C2C', '#8A6B4E', '#C9A882', '#E7DCC8', '#C45A4A'].map((hex) => (
                <span key={hex} className="h-full min-w-0 flex-1" style={{ backgroundColor: hex }} />
              ))}
            </div>
            <div>
              <p className="type-h4">生色</p>
              <p className="zen-action mt-1">生成</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExtractClick}
            className="group mt-3 flex min-h-[7rem] flex-col items-start gap-3 text-left"
          >
            <div
              className="zen-wash zen-wash--pear relative h-[6.5rem] w-[4.25rem]"
              style={{ background: 'linear-gradient(150deg, #E8C9B4 0%, #C45A4A 55%, #5C3A32 100%)' }}
            />
            <div>
              <p className="type-h4">析色</p>
              <p className="zen-quiet mt-1">从照片</p>
            </div>
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
