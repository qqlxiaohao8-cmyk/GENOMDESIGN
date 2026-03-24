/**
 * Downsample reference image and extract global + regional color stats for text-only vision models.
 */

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function sampleRegionBuckets(data, w, h, x0, y0, x1, y1, topN = 4) {
  const bucketCounts = new Map();
  let n = 0;
  let sumLum = 0;
  const xStart = Math.max(0, Math.floor(x0));
  const yStart = Math.max(0, Math.floor(y0));
  const xEnd = Math.min(w, Math.ceil(x1));
  const yEnd = Math.min(h, Math.ceil(y1));
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      n++;
      sumLum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const qr = (r >> 4) << 4;
      const qg = (g >> 4) << 4;
      const qb = (b >> 4) << 4;
      const key = `${qr},${qg},${qb}`;
      bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
    }
  }
  if (!n) return { palette: [], avgLuminance: null, pixelCount: 0 };
  const palette = [...bucketCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return rgbToHex(r, g, b);
    });
  return { palette, avgLuminance: sumLum / n, pixelCount: n };
}

/**
 * @param {string} dataUrl
 * @returns {Promise<object>}
 */
export function extractVisualSummaryFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const maxSide = 120;
        const scale = maxSide / Math.max(nw, nh, 1);
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        const bucketCounts = new Map();
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumLum = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          sumR += r;
          sumG += g;
          sumB += b;
          sumLum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          n++;
          const qr = (r >> 4) << 4;
          const qg = (g >> 4) << 4;
          const qb = (b >> 4) << 4;
          const key = `${qr},${qg},${qb}`;
          bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
        }
        if (!n) {
          reject(new Error('No opaque pixels to sample.'));
          return;
        }
        const palette = [...bucketCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return rgbToHex(r, g, b);
          });
        const avgHex = rgbToHex(Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n));
        const avgLum = sumLum / n;
        let luminanceLabel = 'mid';
        if (avgLum < 0.22) luminanceLabel = 'very dark';
        else if (avgLum < 0.4) luminanceLabel = 'dark';
        else if (avgLum < 0.58) luminanceLabel = 'mid';
        else if (avgLum < 0.78) luminanceLabel = 'light';
        else luminanceLabel = 'very light';

        const ar = nw / Math.max(nh, 1);
        let aspectLabel = 'landscape';
        if (ar < 0.85) aspectLabel = 'portrait';
        else if (ar < 1.15) aspectLabel = 'square-ish';

        const thirdH = h / 3;
        const thirdW = w / 3;
        const horizontalBands = [
          { id: 'top', label: 'top third (often header / chrome)', ...sampleRegionBuckets(data, w, h, 0, 0, w, thirdH, 5) },
          {
            id: 'middle',
            label: 'middle third (often main content)',
            ...sampleRegionBuckets(data, w, h, 0, thirdH, w, 2 * thirdH, 5),
          },
          {
            id: 'bottom',
            label: 'bottom third (often footer / CTAs)',
            ...sampleRegionBuckets(data, w, h, 0, 2 * thirdH, w, h, 5),
          },
        ];

        const verticalHalves = {
          left: sampleRegionBuckets(data, w, h, 0, 0, w / 2, h, 5),
          right: sampleRegionBuckets(data, w, h, w / 2, 0, w, h, 5),
        };

        const labels = ['top-left', 'top-center', 'top-right', 'mid-left', 'mid-center', 'mid-right', 'bot-left', 'bot-center', 'bot-right'];
        const grid3x3 = [];
        for (let gr = 0; gr < 3; gr++) {
          for (let gc = 0; gc < 3; gc++) {
            const idx = gr * 3 + gc;
            grid3x3.push({
              id: labels[idx],
              row: gr,
              col: gc,
              ...sampleRegionBuckets(data, w, h, gc * thirdW, gr * thirdH, (gc + 1) * thirdW, (gr + 1) * thirdH, 4),
            });
          }
        }

        const lumSpread =
          Math.max(...horizontalBands.map((b) => b.avgLuminance ?? 0)) -
          Math.min(...horizontalBands.map((b) => b.avgLuminance ?? 0));
        const leftRightLumDiff = Math.abs(
          (verticalHalves.left.avgLuminance ?? 0) - (verticalHalves.right.avgLuminance ?? 0)
        );

        resolve({
          width: nw,
          height: nh,
          aspectLabel,
          palette,
          avgHex,
          luminanceLabel,
          sampledPixels: n,
          sampleGridW: w,
          sampleGridH: h,
          horizontalBands,
          verticalHalves,
          grid3x3,
          heuristics: {
            strongVerticalStripes: leftRightLumDiff > 0.18,
            strongHorizontalBands: lumSpread > 0.15,
            leftRightLumDiff: Number(leftRightLumDiff.toFixed(3)),
            horizontalLumSpread: Number(lumSpread.toFixed(3)),
          },
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = dataUrl;
  });
}

/**
 * Human + model-readable block appended to the user message.
 */
export function formatSpatialSampleForPrompt(summary) {
  const lines = [];
  lines.push(`Image dimensions: ${summary.width}×${summary.height} px (aspect: ${summary.aspectLabel}).`);
  lines.push(`Global dominant colors (hex, frequency order): ${summary.palette.join(', ')}.`);
  lines.push(`Average color: ${summary.avgHex}; overall lightness mood: ${summary.luminanceLabel}.`);
  lines.push(
    `Heuristic flags: ${summary.heuristics.strongHorizontalBands ? 'distinct horizontal bands (possible header/content/footer)' : 'no strong horizontal banding'}; ${summary.heuristics.strongVerticalStripes ? 'left/right luminance split (possible sidebar vs content)' : 'no strong left/right split'}.`
  );
  lines.push('');
  lines.push('Horizontal bands (dominant colors per vertical third):');
  for (const b of summary.horizontalBands) {
    lines.push(`- ${b.label}: ${b.palette.join(', ') || '—'} (avg lightness ~${b.avgLuminance != null ? b.avgLuminance.toFixed(2) : '?'})`);
  }
  lines.push('');
  lines.push('3×3 spatial grid (dominant colors per cell, reading order TL→TR then rows):');
  for (const cell of summary.grid3x3) {
    lines.push(`- ${cell.id}: ${cell.palette.join(', ') || '—'}`);
  }
  lines.push('');
  lines.push(
    'Use this spatial data to infer real layout: where chrome vs canvas sits, whether a sidebar or top nav is plausible, and which hex codes likely belong to background, cards, primary buttons, and text. Cross-check with the global palette.'
  );
  return lines.join('\n');
}
