/**
 * Upload a data-URL image to Supabase Storage (bucket `style-images`).
 * Path: `{userId}/{uuid}.ext`
 */
export async function uploadStyleImageFromDataUrl(supabase, userId, dataUrl) {
  if (!/^data:image\//.test(dataUrl || '')) {
    return { publicUrl: null, error: new Error('Not an image data URL.') };
  }
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes('png')
      ? 'png'
      : blob.type.includes('webp')
        ? 'webp'
        : blob.type.includes('gif')
          ? 'gif'
          : 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('style-images').upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    });
    if (upErr) return { publicUrl: null, error: upErr };
    const { data } = supabase.storage.from('style-images').getPublicUrl(path);
    return { publicUrl: data.publicUrl, error: null };
  } catch (e) {
    return { publicUrl: null, error: e };
  }
}

/** Resize + JPEG re-encode to keep `styles.image_url` under typical PostgREST limits when Storage is unavailable. */
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
