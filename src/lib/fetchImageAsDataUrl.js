/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchImageAsDataUrl(url) {
  if (!url || typeof url !== 'string') throw new Error('Missing image URL.');
  const trimmed = url.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  const res = await fetch(trimmed, { mode: 'cors' });
  if (!res.ok) throw new Error(`Could not load image (${res.status}).`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('URL did not return an image.');
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Could not read image.'));
    r.readAsDataURL(blob);
  });
}
