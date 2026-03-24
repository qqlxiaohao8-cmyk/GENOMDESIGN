/**
 * Map extraction "fonts" strings to real @font-face stacks + Google Fonts URLs.
 * Order matters: longer / more specific patterns first.
 */

const FALLBACK_SANS =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FALLBACK_SERIF = 'Georgia, "Times New Roman", "Noto Serif", "Source Serif 4", serif';
const FALLBACK_MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

/** @type {{ re: RegExp, family: string }[]} */
const NAMED_FONTS = [
  { re: /\bspace\s*grotesk\b/i, family: 'Space Grotesk' },
  { re: /\bplus\s*jakarta\b/i, family: 'Plus Jakarta Sans' },
  { re: /\bdm\s+sans\b/i, family: 'DM Sans' },
  { re: /\bwork\s+sans\b/i, family: 'Work Sans' },
  { re: /\bmanrope\b/i, family: 'Manrope' },
  { re: /\boutfit\b/i, family: 'Outfit' },
  { re: /\bsora\b/i, family: 'Sora' },
  { re: /\bpublic\s+sans\b/i, family: 'Public Sans' },
  { re: /\bopen\s+sans\b/i, family: 'Open Sans' },
  { re: /\bpt\s+sans\b/i, family: 'PT Sans' },
  { re: /\bsource\s+sans\s+3\b/i, family: 'Source Sans 3' },
  { re: /\bsource\s+sans\b/i, family: 'Source Sans 3' },
  { re: /\bnunito\s+sans\b/i, family: 'Nunito Sans' },
  { re: /\bnunito\b/i, family: 'Nunito' },
  { re: /\bmontserrat\b/i, family: 'Montserrat' },
  { re: /\bpoppins\b/i, family: 'Poppins' },
  { re: /\brubik\b/i, family: 'Rubik' },
  { re: /\bkarla\b/i, family: 'Karla' },
  { re: /\blato\b/i, family: 'Lato' },
  { re: /\braleway\b/i, family: 'Raleway' },
  { re: /\bubuntu\b/i, family: 'Ubuntu' },
  { re: /\broboto\b/i, family: 'Roboto' },
  { re: /\binter\b/i, family: 'Inter' },
  { re: /\bplayfair\s+display\b/i, family: 'Playfair Display' },
  { re: /\bmerriweather\b/i, family: 'Merriweather' },
  { re: /\blora\b/i, family: 'Lora' },
  { re: /\blibre\s+baskerville\b/i, family: 'Libre Baskerville' },
  { re: /\bsource\s+serif\s+4\b/i, family: 'Source Serif 4' },
  { re: /\bnoto\s+serif\b/i, family: 'Noto Serif' },
  { re: /\bjetbrains\s+mono\b/i, family: 'JetBrains Mono' },
  { re: /\bibm\s+plex\s+mono\b/i, family: 'IBM Plex Mono' },
  { re: /\bfira\s+code\b/i, family: 'Fira Code' },
  { re: /\bspace\s+mono\b/i, family: 'Space Mono' },
  { re: /\binconsolata\b/i, family: 'Inconsolata' },
  { re: /\bfutura\b/i, family: 'Outfit' },
  { re: /\bhelvetica\b/i, family: 'Inter' },
  { re: /\bavenir\b/i, family: 'Nunito Sans' },
  { re: /\bgotham\b/i, family: 'Montserrat' },
];

const WEIGHTS = '400;500;600;700';

/**
 * @param {string} description
 * @returns {{ stack: string, googleFamily: string }}
 */
function resolveOne(description) {
  const s = String(description || '').trim();
  if (!s) {
    return { stack: `"Inter", ${FALLBACK_SANS}`, googleFamily: 'Inter' };
  }
  for (const { re, family } of NAMED_FONTS) {
    if (re.test(s)) {
      return { stack: `"${family}", ${FALLBACK_SANS}`, googleFamily: family };
    }
  }
  if (/mono|monospace|code|technical|tabular|developer/i.test(s)) {
    return { stack: `"IBM Plex Mono", ${FALLBACK_MONO}`, googleFamily: 'IBM Plex Mono' };
  }
  if (/serif|slab|garamond|editorial|magazine|times|baskerville|didot|bodoni/i.test(s)) {
    return { stack: `"Source Serif 4", ${FALLBACK_SERIF}`, googleFamily: 'Source Serif 4' };
  }
  if (/geometric|bauhaus|constructivist/i.test(s)) {
    return { stack: `"Space Grotesk", ${FALLBACK_SANS}`, googleFamily: 'Space Grotesk' };
  }
  if (/rounded|friendly|playful|bubble/i.test(s)) {
    return { stack: `"Nunito Sans", ${FALLBACK_SANS}`, googleFamily: 'Nunito Sans' };
  }
  if (/humanist/i.test(s)) {
    return { stack: `"Source Sans 3", ${FALLBACK_SANS}`, googleFamily: 'Source Sans 3' };
  }
  return { stack: `"Inter", ${FALLBACK_SANS}`, googleFamily: 'Inter' };
}

function buildGoogleFontsHref(googleFamilies) {
  const uniq = [...new Set(googleFamilies.filter(Boolean))];
  if (!uniq.length) return null;
  const q = uniq
    .map((name) => {
      const enc = encodeURIComponent(name).replace(/%20/g, '+');
      return `family=${enc}:wght@${WEIGHTS}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

import { useEffect } from 'react';

/**
 * Injects a Google Fonts stylesheet once per unique href (vault grid + preview page).
 * @param {string | null | undefined} googleFontsHref
 */
export function useInjectExtractedGoogleFonts(googleFontsHref) {
  useEffect(() => {
    if (!googleFontsHref) return;
    const key = encodeURIComponent(googleFontsHref);
    for (const el of document.querySelectorAll('link[data-genom-extract-fonts]')) {
      if (el.getAttribute('data-genom-extract-fonts') === key) return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontsHref;
    link.setAttribute('data-genom-extract-fonts', key);
    document.head.appendChild(link);
  }, [googleFontsHref]);
}

/**
 * @param {object | null | undefined} fonts — { heading?, body?, accent? }
 */
export function resolveExtractedFontLoading(fonts) {
  const heading = resolveOne(fonts?.heading);
  const body = resolveOne(fonts?.body || fonts?.heading);
  const accent = resolveOne(fonts?.accent || fonts?.heading);
  const googleHref = buildGoogleFontsHref([heading.googleFamily, body.googleFamily, accent.googleFamily]);
  return {
    headingCSS: heading.stack,
    bodyCSS: body.stack,
    accentCSS: accent.stack,
    googleFontsHref: googleHref,
    googleFamilies: [...new Set([heading.googleFamily, body.googleFamily, accent.googleFamily])],
  };
}
