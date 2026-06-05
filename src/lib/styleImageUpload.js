import { apiFetch } from './apiClient';

/**
 * Upload a data-URL image to R2 via Worker API.
 * Returns a same-origin URL: /api/v1/media/{userId}/{uuid}.ext
 */
export async function uploadStyleImageFromDataUrl(_legacy, userId, dataUrl) {
  void userId;
  if (!/^data:image\//.test(dataUrl || '')) {
    return { publicUrl: null, error: new Error('Not an image data URL.') };
  }
  try {
    const { publicUrl } = await apiFetch('/upload', {
      method: 'POST',
      body: { dataUrl },
    });
    return { publicUrl, error: null };
  } catch (e) {
    return { publicUrl: null, error: e };
  }
}

/** Resize + JPEG re-encode when R2 upload is unavailable. */
export function compressImageDataUrl(dataUrl, maxEdge = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const scale = Math.min(1, maxEdge / Math.max(nw, nh, 1));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Could not decode image for compression.'));
    img.src = dataUrl;
  });
}
