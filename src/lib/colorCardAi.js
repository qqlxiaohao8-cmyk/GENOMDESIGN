import { enrichSwatch } from './colorValues';

function parseJsonFromModel(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/u, '');
  }
  return JSON.parse(t);
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.baseUrl
 * @param {string} opts.model
 * @param {string[]} opts.hexes length 5
 * @returns {Promise<{ overview: string, colors: { name: string, hex: string, rgb: number[], cmyk: number[] }[] }>}
 */
export async function fetchColorCardMetadata({ apiKey, baseUrl, model, hexes }) {
  const list = (hexes || []).slice(0, 5).map((h) => String(h).toUpperCase());
  while (list.length < 5) list.push('#808080');

  const systemPrompt = `You name colors for a design extraction app. Reply with JSON only: {"overview": string (1-2 sentences describing the palette mood and how colors relate to a typical scene in this kind of image), "colors": array of exactly 5 objects {"name": string (2-4 words, creative paint/color name grounded in each hex’s hue and lightness — avoid placeholders like "Color 1"), "hex": "#RRGGBB"} — hex values MUST match the user list in order, uppercase. Names should read like real pigment or ink labels (e.g. "Driftwood Ash", "Signal Coral"), not generic numbering.`;

  const userMessage = `These 5 hex colors were extracted from a photo (dominant → supporting):\n${list.join('\n')}`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.65,
    max_tokens: 800,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || `HTTP ${response.status}`);
  }
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error('No response from model.');
  const raw = parseJsonFromModel(text);
  const overview = typeof raw.overview === 'string' ? raw.overview.trim() : '';
  const arr = Array.isArray(raw.colors) ? raw.colors : [];
  const colors = list.map((hex, i) => {
    const row = arr[i];
    const name =
      row && typeof row.name === 'string' && row.name.trim()
        ? row.name.trim()
        : `Accent ${i + 1}`;
    const e = enrichSwatch(row?.hex || hex);
    return { name, hex: e.hex, rgb: e.rgb, cmyk: e.cmyk };
  });
  return {
    overview: overview || 'A balanced extract of dominant hues from your image.',
    colors,
  };
}

export function fallbackColorCardMetadata(hexes) {
  const list = (hexes || []).slice(0, 5);
  while (list.length < 5) list.push('#888888');
  const colors = list.map((hex, i) => {
    const e = enrichSwatch(hex);
    return { name: `Color ${i + 1}`, hex: e.hex, rgb: e.rgb, cmyk: e.cmyk };
  });
  return {
    overview: 'Palette extracted from your image. Add an API key for AI-generated names and a richer description.',
    colors,
  };
}
