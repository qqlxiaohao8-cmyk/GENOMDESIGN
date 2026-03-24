import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Upload,
  Copy,
  CheckCircle2,
  Trash2,
  Loader2,
  Maximize2,
  Search,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Download,
  X,
  CalendarSync,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { uploadStyleImageFromDataUrl, compressImageDataUrl } from './lib/styleImageUpload';
import AuthModal from './components/AuthModal';
import SetPasswordModal from './components/SetPasswordModal';
import StyleUiPreviewCard, { styleItemToAnalysisResult, itemColorCardData } from './components/StyleUiPreviewCard';
import PublicColorPaletteCard from './components/PublicColorPaletteCard';
import DailyPaletteModal from './components/DailyPaletteModal';
import {
  buildDailyPaletteFeedItem,
  buildDailyPaletteFeedItemsForHistory,
  DAILY_PALETTE_HISTORY_DAYS,
  formatDailyPaletteDateKey,
  getDailyPalette,
  isDailyPaletteItemId,
} from './lib/dailyPalette';
import { mergeDailyPaletteFeedItemWithPinterest } from './lib/dailyPalettePinterest';
import logoMarkHover from '../1.png';
import logoMarkDefault from '../2.png';
import { useDailyPinterestDailyCards } from './hooks/useDailyPinterestDailyCards';
import StylePreviewPage from './components/StylePreviewPage';
import ColorCardLayout from './components/ColorCardLayout';
import ColorCardPreviewOverlay from './components/ColorCardPreviewOverlay';
import { formatCmykLine, formatRgbLine } from './lib/colorValues';
import { extractFiveDominantHexesFromDataUrl } from './lib/dominantColors';
import { fetchColorCardMetadata, fallbackColorCardMetadata } from './lib/colorCardAi';
import { fetchImageAsDataUrl } from './lib/fetchImageAsDataUrl';
import { loadImageForCanvas, renderColorCardToPngBlob } from './lib/renderColorCardPng';
import AboutUsPage from './components/AboutUsPage';
import PaletteRefinementWorkspace from './components/PaletteRefinementWorkspace';
import { extractVisualSummaryFromDataUrl, formatSpatialSampleForPrompt } from './lib/visualImageSample';

const deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY?.trim() || '';
const deepseekBaseUrl = (import.meta.env.VITE_DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com').replace(/\/$/, '');
const deepseekModel = import.meta.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
const deepseekColorCardBaseUrl = deepseekBaseUrl.endsWith('/v1') ? deepseekBaseUrl : `${deepseekBaseUrl}/v1`;

/** localStorage: tag string → click count on Community chips (this browser). */
const COMMUNITY_TAG_CLICKS_STORAGE_KEY = 'genom-community-tag-clicks';

function parseJsonFromModel(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/u, '');
  }
  return JSON.parse(t);
}

const JSON_STYLE_KEYS = `Required keys (JSON object only, no markdown — the word json is required for some APIs):

You receive SPATIAL color samples (3×3 grid + horizontal thirds + global palette). Treat them like a crude heatmap: infer where UI chrome, sidebars, cards, and CTAs likely sit. Ground every color-role assignment in those regions when possible.

Focus areas:
- Layout: columns, sidebars, top nav vs stacked sections, card grids, whitespace rhythm, density.
- Elements: call out concrete widgets you infer—primary/secondary buttons, cards, nav bars, inputs, chips, tables, charts, avatars, modals—and where they plausibly sit (top band, left rail, center canvas, bottom bar).
- Colors: map specific hex values from the provided lists to semantic roles (background, surface, primary CTA, secondary, text, muted text, border, accent). **Required in colorRoles:** "background", "text", and "accent" (accent may match primary/cta). Prefer hexes that appear in header/top cells for chrome vs center for canvas when the samples support it.
- Typography, visual style, interactions: as before—specific and actionable.
- **Replication fidelity:** Prefer hex codes sampled from the image over guesses; when two colors are close, pick the one that matches the dominant pixel region. Describe header/toolbar/main/footer structure explicitly in layoutSummary and layoutStructure when the reference implies a full page. The app renders a live homepage mockup from your output — inconsistencies between palette, colorRoles, and styleIdentification will show as visual errors, so keep them aligned.

Keys:
- "aesthetic": short style label (2–5 words).
- "typography": one string emphasizing hierarchy, weights, casing, tracking (not only font names).
- "fonts": object with "heading", "body", optional "accent" strings. Name real typefaces when plausible (e.g. Inter, DM Sans, Space Grotesk, Playfair Display, IBM Plex Mono) so the app can load matching Google Fonts; otherwise describe the mood and closest genre (geometric sans, editorial serif, monospace UI).
- "palette": array of 5–10 CSS hex strings uppercase #RRGGBB; order roughly background → surface → text → primary → accents; must include the main colors you assign in colorRoles.
- "colorRoles": object with uppercase hex string values drawn from palette (or harmonized neutrals). Include as many as apply: "background", "surface", "surfaceElevated", "primary", "primaryHover", "secondary", "text", "textMuted", "border", "accent", "cta" (may match primary), "destructive", "success". Each value must be #RRGGBB.
- "uiObservation": object with:
  - "layoutSummary": 2–4 sentences describing page structure (regions, flow, columns) as inferred from spatial samples + palette.
  - "regions": array of 3–8 objects: { "id": string, "placement": "top"|"left"|"right"|"center"|"bottom"|"full-bleed", "role": string (e.g. "top navigation", "sidebar", "hero", "card grid", "pricing row"), "dominantColors": ["#RRGGBB", ...], "notes": string }.
- "recognizedComponents": array of 4–12 objects: { "type": "primaryButton"|"secondaryButton"|"ghostButton"|"card"|"navbar"|"sidebar"|"input"|"chip"|"table"|"chart"|"avatar"|"modal"|"tag"|"iconButton", "description": string, "placement": "top"|"left"|"right"|"center"|"bottom"|"inline", "colorsUsed": ["#RRGGBB", ...], optional "variant": string, optional "states": ["default","hover","active","disabled","focus"], optional "density": "compact"|"comfortable"|"spacious", optional "label": string } — tie colors to sampled hexes when plausible.
- "layoutBlueprint" (optional): { "contentColumns": 1|2|3, "sidebar": "none"|"left"|"right", "navStyle": "top"|"side"|"minimal", "cardDensity": "sparse"|"medium"|"dense", optional "layoutStructure": string[] } — ordered section ids (e.g. "topNav","hero","contentGrid","footer") for machine-readable flow.
- "iconography" (required): { "style": "outline"|"filled"|"duotone", "weight": "1px"|"1.5px"|"2px", "corner": "rounded"|"sharp", "sizeScale": "sm"|"md"|"lg", "library": string (e.g. lucide-compatible), "notes": string } — stroke icons for UI density; use Tailwind-ish hints in notes if useful.
- "interactionSpec" (required): { "focusRing": string (Tailwind classes e.g. focus-visible:ring-2 focus-visible:ring-offset-2), "hoverLift": boolean|string, "pressFeedback": string (e.g. active:scale-[0.98]), "durationMs": number, "easing": string (e.g. ease-out), "toggleAndChip": string, "inputFocus": string, "linkUnderline": string, "notes": string } — motion and affordances the live React preview can map to Tailwind.
- "designLogic": 3–5 sentences: lead with inferred layout from spatial data, then components and surfaces, then contrast/mood.
- "keywords": array of 8–14 short tags for **visual style and vibe only** (mood, era, color character, contrast, material metaphors, typography flavor: e.g. brutalist, clinical, pastel, neon, editorial, Y2K, monochrome, soft-rounded, high-contrast). Do **not** put layout or UI anatomy here — no navbar, sidebar, card grid, single-column, dashboard, hero, form, table, modal, upload zone, etc. (those belong in recognizedComponents, uiObservation, layoutBlueprint, and the long "prompt").
- "uiGeometry" (optional but preferred): object — "preset" one of "ultraBrutal", "neoBrutal", "sharpSquares", "softRounded", "pillForward", "balanced"; optional "notes" and token overrides as before. Use "ultraBrutal" when the reference pairs thick black borders + offset shadows with very large radii (e.g. ~3rem cards, pill buttons). Align preset with "styleIdentification" (do not contradict shapes/borders you list there).
- "styleIdentification" (required): structured checklist the app uses to drive the live style preview. Each nested value is one concise prose string (Tailwind-ish tokens encouraged when they fit, e.g. rounded-[3rem], scale-y-110, 2px border-black, shadow-[8px_8px_0_0_#000]). Ground in spatial samples + inferred UI; infer confidently when the image suggests it.
  - "coreAesthetic": { "style": string (named aesthetic / era, e.g. Scientific Brutalism / High-Tech Lab), "colorway": string (named colors + hexes from palette), "shapes": string (container radii, pill vs square), "borders": string (width, color, which widgets get borders) }.
  - "typography": { "primaryFont": string (specific or genre, e.g. Space Grotesk / neo-grotesk), "headings": string (casing, weight, tracking), "styling": string (e.g. scale-y on display type, italics for emphasis labels) }.
  - "components": { "buttons": string (border, fill, shadow offsets, hover), "cards": string (surface, padding, inner vs outer radius), "backgrounds": string (solid vs mesh gradient / blurred blobs, opacity, base color) }.
- "prompt": ONE JSON string: long master brief (target roughly 280–520 words). Must explicitly reference inferred layout regions, named components, and which hex plays which role. Echo the same decisions as "styleIdentification" and "uiGeometry" so engineers can implement without contradiction. Dense prose only, no markdown or list markers inside the string.

The "prompt" must weave together: (1) layout from spatial inference; (2) enumerated UI elements and their styling; (3) typography; (4) full color system with every hex and role tied to observation; (5) visual style + materials; (6) iconography (outline/filled, stroke weight) and interactionSpec (focus, hover, press, duration); (7) do/avoid; (8) accessibility contrast note. Echo iconography and interactionSpec so engineers can implement without contradiction.`;

/** Same JSON schema as image extraction, but grounded in a text brief instead of pixel samples. */
const JSON_STYLE_KEYS_FROM_TEXT = `Required keys (JSON object only, no markdown — the word json is required for some APIs):

You receive ONLY the user's TEXT DESCRIPTION of a product, page, brand, or interface to design. There is no reference image and no sampled colors. Infer a full UI/UX system (layout, components, palette, typography, interactions, vibe) that satisfies the brief.

Focus areas:
- Layout: columns, nav, sections, card grids, whitespace — align with the product type (marketing site, dashboard, upload tool, etc.). State typical page chrome (header, optional toolbar, main hero, footer) when the brief implies a marketing or product site.
- Elements: name concrete widgets the brief implies (buttons, cards, inputs, nav, upload zones, modals, chips, tables).
- Colors: choose a coherent palette and semantic roles. **colorRoles** must include "background", "text", and "accent" (accent may match primary). Every hex in palette must appear in colorRoles or recognizedComponents so engineers can trust the system.
- Typography and interactions: specific, implementation-ready (weights, casing, shadows, press feedback).
- **Replication fidelity:** The app builds a live homepage preview from your JSON — keep palette, colorRoles, fonts, and styleIdentification mutually consistent; avoid vague color names without hexes.

Keys:
- "aesthetic": short style label (2–5 words).
- "typography": one string emphasizing hierarchy, weights, casing, tracking (not only font names).
- "fonts": object with "heading", "body", optional "accent" strings. Name real typefaces when plausible (e.g. Inter, DM Sans, Space Grotesk, Playfair Display, IBM Plex Mono) so the app can load matching Google Fonts; otherwise describe the mood and closest genre (geometric sans, editorial serif, monospace UI).
- "palette": array of 5–10 CSS hex strings uppercase #RRGGBB; order roughly background → surface → text → primary → accents; must include the main colors you assign in colorRoles.
- "colorRoles": object with uppercase hex string values drawn from palette (or harmonized neutrals). Include as many as apply: "background", "surface", "surfaceElevated", "primary", "primaryHover", "secondary", "text", "textMuted", "border", "accent", "cta" (may match primary), "destructive", "success". Each value must be #RRGGBB.
- "uiObservation": object with:
  - "layoutSummary": 2–4 sentences describing the intended page structure (regions, flow, columns) derived from the brief.
  - "regions": array of 3–8 objects: { "id": string, "placement": "top"|"left"|"right"|"center"|"bottom"|"full-bleed", "role": string (e.g. "top navigation", "sidebar", "hero", "upload zone", "card grid"), "dominantColors": ["#RRGGBB", ...], "notes": string } — colors from your palette.
- "recognizedComponents": array of 4–12 objects: { "type": "primaryButton"|"secondaryButton"|"ghostButton"|"card"|"navbar"|"sidebar"|"input"|"chip"|"table"|"chart"|"avatar"|"modal"|"tag"|"iconButton", "description": string, "placement": "top"|"left"|"right"|"center"|"bottom"|"inline", "colorsUsed": ["#RRGGBB", ...], optional "variant", "states", "density", "label" }.
- "layoutBlueprint" (optional): { "contentColumns": 1|2|3, "sidebar": "none"|"left"|"right", "navStyle": "top"|"side"|"minimal", "cardDensity": "sparse"|"medium"|"dense", optional "layoutStructure": string[] }.
- "iconography" (required): { "style": "outline"|"filled"|"duotone", "weight": "1px"|"1.5px"|"2px", "corner": "rounded"|"sharp", "sizeScale": "sm"|"md"|"lg", "library": string, "notes": string }.
- "interactionSpec" (required): { "focusRing": string, "hoverLift": boolean|string, "pressFeedback": string, "durationMs": number, "easing": string, "toggleAndChip": string, "inputFocus": string, "linkUnderline": string, "notes": string } — Tailwind-oriented strings where possible.
- "designLogic": 3–5 sentences: functional goal and flow first, then surfaces and components, then contrast/mood and trust.
- "keywords": array of 8–14 short tags for **style and vibe only** (same rule as image mode: aesthetic/mood/era/color/contrast/material/type flavor — **not** structural labels like navbar, card grid, or single-column).
- "uiGeometry" (optional but preferred): object — "preset" one of "ultraBrutal", "neoBrutal", "sharpSquares", "softRounded", "pillForward", "balanced"; optional "notes" and token overrides. Use "ultraBrutal" when the brief implies thick black borders + offset shadows with very large radii. Align preset with "styleIdentification".
- "styleIdentification" (required): structured checklist for the live preview. Each nested value is one concise prose string (Tailwind-ish tokens encouraged). Ground every field in the user's brief.
  - "coreAesthetic": { "style": string, "colorway": string, "shapes": string, "borders": string }.
  - "typography": { "primaryFont": string, "headings": string, "styling": string }.
  - "components": { "buttons": string, "cards": string, "backgrounds": string }.
- "prompt": ONE JSON string: long master brief (target roughly 280–520 words). Must reference layout, named components, hex roles, interactions. Dense prose only, no markdown inside the string.

The "prompt" must weave together: (1) layout and task flow; (2) enumerated UI elements and styling; (3) typography; (4) full color system with hexes and roles; (5) visual style; (6) iconography + interactionSpec (focus, hover, press, easing); (7) do/avoid; (8) accessibility contrast note.`;

const DESIGN_UX_FRAMEWORK_FOR_AI = `
Design psychology — apply while reasoning (reflect in designLogic, **style-only** keywords, styleIdentification, recognizedComponents, uiGeometry, and the long "prompt"):

1. Brand Trust and "Vibe" (Keywords)
The vibe keywords the user implies (e.g. "Scientific Brutalism") shape first impression. Within roughly the first 0.05 seconds, users judge whether an interface feels professional, fun, or trustworthy. High-contrast, editorial, or lab-like cues signal a cutting-edge, modern brand.

2. Efficiency and Task Completion (Functional Context)
UX centers on the job to be done (e.g. an image upload zone, checkout, settings). When functional context is explicit, complex tasks feel easy—users act without friction. Poor or vague UX creates friction; users abandon before finishing.

3. Visual Comfort and Scannability (UI Constraints)
Physical traits (e.g. 2px solid black borders, rounded corners, spacing rhythm) form a visual system. Boundaries help users group information; consistent constraints improve scanning so people find targets without reading every word.

4. Reading Speed and Information Priority (Typography)
Typography instructions (e.g. font-black, scale-y-110, tracking) establish visual hierarchy. Dominant headers act as signposts: "read this first." Without hierarchy, screens feel like undifferentiated text walls.

5. Confidence and Satisfaction (Interaction Details)
Interaction details (e.g. hard-drop shadows that yield on press, focus rings, motion) provide feedback. Controls that feel tactile confirm the system received input; weak feedback leads to repeated clicks and doubt.
`.trim();

/** 1×1 PNG for vault rows when style is generated from text only (no reference photo). */
const BRIEF_ONLY_PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function fetchDeepSeekStyleJson({ apiKey, baseUrl, model, systemPrompt, userMessage }) {
  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.45,
    max_tokens: 8192,
  };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    const msg = result.error?.message || result.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  const choice = result.choices?.[0];
  const text = choice?.message?.content;
  if (choice?.finish_reason === 'content_filter') {
    throw new Error('The model blocked this response (content filter). Try again.');
  }
  if (!text) {
    throw new Error('No response from DeepSeek. Check your API key and model name.');
  }
  return parseJsonFromModel(text);
}

function mapStyleRow(row) {
  return {
    id: row.id,
    ownerUserId: row.user_id ?? null,
    imageUrl: row.image_url,
    aesthetic: row.aesthetic,
    typography: row.typography,
    fonts: row.fonts,
    palette: row.palette,
    designLogic: row.design_logic,
    keywords: row.keywords,
    prompt: row.prompt,
    extractionSnapshot: row.extraction_snapshot ?? null,
    isPublic: row.is_public,
    createdAt: row.created_at,
    likeCount: typeof row.like_count === 'number' ? row.like_count : 0,
  };
}

/** Map model JSON (camelCase or snake_case) to DB columns. */
function extractionToRowFields(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      aesthetic: null,
      typography: null,
      fonts: null,
      palette: null,
      design_logic: null,
      keywords: null,
      prompt: null,
    };
  }
  return {
    aesthetic: raw.aesthetic ?? null,
    typography: raw.typography ?? null,
    fonts: raw.fonts ?? null,
    palette: raw.palette ?? null,
    design_logic: raw.designLogic ?? raw.design_logic ?? null,
    keywords: raw.keywords ?? null,
    prompt: raw.prompt ?? null,
  };
}

function displayUserName(user) {
  if (!user) return '';
  const m = user.user_metadata || {};
  const combined = [m.first_name, m.last_name]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
  if (combined) return combined;
  const full = typeof m.full_name === 'string' ? m.full_name.trim() : '';
  if (full) return full;
  const name = typeof m.name === 'string' ? m.name.trim() : '';
  if (name) return name;
  if (user.email) return user.email.split('@')[0];
  return '';
}

const COMMUNITY_GUIDE_COLORS = [
  { label: 'Red', hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Brown', hex: '#92400E' },
  { label: 'Yellow', hex: '#EAB308' },
  { label: 'Green', hex: '#22C55E' },
  { label: 'Turquoise', hex: '#2DD4BF' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Violet', hex: '#8B5CF6' },
  { label: 'Pink', hex: '#EC4899' },
  { label: 'Gray', hex: '#9CA3AF' },
  { label: 'Black', hex: '#171717' },
  { label: 'White', hex: '#F5F5F5' },
];

const COMMUNITY_GUIDE_STYLES = [
  'Warm',
  'Cold',
  'Bright',
  'Dark',
  'Pastel',
  'Vintage',
  'Monochromatic',
  'Gradient',
  'Muted',
  'High contrast',
  'Low contrast',
  'Minimal',
  'Maximal',
  'Brutalist',
  'Neobrutalist',
  'Flat',
  'Skeuomorphic',
  'Neumorphic',
  'Art deco',
  'Bauhaus',
  'Swiss',
  'Editorial',
  'Poster',
  'Logo',
  'Typography-led',
  'Photo-heavy',
  'Illustration',
  'Line art',
  'Geometric',
  'Organic',
  'Abstract',
  'Collage',
  'Duotone',
  'Halftone',
  'Street',
  'Luxury',
  'Playful',
  'Serious',
  'Corporate',
  'Startup',
  'Tech',
  'Futuristic',
  'Retro',
  '80s',
  '90s',
  'Y2K',
  'Grunge',
  'Clean',
  'Messy',
  'Hand-drawn',
  'Maximalist type',
  'Swiss grid',
  'Asymmetric',
  'Symmetrical',
  'Experimental',
];

const COMMUNITY_GUIDE_TOPICS = [
  'Christmas',
  'Halloween',
  'Pride',
  'Sunset',
  'Spring',
  'Winter',
  'Summer',
  'Autumn',
  'Gold',
  'Wedding',
  'Party',
  'Space',
  'Kids',
  'Nature',
  'City',
  'Food',
  'Happy',
  'Water',
  'Relax',
];

const COMMUNITY_GUIDE_SORT = [
  { id: 'trending', label: 'Trending' },
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Popular' },
];

function appendCommunitySearchToken(current, token) {
  const t = String(token).trim();
  if (!t) return current;
  const parts = current.trim().split(/\s+/).filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === t.toLowerCase())) return current;
  return [...parts, t].join(' ');
}

function CommunitySearchGuidePanel({ sort, onSortChange, onPickText }) {
  return (
    <div
      id="community-search-guide"
      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] rounded-2xl border border-neutral-200 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)] p-4 sm:p-5 md:p-6 max-h-[min(72vh,560px)] overflow-y-auto"
      role="dialog"
      aria-label="Search guide"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3">Colors</h3>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_GUIDE_COLORS.map(({ label, hex }) => (
              <button
                key={label}
                type="button"
                onClick={() => onPickText(label)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 text-xs font-medium text-neutral-800 hover:bg-neutral-200 transition-colors border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: hex }}
                  aria-hidden
                />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3">Styles</h3>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_GUIDE_STYLES.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onPickText(label)}
                className="px-2.5 py-1.5 rounded-full bg-neutral-100 text-xs font-medium text-neutral-800 hover:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_GUIDE_TOPICS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onPickText(label)}
                className="px-2.5 py-1.5 rounded-full bg-neutral-100 text-xs font-medium text-neutral-800 hover:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3">Order</h3>
          <div className="flex flex-col gap-2">
            {COMMUNITY_GUIDE_SORT.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSortChange(id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                  sort === id ? 'bg-sky-100 text-sky-800' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DNA_HELIX_H = 620;

function buildHelixColumn(phase) {
  const cx = 50;
  const amp = 22;
  const waves = 3.45;
  const freq = (waves * 2 * Math.PI) / DNA_HELIX_H;
  const vertStep = 5;
  const ptsA = [];
  const ptsB = [];
  for (let y = 0; y <= DNA_HELIX_H; y += vertStep) {
    const t = y * freq + phase;
    ptsA.push([cx + amp * Math.sin(t), y]);
    ptsB.push([cx + amp * Math.sin(t + Math.PI), y]);
  }
  const toD = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join('');
  let dR = '';
  let dRLime = '';
  let ri = 0;
  for (let y = 0; y <= DNA_HELIX_H; y += 12) {
    const t = y * freq + phase;
    const xA = cx + amp * Math.sin(t);
    const xB = cx + amp * Math.sin(t + Math.PI);
    const seg = `M${xA},${y}L${xB},${y}`;
    if (ri % 2 === 0) dR += seg;
    else dRLime += seg;
    ri += 1;
  }
  return { dA: toD(ptsA), dB: toD(ptsB), dR, dRLime };
}

const DNA_HELIX_COLUMNS = Array.from({ length: 8 }, (_, i) =>
  buildHelixColumn((i * 1.03 + i * 0.27) % (Math.PI * 2))
);

function DnaHelixBackground() {
  return (
    <div
      className="absolute inset-0 z-0 flex justify-between items-stretch gap-0.5 px-0.5 sm:px-3 md:px-6 pointer-events-none opacity-[0.3] sm:opacity-[0.34]"
      aria-hidden
    >
      {DNA_HELIX_COLUMNS.map((paths, i) => (
        <svg
          key={i}
          viewBox={`0 0 100 ${DNA_HELIX_H}`}
          className="dna-column-drift h-[132%] w-[11%] min-w-[36px] max-w-[88px] shrink-0 self-start -translate-y-[10%]"
          style={{ animationDelay: `${-i * 5.5}s` }}
          preserveAspectRatio="xMidYMin meet"
        >
          <path d={paths.dA} className="dna-strand-path dna-strand-a" pathLength={100} />
          <path d={paths.dB} className="dna-strand-path dna-strand-b" pathLength={100} />
          <path d={paths.dR} className="dna-rung-path" pathLength={100} />
          {paths.dRLime ? (
            <path d={paths.dRLime} className="dna-rung-path dna-rung-path-accent" pathLength={100} />
          ) : null}
        </svg>
      ))}
    </div>
  );
}

const HomeLanding = ({ onEnterLab }) => (
  <div className="relative flex flex-col w-full min-h-0 bg-white overflow-hidden">
    <DnaHelixBackground />
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="genom-hero-blob genom-blob-1" />
      <div className="genom-hero-blob genom-blob-2" />
      <div className="genom-hero-blob genom-blob-3" />
      <div className="genom-hero-blob genom-blob-4" />
      <div className="genom-hero-blob genom-blob-5" />
    </div>
    <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 flex justify-between items-start gap-2 pointer-events-none z-[1]">
      <span className="px-2 py-1 bg-black text-[#ccff00] text-[9px] font-black uppercase tracking-[0.2em] border-2 border-black rounded-full shadow-[3px_3px_0_0_#000]">
        SYS · ONLINE
      </span>
      <span className="px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest border-2 border-black rounded-full shadow-[3px_3px_0_0_#000]">
        v0.1 // LAB
      </span>
    </div>
    <div className="relative z-[1] flex w-full min-h-[calc(100dvh-6rem)] flex-col items-center justify-center text-center px-6 py-12 md:py-16">
      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-500 mb-4 md:mb-6">
        Lab of colors
      </p>
      <h1 className="m-0 genom-float-word">
        <span className="relative inline-block select-none text-[clamp(3.5rem,18vw,11rem)] font-black uppercase leading-[0.85] tracking-[-0.06em] scale-y-110">
          <span
            className="absolute left-0 top-0 text-black translate-x-1 translate-y-1 md:translate-x-1.5 md:translate-y-1.5 pointer-events-none"
            aria-hidden
          >
            GENOM
          </span>
          <span className="relative text-[#ccff00] genom-glow-text-light">GENOM</span>
        </span>
      </h1>
      <p className="mt-6 md:mt-8 max-w-md text-xs md:text-sm font-bold text-neutral-700 leading-snug">
        Scroll to the workspace to upload an image and extract your palette — then open UI/UX design if you want the full kit.
      </p>
      <button
        type="button"
        onClick={onEnterLab}
        className="mt-10 md:mt-12 group flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-black hover:text-neutral-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00] focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-full px-4 py-2"
      >
        <span className="border-b-2 border-black pb-0.5 group-hover:border-[#ccff00] transition-colors">Enter extract</span>
        <ChevronDown
          className="w-6 h-6 text-black group-hover:text-[#ccff00] animate-bounce transition-colors"
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
    </div>
  </div>
);

const App = () => {
  const homeLandingRef = useRef(null);
  const extractWorkspaceRef = useRef(null);
  const mainScrollRef = useRef(null);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [dailyPaletteModalOpen, setDailyPaletteModalOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  /** 'image' = from reference upload; 'text' = generated from text brief (vault uses placeholder pixel). */
  const [extractionSource, setExtractionSource] = useState('image');
  const [extractInputMode, setExtractInputMode] = useState('image');
  const [textBrief, setTextBrief] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [personalLibrary, setPersonalLibrary] = useState([]);
  const [exploreFeed, setExploreFeed] = useState([]);
  const [copyStatus, setCopyStatus] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [vaultNotice, setVaultNotice] = useState(null);
  const [savingStyle, setSavingStyle] = useState(false);
  /** Row id after private auto-save; publish updates this row to is_public. */
  const [vaultSavedId, setVaultSavedId] = useState(null);
  /** { overview, colors: [{ name, hex, rgb, cmyk }] } after Extract 5 colors */
  const [colorCardSession, setColorCardSession] = useState(null);
  /** After “Extract 5 colors”, false until user exports from palette refinement. */
  const [colorCardRefinementCommitted, setColorCardRefinementCommitted] = useState(false);
  const [copiedSwatchHex, setCopiedSwatchHex] = useState(null);
  const [colorCardDownloadBusy, setColorCardDownloadBusy] = useState(false);
  const [loginToDownloadOpen, setLoginToDownloadOpen] = useState(false);
  const [openingVaultColorInWorkspace, setOpeningVaultColorInWorkspace] = useState(false);
  const [deletingVaultId, setDeletingVaultId] = useState(null);
  const extractionHadUserAtStartRef = useRef(false);
  /** Full-screen style preview: { analysis, item? } — item when opened from vault/community for prompt copy. */
  const [stylePreviewContext, setStylePreviewContext] = useState(null);
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [communityTag, setCommunityTag] = useState('All');
  const [communitySort, setCommunitySort] = useState('trending');
  const [communitySearchGuideOpen, setCommunitySearchGuideOpen] = useState(false);
  /** `Set` of style ids the signed-in user has liked (from `style_likes`). */
  const [likedStyleIds, setLikedStyleIds] = useState(() => new Set());
  /** GENOM Daily palette ids liked locally (no `styles` row — persisted in localStorage). */
  const [likedDailyPaletteIds, setLikedDailyPaletteIds] = useState(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('genom-liked-daily-palettes');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(
        Array.isArray(arr) ? arr.filter((id) => typeof id === 'string' && isDailyPaletteItemId(id)) : []
      );
    } catch {
      return new Set();
    }
  });
  const [communityLikeBusyId, setCommunityLikeBusyId] = useState(null);
  const [publicPaletteHexCopyKey, setPublicPaletteHexCopyKey] = useState(null);
  const communityTagScrollRef = useRef(null);
  const communitySearchWrapRef = useRef(null);
  /** Bumps when tag chip clicks update localStorage so `communityTagList` resort runs. */
  const [communityTagClickEpoch, setCommunityTagClickEpoch] = useState(0);

  const user = session?.user ?? null;

  const { pinterestDailyCache } = useDailyPinterestDailyCards({
    fetchImageAsDataUrl,
    extractFiveDominantHexesFromDataUrl,
  });

  const dailyHomeHero = useMemo(() => {
    const palette = getDailyPalette(new Date());
    const key = formatDailyPaletteDateKey(new Date());
    const ent = pinterestDailyCache.entries[key];
    if (!ent?.imageUrl || !ent.colors?.length) {
      return {
        title: palette.title,
        overview: palette.overview,
        colors: palette.colors,
        imageUrl: null,
      };
    }
    const base = buildDailyPaletteFeedItem(new Date());
    const merged = mergeDailyPaletteFeedItemWithPinterest(base, ent);
    const cd = itemColorCardData(merged);
    const pinterestSwatches =
      Array.isArray(ent.colors) && ent.colors.length ? ent.colors.slice(0, 5) : null;
    const cardSwatches = cd?.colors?.length ? cd.colors : null;
    return {
      title: merged.aesthetic,
      overview: merged.prompt,
      colors: pinterestSwatches ?? cardSwatches ?? palette.colors,
      imageUrl: ent.imageUrl,
    };
  }, [pinterestDailyCache]);

  /** Community + tag chips only include published color cards (not full UI/UX extractions). */
  const colorPaletteExploreFeed = useMemo(
    () => exploreFeed.filter((item) => Boolean(itemColorCardData(item)?.colors?.length)),
    [exploreFeed]
  );

  const vaultColorPaletteItems = useMemo(
    () => personalLibrary.filter((item) => Boolean(itemColorCardData(item)?.colors?.length)),
    [personalLibrary]
  );

  const communityTagList = useMemo(() => {
    /** Per-tag: how many color cards use it + sum of likeCount (proxy for popularity; no separate click analytics). */
    const stats = new Map();
    const absorbItem = (item) => {
      if (!itemColorCardData(item)?.colors?.length) return;
      const likes = Number(item.likeCount) || 0;
      const seen = new Set();
      (item.keywords || []).forEach((k) => {
        const s = String(k).trim();
        if (!s || seen.has(s)) return;
        seen.add(s);
        const cur = stats.get(s) || { count: 0, likesSum: 0 };
        cur.count += 1;
        cur.likesSum += likes;
        stats.set(s, cur);
      });
    };

    const dailyHistory = buildDailyPaletteFeedItemsForHistory(new Date(), DAILY_PALETTE_HISTORY_DAYS);
    const mergedDailies = dailyHistory.map((item) => {
      if (!item.isDailyPalette || !item.dailyDateKey) return item;
      const ent = pinterestDailyCache.entries[item.dailyDateKey];
      if (!ent?.imageUrl || !ent.colors?.length) return item;
      return mergeDailyPaletteFeedItemWithPinterest(item, ent);
    });
    mergedDailies.forEach(absorbItem);
    colorPaletteExploreFeed.forEach(absorbItem);

    let tagClicks = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(COMMUNITY_TAG_CLICKS_STORAGE_KEY);
        const o = raw ? JSON.parse(raw) : {};
        if (o && typeof o === 'object') tagClicks = o;
      } catch {
        /* ignore */
      }
    }

    const ranked = Array.from(stats.entries()).sort((a, b) => {
      const ca = Number(tagClicks[a[0]]) || 0;
      const cb = Number(tagClicks[b[0]]) || 0;
      if (cb !== ca) return cb - ca;
      const [, sa] = a;
      const [, sb] = b;
      if (sb.likesSum !== sa.likesSum) return sb.likesSum - sa.likesSum;
      if (sb.count !== sa.count) return sb.count - sa.count;
      return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
    });
    return ['All', ...ranked.map(([tag]) => tag)];
  }, [colorPaletteExploreFeed, pinterestDailyCache, communityTagClickEpoch]);

  const bumpCommunityTagClick = useCallback((tag) => {
    if (tag === 'All' || !tag) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(COMMUNITY_TAG_CLICKS_STORAGE_KEY);
      const o = raw ? JSON.parse(raw) : {};
      const cur = o && typeof o === 'object' ? { ...o } : {};
      const k = String(tag);
      cur[k] = (Number(cur[k]) || 0) + 1;
      window.localStorage.setItem(COMMUNITY_TAG_CLICKS_STORAGE_KEY, JSON.stringify(cur));
    } catch {
      /* ignore */
    }
    setCommunityTagClickEpoch((n) => n + 1);
  }, []);

  const handleCommunityPickTagFromCard = useCallback(
    (payload) => {
      const isSearchPick =
        payload && typeof payload === 'object' && payload.type === 'search' && typeof payload.value === 'string';
      const isKeywordPick =
        payload && typeof payload === 'object' && payload.type === 'keyword' && typeof payload.value === 'string';

      let value = '';
      let mode = 'keyword';
      if (isSearchPick) {
        value = payload.value.trim();
        mode = 'search';
      } else if (isKeywordPick) {
        value = payload.value.trim();
        mode = 'keyword';
      } else {
        value = String(payload || '').trim();
        mode = 'keyword';
      }
      if (!value) return;

      bumpCommunityTagClick(value);
      if (mode === 'search') {
        setCommunityTag('All');
        setCommunitySearchQuery(value);
      } else {
        setCommunityTag(value);
        setCommunitySearchQuery('');
      }
      setCommunitySearchGuideOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
      });
    },
    [bumpCommunityTagClick]
  );

  /** One row per unique five-swatch hex sequence (dailies + community), first wins after sort. */
  const communityPaletteSignature = useCallback((item) => {
    const cd = itemColorCardData(item);
    if (!cd?.colors?.length) return null;
    return cd.colors
      .slice(0, 5)
      .map((c) => {
        let h = String(c?.hex ?? '')
          .trim()
          .toLowerCase();
        if (!h.startsWith('#')) h = `#${h}`;
        if (h.length === 4) {
          const r = h[1];
          const g = h[2];
          const b = h[3];
          h = `#${r}${r}${g}${g}${b}${b}`;
        }
        return h;
      })
      .join('|');
  }, []);

  const filteredExploreFeed = useMemo(() => {
    const matchesCommunityFilters = (item) => {
      const q = communitySearchQuery.trim().toLowerCase();
      if (q) {
        const a = (item.aesthetic || '').toLowerCase();
        const p = (item.prompt || '').toLowerCase();
        const keys = (item.keywords || []).map((k) => String(k).toLowerCase()).join(' ');
        const cd = itemColorCardData(item);
        const ov = (cd?.overview || '').toLowerCase();
        if (!a.includes(q) && !p.includes(q) && !keys.includes(q) && !ov.includes(q)) return false;
      }
      if (communityTag && communityTag !== 'All') {
        const t = communityTag.toLowerCase();
        const keys = (item.keywords || []).map((k) => String(k).toLowerCase());
        if (keys.some((k) => k === t || k.includes(t))) return true;
        const aes = (item.aesthetic || '').toLowerCase();
        if (aes.includes(t)) return true;
        return false;
      }
      return true;
    };

    const userList = colorPaletteExploreFeed.filter(matchesCommunityFilters);

    const dailyHistory = buildDailyPaletteFeedItemsForHistory(new Date(), DAILY_PALETTE_HISTORY_DAYS);
    const mergedDailies = dailyHistory.map((item) => {
      if (!item.isDailyPalette || !item.dailyDateKey) return item;
      const ent = pinterestDailyCache.entries[item.dailyDateKey];
      if (!ent?.imageUrl || !ent.colors?.length) return item;
      return mergeDailyPaletteFeedItemWithPinterest(item, ent);
    });
    const filteredDailies = mergedDailies.filter(matchesCommunityFilters);

    const merged = [...filteredDailies, ...userList];
    const byDate = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (communitySort === 'latest') {
      merged.sort(byDate);
    } else if (communitySort === 'popular') {
      merged.sort((a, b) => {
        const ca = a.likeCount ?? 0;
        const cb = b.likeCount ?? 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    } else {
      merged.sort(byDate);
    }

    const seenPaletteSigs = new Set();
    return merged.filter((item) => {
      const sig = communityPaletteSignature(item);
      if (!sig) return true;
      if (seenPaletteSigs.has(sig)) return false;
      seenPaletteSigs.add(sig);
      return true;
    });
  }, [
    colorPaletteExploreFeed,
    communitySearchQuery,
    communityTag,
    communitySort,
    communityPaletteSignature,
    pinterestDailyCache,
  ]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s);
        setAuthReady(true);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setAuthModalOpen(false);
      setLoginToDownloadOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e) => {
      if (!e.target.closest('[data-account-menu-root]')) setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!vaultNotice) return;
    const t = setTimeout(() => setVaultNotice(null), 6000);
    return () => clearTimeout(t);
  }, [vaultNotice]);

  useEffect(() => {
    if (activeTab !== 'explore') setCommunitySearchGuideOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!communitySearchGuideOpen) return;
    const onDoc = (e) => {
      if (communitySearchWrapRef.current && !communitySearchWrapRef.current.contains(e.target)) {
        setCommunitySearchGuideOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setCommunitySearchGuideOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [communitySearchGuideOpen]);

  const refreshStyles = useCallback(async () => {
    if (!supabase) {
      setPersonalLibrary([]);
      setExploreFeed([]);
      return;
    }
    const pubRes = await supabase
      .from('styles')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (!pubRes.error && pubRes.data) setExploreFeed(pubRes.data.map(mapStyleRow));
    else {
      console.error(pubRes.error);
      setExploreFeed([]);
    }
    if (!user?.id) {
      setPersonalLibrary([]);
      return;
    }
    const uid = user.id;
    const libRes = await supabase.from('styles').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (!libRes.error && libRes.data) setPersonalLibrary(libRes.data.map(mapStyleRow));
    else {
      console.error(libRes.error);
      setPersonalLibrary([]);
    }
  }, [user?.id, supabase]);

  const refreshMyStyleLikes = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLikedStyleIds(new Set());
      return;
    }
    const { data, error } = await supabase.from('style_likes').select('style_id').eq('user_id', user.id);
    if (error) {
      if (!String(error.message || '').includes('style_likes')) console.warn(error);
      return;
    }
    setLikedStyleIds(new Set((data || []).map((r) => r.style_id)));
  }, [supabase, user?.id]);

  useEffect(() => {
    void refreshStyles();
  }, [refreshStyles]);

  useEffect(() => {
    void refreshMyStyleLikes();
  }, [refreshMyStyleLikes, exploreFeed.length]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('styles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'styles' }, () => {
        void refreshStyles();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshStyles, supabase]);

  const toggleCommunityLike = useCallback(
    async (styleId) => {
      if (!styleId) return;
      if (!user?.id) {
        setAuthModalOpen(true);
        return;
      }
      if (isDailyPaletteItemId(styleId)) {
        setCommunityLikeBusyId(styleId);
        setLikedDailyPaletteIds((prev) => {
          const n = new Set(prev);
          if (n.has(styleId)) n.delete(styleId);
          else n.add(styleId);
          try {
            localStorage.setItem('genom-liked-daily-palettes', JSON.stringify([...n]));
          } catch (_) {
            /* ignore quota */
          }
          return n;
        });
        setCommunityLikeBusyId(null);
        return;
      }
      if (!supabase) return;
      setCommunityLikeBusyId(styleId);
      const wasLiked = likedStyleIds.has(styleId);
      try {
        if (wasLiked) {
          const { error } = await supabase.from('style_likes').delete().eq('style_id', styleId).eq('user_id', user.id);
          if (error) throw error;
          setLikedStyleIds((prev) => {
            const n = new Set(prev);
            n.delete(styleId);
            return n;
          });
          setExploreFeed((prev) =>
            prev.map((it) =>
              it.id === styleId ? { ...it, likeCount: Math.max(0, (it.likeCount ?? 0) - 1) } : it
            )
          );
        } else {
          const { error } = await supabase.from('style_likes').insert({ style_id: styleId, user_id: user.id });
          if (error) throw error;
          setLikedStyleIds((prev) => {
            const n = new Set(prev);
            n.add(styleId);
            return n;
          });
          setExploreFeed((prev) =>
            prev.map((it) => (it.id === styleId ? { ...it, likeCount: (it.likeCount ?? 0) + 1 } : it))
          );
        }
      } catch (e) {
        console.error(e);
        const msg = e.message || 'Could not update like.';
        if (String(msg).includes('style_likes') || String(msg).includes('like_count')) {
          setAnalysisError('Run the latest Supabase migration (style_likes) to enable likes.');
        } else {
          setAnalysisError(msg);
        }
      }
      setCommunityLikeBusyId(null);
    },
    [supabase, user?.id, likedStyleIds]
  );

  const shareStyleOpenedRef = useRef(null);

  const deleteVaultStyle = useCallback(
    async (itemId) => {
      if (!user || !supabase || !itemId) return;
      if (!window.confirm('Remove this color card from your vault? This cannot be undone.')) return;
      setDeletingVaultId(itemId);
      setAnalysisError(null);
      const { error } = await supabase.from('styles').delete().eq('id', itemId).eq('user_id', user.id);
      setDeletingVaultId(null);
      if (error) {
        console.error(error);
        setAnalysisError(error.message || 'Could not delete.');
        return;
      }
      if (vaultSavedId === itemId) setVaultSavedId(null);
      if (stylePreviewContext?.item?.id === itemId) {
        shareStyleOpenedRef.current = null;
        setStylePreviewContext(null);
      }
      await refreshStyles();
      setVaultNotice({ kind: 'vault', text: 'Removed from your vault.' });
    },
    [user, supabase, vaultSavedId, stylePreviewContext?.item?.id, refreshStyles]
  );

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('style');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    if (shareStyleOpenedRef.current === id) return;

    const stripStyleParam = () => {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('style');
        const next = `${u.pathname}${u.search}${u.hash}`;
        window.history.replaceState({}, '', next || '/');
      } catch {
        /* ignore */
      }
    };

    const openItem = (item) => {
      shareStyleOpenedRef.current = id;
      setActiveTab('explore');
      setStylePreviewContext({ analysis: styleItemToAnalysisResult(item), item });
      stripStyleParam();
    };

    const inFeed = exploreFeed.find((x) => x.id === id);
    if (inFeed) {
      openItem(inFeed);
      return undefined;
    }

    if (!supabase) return undefined;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .maybeSingle();
      if (cancelled || error || !data) return;
      if (shareStyleOpenedRef.current === id) return;
      openItem(mapStyleRow(data));
    })();

    return () => {
      cancelled = true;
    };
  }, [exploreFeed, supabase]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnalysisError(null);
      setExtractInputMode('image');
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const persistPrivateVaultRow = useCallback(
    async (parsed, imageSrc) => {
      if (!user || !supabase) {
        return { id: null, error: new Error('Sign in and configure Supabase to save to your vault.') };
      }
      if (!parsed || !imageSrc || !String(imageSrc).trim()) {
        return { id: null, error: new Error('Missing style or image for vault save.') };
      }

      let imageUrl = imageSrc;
      if (/^data:image\//.test(imageSrc)) {
        const { publicUrl, error: upErr } = await uploadStyleImageFromDataUrl(supabase, user.id, imageSrc);
        if (publicUrl) {
          imageUrl = publicUrl;
        } else {
          console.warn('style-images upload failed, using compressed data URL:', upErr);
          try {
            imageUrl = await compressImageDataUrl(imageSrc, 1200, 0.82);
            if (imageUrl.length > 1_200_000) {
              imageUrl = await compressImageDataUrl(imageSrc, 800, 0.78);
            }
          } catch (e) {
            console.error(e);
            return {
              id: null,
              error: new Error(
                e.message ||
                  'Could not prepare the image. Create the `style-images` storage bucket (migration 003) or use a smaller photo.'
              ),
            };
          }
        }
      }

      let extraction_snapshot;
      try {
        extraction_snapshot = JSON.parse(JSON.stringify(parsed));
      } catch {
        extraction_snapshot = null;
      }

      const fields = extractionToRowFields(parsed);
      const row = {
        user_id: user.id,
        is_public: false,
        image_url: imageUrl,
        ...fields,
        extraction_snapshot,
      };

      let { data, error } = await supabase.from('styles').insert(row).select('id').single();
      if (error && /extraction_snapshot|column/i.test(error.message || '')) {
        const { extraction_snapshot: _snap, ...withoutSnap } = row;
        const second = await supabase.from('styles').insert(withoutSnap).select('id').single();
        data = second.data;
        error = second.error;
      }
      if (error) {
        console.error(error);
        return {
          id: null,
          error: new Error(
            error.message ||
              'Could not save. If the image is large, run Supabase migration 003 (storage + extraction_snapshot). Check RLS and the `styles` table.'
          ),
        };
      }
      return { id: data?.id ?? null, error: null };
    },
    [user, supabase]
  );

  const persistColorCardVaultRow = useCallback(
    async (imageSrc, card) => {
      if (!user || !supabase) {
        return { id: null, error: new Error('Sign in and configure Supabase to save to your vault.') };
      }
      if (!card?.colors?.length || !imageSrc) {
        return { id: null, error: new Error('Missing color card data.') };
      }
      let imageUrl = imageSrc;
      if (/^data:image\//.test(imageSrc)) {
        const { publicUrl, error: upErr } = await uploadStyleImageFromDataUrl(supabase, user.id, imageSrc);
        if (publicUrl) {
          imageUrl = publicUrl;
        } else {
          console.warn('style-images upload failed, using compressed data URL:', upErr);
          try {
            imageUrl = await compressImageDataUrl(imageSrc, 1200, 0.82);
            if (imageUrl.length > 1_200_000) imageUrl = await compressImageDataUrl(imageSrc, 800, 0.78);
          } catch (e) {
            return { id: null, error: new Error(e.message || 'Could not prepare image.') };
          }
        }
      }
      const hexes = card.colors.map((c) => c.hex);
      const snapshot = {
        colorCard: true,
        colorCardData: { overview: card.overview, colors: card.colors },
        aesthetic: card.colors[0]?.name || 'Color card',
        keywords: ['color-extract', 'palette'],
        prompt: card.overview,
      };
      let extraction_snapshot;
      try {
        extraction_snapshot = JSON.parse(JSON.stringify(snapshot));
      } catch {
        extraction_snapshot = null;
      }
      const row = {
        user_id: user.id,
        is_public: false,
        image_url: imageUrl,
        aesthetic: (card.colors[0]?.name || 'Color card').slice(0, 120),
        typography: null,
        fonts: null,
        palette: hexes,
        design_logic: card.overview,
        keywords: ['color-extract', 'palette'],
        prompt: card.overview,
        extraction_snapshot,
      };
      let { data, error } = await supabase.from('styles').insert(row).select('id').single();
      if (error && /extraction_snapshot|column/i.test(error.message || '')) {
        const { extraction_snapshot: _s, ...rest } = row;
        const second = await supabase.from('styles').insert(rest).select('id').single();
        data = second.data;
        error = second.error;
      }
      if (error) return { id: null, error: new Error(error.message || 'Could not save color card.') };
      return { id: data?.id ?? null, error: null };
    },
    [user, supabase]
  );

  const updateColorCardVaultRow = useCallback(
    async (rowId, card) => {
      if (!user || !supabase || !rowId || !card?.colors?.length) {
        return { error: new Error('Cannot update vault row.') };
      }
      const hexes = card.colors.map((c) => c.hex);
      const snapshot = {
        colorCard: true,
        colorCardData: { overview: card.overview, colors: card.colors },
        aesthetic: card.colors[0]?.name || 'Color card',
        keywords: ['color-extract', 'palette'],
        prompt: card.overview,
      };
      let extraction_snapshot;
      try {
        extraction_snapshot = JSON.parse(JSON.stringify(snapshot));
      } catch {
        extraction_snapshot = null;
      }
      const payload = {
        palette: hexes,
        design_logic: card.overview,
        prompt: card.overview,
        aesthetic: (card.colors[0]?.name || 'Color card').slice(0, 120),
        extraction_snapshot,
      };
      const { error } = await supabase.from('styles').update(payload).eq('id', rowId).eq('user_id', user.id);
      return { error: error || null };
    },
    [user, supabase]
  );

  const runColorCardPipelineForDataUrl = useCallback(
    async (dataUrl) => {
      if (!dataUrl || !/^data:image\//.test(dataUrl)) {
        setAnalysisError('Invalid image data.');
        return;
      }
      extractionHadUserAtStartRef.current = !!user;
      setIsAnalyzing(true);
      setAnalysisError(null);
      setVaultSavedId(null);
      setSelectedImage(dataUrl);
      setColorCardSession(null);
      setColorCardRefinementCommitted(false);
      setAnalysisResult(null);
      setExtractInputMode('image');
      setActiveTab('analyze');

      try {
        const hexes = await extractFiveDominantHexesFromDataUrl(dataUrl);
        let card;
        if (deepseekApiKey) {
          try {
            card = await fetchColorCardMetadata({
              apiKey: deepseekApiKey,
              baseUrl: deepseekColorCardBaseUrl,
              model: deepseekModel,
              hexes,
            });
          } catch (e) {
            console.warn('Color naming API failed:', e);
            card = fallbackColorCardMetadata(hexes);
          }
        } else {
          card = fallbackColorCardMetadata(hexes);
        }
        setColorCardSession(card);

        if (user && supabase) {
          setSavingStyle(true);
          const { id, error: vaultErr } = await persistColorCardVaultRow(dataUrl, card);
          setSavingStyle(false);
          if (vaultErr) {
            setAnalysisError(vaultErr.message || 'Could not save to vault.');
          } else if (id) {
            setVaultSavedId(id);
            await refreshStyles();
            setVaultNotice({
              kind: 'vault',
              text: 'Color card saved to your Vault. Run UI/UX design when you want the full style preview.',
            });
          }
        } else if (user && !supabaseConfigured) {
          setVaultNotice({
            kind: 'warn',
            text: 'Configure Supabase to save color cards to your Vault.',
          });
        }
      } catch (err) {
        console.error(err);
        setAnalysisError(err.message || 'Could not extract colors.');
      }
      setIsAnalyzing(false);
    },
    [
      user,
      supabase,
      supabaseConfigured,
      deepseekApiKey,
      deepseekColorCardBaseUrl,
      deepseekModel,
      persistColorCardVaultRow,
      refreshStyles,
    ]
  );

  const updateVaultRowWithFullStyle = useCallback(
    async (rowId, parsed) => {
      if (!user || !supabase || !rowId || !parsed) {
        return { error: new Error('Cannot update vault row.') };
      }
      let extraction_snapshot;
      try {
        extraction_snapshot = JSON.parse(JSON.stringify(parsed));
      } catch {
        extraction_snapshot = null;
      }
      const fields = extractionToRowFields(parsed);
      const { error } = await supabase
        .from('styles')
        .update({ ...fields, extraction_snapshot })
        .eq('id', rowId)
        .eq('user_id', user.id);
      return { error: error || null };
    },
    [user, supabase]
  );

  const persistExtractionOutcome = async (parsed, imageDataUrl, source) => {
    setVaultSavedId(null);
    setAnalysisResult(parsed);
    setExtractionSource(source);
    if (source === 'text') {
      setSelectedImage(BRIEF_ONLY_PLACEHOLDER_IMAGE);
    }

    if (user && supabase) {
      if (!imageDataUrl || !String(imageDataUrl).trim()) {
        setAnalysisError('Missing image data — could not save to your vault.');
      } else {
        setSavingStyle(true);
        const { id, error: vaultErr } = await persistPrivateVaultRow(parsed, imageDataUrl);
        setSavingStyle(false);
        if (vaultErr) {
          setAnalysisError(vaultErr.message || 'Could not save to your vault.');
        } else if (id) {
          setVaultSavedId(id);
          await refreshStyles();
          setVaultNotice({
            kind: 'vault',
            text: 'Saved automatically to your Vault (private). Publish to Community only if you want it public.',
          });
        }
      }
    } else if (user && !supabaseConfigured) {
      setVaultNotice({
        kind: 'warn',
        text: 'Sign-in detected but Supabase is not configured — add VITE_SUPABASE_URL + ANON KEY to auto-save to your Vault.',
      });
    }

    /* Do not auto-open Style preview — user opens it with "UI/UX design preview" after extraction. */
  };

  const runImageStyleExtraction = async (overrides = null) => {
    if (overrides && typeof overrides === 'object' && 'nativeEvent' in overrides) {
      overrides = null;
    }
    const imageSrc =
      overrides && typeof overrides === 'object' && overrides.imageDataUrl
        ? overrides.imageDataUrl
        : selectedImage;
    if (!imageSrc) return;
    if (!deepseekApiKey) {
      setAnalysisError('Add VITE_DEEPSEEK_API_KEY to .env (see .env.example), then restart the dev server.');
      return;
    }
    if (!/^data:image\//.test(imageSrc)) {
      setAnalysisError('Could not read image data.');
      return;
    }
    const rowId =
      overrides && typeof overrides === 'object' && overrides.vaultRowId != null
        ? overrides.vaultRowId
        : vaultSavedId;
    const session =
      overrides && typeof overrides === 'object' && overrides.colorCardSession != null
        ? overrides.colorCardSession
        : colorCardSession;

    if (overrides?.imageDataUrl) setSelectedImage(overrides.imageDataUrl);

    extractionHadUserAtStartRef.current = !!user;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const summary = await extractVisualSummaryFromDataUrl(imageSrc);
      const spatialBlock = formatSpatialSampleForPrompt(summary);
      const systemPrompt = `You are a senior product/UI and graphic designer. You do NOT see pixels directly — you receive structured color samples extracted in the browser from the user's reference image, including a 3×3 spatial grid and horizontal bands.

Your job is to reverse-engineer the likely interface or brand layout: where chrome vs content sits, which repeated color blobs suggest buttons or cards, and how to map sampled hex codes to semantic roles. Be explicit and tie claims to the spatial data when possible. When uncertain, state reasonable UI defaults and why.

${JSON_STYLE_KEYS}

Base "palette" on the global + regional samples (add at most 2 harmonizing neutrals if needed). "colorRoles" values must be valid #RRGGBB and consistent with "palette". Typography/fonts are mood-based fits, not verified from letterforms.

Fill "styleIdentification" first (it is the structured spec), then set "uiGeometry.preset" and tokens to match. The live preview reads those fields to approximate mesh backgrounds, heading compression, and brutal / ultra-rounded geometry.

The "prompt" field must read like a handoff to another model or engineer: dense, spatially aware, component-aware, and color-exact.

${DESIGN_UX_FRAMEWORK_FOR_AI}`;

      const userText = `${spatialBlock}

Output the complete JSON object now (all required keys).`;

      const parsed = await fetchDeepSeekStyleJson({
        apiKey: deepseekApiKey,
        baseUrl: deepseekBaseUrl,
        model: deepseekModel,
        systemPrompt,
        userMessage: userText,
      });
      const canMerge =
        Boolean(user && supabase && rowId && session && Array.isArray(session.colors) && session.colors.length);
      if (canMerge) {
        setSavingStyle(true);
        const { error: upErr } = await updateVaultRowWithFullStyle(rowId, parsed);
        setSavingStyle(false);
        if (upErr) throw upErr;
        setColorCardSession(null);
        setAnalysisResult(parsed);
        setExtractionSource('image');
        await refreshStyles();
        setVaultNotice({
          kind: 'vault',
          text: 'Full UI/UX style saved onto your color card in Vault.',
        });
      } else {
        await persistExtractionOutcome(parsed, imageSrc, 'image');
      }
    } catch (err) {
      console.error('Analysis Failed:', err);
      if (err instanceof SyntaxError || String(err.message || '').toLowerCase().includes('json')) {
        setAnalysisError('DeepSeek returned invalid JSON. Try again or raise max_tokens.');
      } else {
        setAnalysisError(err.message || 'Analysis failed.');
      }
    }
    setIsAnalyzing(false);
  };

  const analyzeStyle = async () => {
    await runImageStyleExtraction(null);
  };

  const openVaultColorCardInWorkspace = async () => {
    const ctx = stylePreviewContext;
    const item = ctx?.item;
    const cd = ctx?.analysis?.colorCardData;
    if (!item?.imageUrl || !cd?.colors?.length) return;
    const ownRow = Boolean(user?.id && item.ownerUserId && item.ownerUserId === user.id);
    setAnalysisError(null);
    setOpeningVaultColorInWorkspace(true);
    try {
      const dataUrl = await fetchImageAsDataUrl(item.imageUrl);
      setSelectedImage(dataUrl);
      setVaultSavedId(ownRow ? item.id : null);
      setColorCardSession(cd);
      setColorCardRefinementCommitted(true);
      setAnalysisResult(null);
      setActiveTab('analyze');
      setStylePreviewContext(null);
    } catch (err) {
      console.error(err);
      setAnalysisError(
        err.message || 'Could not load image — try re-uploading from Extract.'
      );
    } finally {
      setOpeningVaultColorInWorkspace(false);
    }
  };

  const extractFiveMainColors = async () => {
    if (!selectedImage || !/^data:image\//.test(selectedImage)) {
      setAnalysisError('Upload a photo first.');
      return;
    }
    await runColorCardPipelineForDataUrl(selectedImage);
  };

  const downloadColorCardPng = async (imageSrc, card) => {
    if (!imageSrc || !card?.colors?.length) return;
    if (supabaseConfigured && !user) {
      setLoginToDownloadOpen(true);
      return;
    }
    setColorCardDownloadBusy(true);
    setAnalysisError(null);
    try {
      const img = await loadImageForCanvas(imageSrc);
      const blob = await renderColorCardToPngBlob({
        overview: card.overview,
        colors: card.colors,
        image: img,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'genom-color-card.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setAnalysisError(e.message || 'Could not export PNG.');
    }
    setColorCardDownloadBusy(false);
  };

  const analyzeStyleFromTextBrief = async () => {
    const brief = textBrief.trim();
    if (brief.length < 32) {
      setAnalysisError(
        'Write a fuller description (product type, vibe keywords, key UI areas, colors, typography cues) — at least a few sentences.'
      );
      return;
    }
    if (!deepseekApiKey) {
      setAnalysisError('Add VITE_DEEPSEEK_API_KEY to .env (see .env.example), then restart the dev server.');
      return;
    }

    extractionHadUserAtStartRef.current = !!user;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const systemPrompt = `You are a senior product/UI and graphic designer. The user did not upload a reference image — they described desired UI/UX in words. Produce the same structured JSON our app uses for live style preview and replication prompts: invent a coherent, buildable interface system that matches their description.

${JSON_STYLE_KEYS_FROM_TEXT}

Base "palette" on mood, trust goals, and functional context in the brief (add harmonizing neutrals as needed). "colorRoles" must be valid #RRGGBB and consistent with "palette". Name real Google Fonts when plausible.

Fill "styleIdentification" first, align "uiGeometry.preset" with shapes/borders/shadows in the brief, then the long "prompt" handoff.

${DESIGN_UX_FRAMEWORK_FOR_AI}`;

      const userMessage = `USER TEXT BRIEF:\n"""\n${brief}\n"""\n\nOutput the complete JSON object now (all required keys).`;

      const parsed = await fetchDeepSeekStyleJson({
        apiKey: deepseekApiKey,
        baseUrl: deepseekBaseUrl,
        model: deepseekModel,
        systemPrompt,
        userMessage,
      });
      await persistExtractionOutcome(parsed, BRIEF_ONLY_PLACEHOLDER_IMAGE, 'text');
    } catch (err) {
      console.error('Text brief extraction failed:', err);
      if (err instanceof SyntaxError || String(err.message || '').toLowerCase().includes('json')) {
        setAnalysisError('DeepSeek returned invalid JSON. Try again or raise max_tokens.');
      } else {
        setAnalysisError(err.message || 'Generation failed.');
      }
    }
    setIsAnalyzing(false);
  };

  /** After extraction as a guest, save to vault once the user signs in. */
  useEffect(() => {
    if (!user || !supabase) return;
    if (extractionHadUserAtStartRef.current) return;
    if (vaultSavedId) return;

    if (
      colorCardSession &&
      colorCardRefinementCommitted &&
      selectedImage &&
      /^data:image\//.test(selectedImage) &&
      !analysisResult
    ) {
      let cancelled = false;
      (async () => {
        setSavingStyle(true);
        setAnalysisError(null);
        const { id, error: vaultErr } = await persistColorCardVaultRow(selectedImage, colorCardSession);
        if (cancelled) {
          setSavingStyle(false);
          return;
        }
        if (vaultErr) {
          setAnalysisError(vaultErr.message || 'Could not save color card.');
          setSavingStyle(false);
          return;
        }
        if (id) {
          setVaultSavedId(id);
          await refreshStyles();
          setVaultNotice({ kind: 'vault', text: 'Color card saved to your Vault.' });
        }
        setSavingStyle(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!analysisResult || !selectedImage || !String(selectedImage).trim()) return;

    let cancelled = false;
    (async () => {
      setSavingStyle(true);
      setAnalysisError(null);
      const { id, error: vaultErr } = await persistPrivateVaultRow(analysisResult, selectedImage);
      if (cancelled) {
        setSavingStyle(false);
        return;
      }
      if (vaultErr) {
        setAnalysisError(vaultErr.message || 'Could not save to your vault.');
        setSavingStyle(false);
        return;
      }
      if (id) {
        setVaultSavedId(id);
        await refreshStyles();
        setVaultNotice({
          kind: 'vault',
          text: 'Saved automatically to your Vault (private). Publish to Community only if you want it public.',
        });
      }
      setSavingStyle(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    user,
    supabase,
    analysisResult,
    vaultSavedId,
    selectedImage,
    colorCardSession,
    colorCardRefinementCommitted,
    persistPrivateVaultRow,
    persistColorCardVaultRow,
    refreshStyles,
  ]);

  const publishVaultEntryToCommunity = async () => {
    if (!user || !supabase || !vaultSavedId || savingStyle) return;
    setSavingStyle(true);
    setAnalysisError(null);
    const { error } = await supabase
      .from('styles')
      .update({ is_public: true })
      .eq('id', vaultSavedId)
      .eq('user_id', user.id);
    if (error) {
      console.error(error);
      setAnalysisError(error.message || 'Could not publish to Community.');
      setSavingStyle(false);
      return;
    }
    await refreshStyles();
    setVaultNotice({
      kind: 'public',
      text: 'Published to Community. Anyone can browse it there (prompt is visible like other community cards).',
    });
    setActiveTab('explore');
    setStylePreviewContext(null);
    setAnalysisResult(null);
    setSelectedImage(null);
    setVaultSavedId(null);
    setSavingStyle(false);
  };

  const returnToExtractionWorkspace = useCallback(async () => {
    if (savingStyle) return;
    if (vaultSavedId && supabase && user) {
      setSavingStyle(true);
      const { error: delErr } = await supabase
        .from('styles')
        .delete()
        .eq('id', vaultSavedId)
        .eq('user_id', user.id);
      if (delErr) console.error(delErr);
      await refreshStyles();
      setSavingStyle(false);
    }
    setStylePreviewContext(null);
    setAnalysisResult(null);
    setColorCardSession(null);
    setColorCardRefinementCommitted(false);
    setSelectedImage(null);
    setTextBrief('');
    setExtractInputMode('image');
    setExtractionSource('image');
    setAnalysisError(null);
    setVaultSavedId(null);
    setActiveTab('analyze');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        extractWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [user, supabase, vaultSavedId, savingStyle, refreshStyles]);

  const copyToClipboard = (text, id) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#ccff00] overflow-hidden flex flex-col relative">
      {/* Mesh Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00e5ff] rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#ccff00] rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#ccff00] rounded-full blur-[100px] opacity-10"></div>
      </div>

      {/* Header / Nav — fixed (not sticky): root uses overflow-hidden, which breaks sticky and can hide the bar after scrollIntoView / extract. */}
      <header className="fixed top-0 left-0 right-0 z-[100] px-6 flex items-center justify-between border-b border-black/10 bg-white/95 backdrop-blur-md pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            requestAnimationFrame(() => {
              homeLandingRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }}
          className="group flex items-center text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00] focus-visible:ring-offset-2"
          aria-label="Go to home"
        >
          <span className="relative inline-block h-[31px] shrink-0">
            <img
              src={logoMarkDefault}
              alt=""
              draggable={false}
              className="block h-[31px] w-auto max-h-[31px] object-contain object-left pointer-events-none transition-opacity duration-200 ease-out motion-reduce:transition-none group-hover:opacity-0 group-focus-visible:opacity-0"
            />
            <img
              src={logoMarkHover}
              alt=""
              draggable={false}
              className="absolute left-0 top-0 h-[31px] w-auto max-h-[31px] object-contain object-left pointer-events-none opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </span>
        </button>
        <div className="flex gap-1 md:gap-4">
          <HeaderTab
            active={activeTab === 'analyze'}
            onClick={() => {
              setActiveTab('analyze');
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (extractWorkspaceRef.current) {
                    extractWorkspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                });
              });
            }}
            label="Extract"
          />
          <HeaderTab active={activeTab === 'library'} onClick={() => setActiveTab('library')} label="Vault" />
          <HeaderTab active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} label="Community" />
          <HeaderTab active={activeTab === 'about'} onClick={() => setActiveTab('about')} label="About us" />
        </div>
        <div className="relative shrink-0 flex items-center gap-2" data-account-menu-root>
          {!user && (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black underline decoration-2 underline-offset-4"
            >
              Log in
            </button>
          )}
          {user && (
            <span
              className="hidden sm:inline max-w-[100px] sm:max-w-[140px] lg:max-w-[200px] truncate text-xs font-black text-right"
              title={displayUserName(user)}
            >
              {displayUserName(user)}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (!supabaseConfigured) {
                setAuthModalOpen(true);
                return;
              }
              if (user) {
                setAccountMenuOpen((o) => !o);
                return;
              }
              setAuthModalOpen(true);
            }}
            className="w-10 h-10 shrink-0 cursor-pointer bg-black rounded-full flex items-center justify-center text-white overflow-hidden border-2 border-black hover:ring-2 hover:ring-[#ccff00] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00] focus-visible:ring-offset-2"
            title={user ? `${displayUserName(user)} — account menu` : 'Sign in'}
            aria-label={user ? 'Open account menu' : 'Sign in'}
          >
            {!authReady && supabaseConfigured ? (
              <Loader2 className="animate-spin" size={18} />
            ) : user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={16} />
            )}
          </button>
          {user && accountMenuOpen && (
            <div className="absolute right-0 top-12 w-56 border-2 border-black rounded-2xl bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3 z-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Signed in</p>
              <p className="text-sm font-black truncate mb-0.5">{displayUserName(user)}</p>
              <p className="text-[10px] font-bold text-neutral-500 truncate mb-3">{user.email || user.id}</p>
              <button
                type="button"
                onClick={async () => {
                  setAccountMenuOpen(false);
                  setRecoveryMode(false);
                  await supabase?.auth.signOut();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-[#ccff00]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} supabase={supabase} />

      <DailyPaletteModal
        open={dailyPaletteModalOpen}
        onClose={() => setDailyPaletteModalOpen(false)}
        dailyHero={dailyHomeHero}
      />

      <button
        type="button"
        onClick={() => setDailyPaletteModalOpen(true)}
        className="fixed z-[55] bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] w-14 h-14 rounded-full border-2 border-black bg-[#ccff00] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        aria-label="Open today’s daily palette"
        title="Daily palette"
      >
        <CalendarSync size={22} strokeWidth={2.25} aria-hidden />
      </button>

      {loginToDownloadOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-to-download-title"
        >
          <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 md:p-8">
            <button
              type="button"
              onClick={() => setLoginToDownloadOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full border-2 border-black flex items-center justify-center hover:bg-[#ccff00] transition-colors"
              aria-label="Close"
            >
              <X size={18} aria-hidden />
            </button>
            <h2 id="login-to-download-title" className="text-lg md:text-xl font-black uppercase tracking-tight pr-10 mb-2">
              Log in to download
            </h2>
            <p className="text-sm font-medium text-neutral-700 leading-relaxed mb-6">
              Sign in to save your work and download your color card as a PNG.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setLoginToDownloadOpen(false);
                  setAuthModalOpen(true);
                }}
                className="flex-1 py-3 rounded-full bg-[#ccff00] border-2 border-black font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setLoginToDownloadOpen(false)}
                className="flex-1 py-3 rounded-full bg-white border-2 border-black font-black text-[10px] uppercase tracking-widest hover:bg-neutral-100 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stylePreviewContext?.analysis?.colorCardOnly && stylePreviewContext.analysis.colorCardData ? (
        <ColorCardPreviewOverlay
          imageSrc={stylePreviewContext.item?.imageUrl || selectedImage || ''}
          colorCardData={stylePreviewContext.analysis.colorCardData}
          onClose={() => {
            shareStyleOpenedRef.current = null;
            setStylePreviewContext(null);
          }}
          onCopySwatch={(c) => {
            const block = `HEX ${c.hex}\n${formatRgbLine(c.rgb[0], c.rgb[1], c.rgb[2])}\n${formatCmykLine(c.cmyk)}`;
            copyToClipboard(block, `swatch-${c.hex}`);
            setCopiedSwatchHex(c.hex);
            setTimeout(() => setCopiedSwatchHex(null), 2000);
          }}
          copiedHex={copiedSwatchHex}
          downloadBusy={colorCardDownloadBusy}
          onDownload={() =>
            downloadColorCardPng(
              stylePreviewContext.item?.imageUrl || selectedImage || '',
              stylePreviewContext.analysis.colorCardData
            )
          }
          onOpenInExtract={openVaultColorCardInWorkspace}
          openInExtractBusy={openingVaultColorInWorkspace}
        />
      ) : null}
      {stylePreviewContext?.analysis && !stylePreviewContext.analysis.colorCardOnly ? (
        <StylePreviewPage
          analysis={stylePreviewContext.analysis}
          onClose={() => {
            shareStyleOpenedRef.current = null;
            setStylePreviewContext(null);
          }}
          onCopyPrompt={() => {
            const ctx = stylePreviewContext;
            const text = ctx.item ? mergedStylePrompt(ctx.item) : ctx.analysis?.prompt || '';
            const key = ctx.item ? `${ctx.item.id}-preview` : 'live-preview';
            copyToClipboard(text, key);
          }}
          copyStatus={copyStatus}
          copyPromptKey={
            stylePreviewContext.item ? `${stylePreviewContext.item.id}-preview` : 'live-preview'
          }
        />
      ) : null}

      {recoveryMode && supabase && (
        <SetPasswordModal
          supabase={supabase}
          onSuccess={() => {
            setRecoveryMode(false);
            setAuthModalOpen(false);
          }}
        />
      )}

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
        {activeTab === 'home' ? (
          <div
            ref={homeLandingRef}
            className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-y-contain"
          >
            <section className="flex flex-col border-b-2 border-black overflow-hidden min-h-[calc(100dvh-6rem)]">
              <HomeLanding
                onEnterLab={() => {
                  setActiveTab('analyze');
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      extractWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                  });
                }}
              />
            </section>
          </div>
        ) : activeTab === 'analyze' && !analysisResult && !colorCardSession ? (
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-y-contain">
            <section
              ref={extractWorkspaceRef}
              id="extract-workspace"
              className="flex flex-col bg-white min-h-[calc(100dvh-6rem)] sm:min-h-[calc(108dvh-6rem)] border-b-2 border-black"
            >
              <div className="flex-1 flex flex-col min-h-0 p-4 md:p-12 pb-24 md:pb-32">
                <div className="max-w-7xl mx-auto flex flex-col items-center flex-1 w-full min-h-0">
                  <p className="w-full text-left text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400 mb-8 md:mb-10 shrink-0">
                    Extract · Workspace
                  </p>
                  <div className="w-full flex flex-col md:flex-row gap-12 md:gap-16 items-center justify-center flex-1 min-h-[68vh] md:min-h-[calc(100dvh-13rem)] py-6 md:py-10">
                <div className="flex-1 space-y-8">
                  <h2 className="text-7xl md:text-[120px] leading-[0.8] font-black uppercase tracking-tighter scale-y-110">
                    DECON
                    <br />
                    STRUCT
                  </h2>
                  <p className="text-lg md:text-xl max-w-md font-medium leading-tight">
                    Upload a photo — we detect five dominant colors, name them, and build a shareable color card. Optionally
                    open UI/UX design for a full style preview.
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('about');
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
                        });
                      }}
                      className="px-6 py-3 bg-[#ccff00] border-2 border-black rounded-full font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                      Learn more
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('explore');
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
                        });
                      }}
                      className="px-6 py-3 bg-white border-2 border-black rounded-full font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                      Explore more palettes
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-xl space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExtractInputMode('image');
                        setAnalysisError(null);
                      }}
                      className={`px-4 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all ${
                        extractInputMode === 'image'
                          ? 'bg-[#ccff00] shadow-[3px_3px_0_0_#000]'
                          : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      Reference image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExtractInputMode('text');
                        setAnalysisError(null);
                      }}
                      className={`px-4 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 ${
                        extractInputMode === 'text'
                          ? 'bg-[#ccff00] shadow-[3px_3px_0_0_#000]'
                          : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <Sparkles size={14} className="shrink-0" aria-hidden />
                      Text → UI style
                    </button>
                  </div>

                  {extractInputMode === 'image' ? (
                    <>
                      {selectedImage &&
                      selectedImage !== BRIEF_ONLY_PLACEHOLDER_IMAGE &&
                      /^data:image\//.test(selectedImage) ? (
                        <div className="relative aspect-square border-2 border-black rounded-3xl overflow-hidden shadow-2xl bg-white p-2 group">
                          <img src={selectedImage} className="w-full h-full object-cover rounded-2xl" alt="Selected" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedImage(null);
                                setAnalysisError(null);
                              }}
                              className="bg-red-500 text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-transform"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                          {isAnalyzing ? (
                            <div className="absolute inset-0 bg-[#ccff00]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-8 text-center">
                              <Loader2 className="animate-spin mb-4" size={48} />
                              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Extracting DNA…</h2>
                            </div>
                          ) : (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none">
                              <button
                                type="button"
                                onClick={extractFiveMainColors}
                                className="pointer-events-auto px-10 py-4 bg-[#ccff00] border border-black rounded-full font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-[transform,box-shadow] duration-150 whitespace-nowrap"
                              >
                                Extract 5 colors
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                      {!(
                        selectedImage &&
                        selectedImage !== BRIEF_ONLY_PLACEHOLDER_IMAGE &&
                        /^data:image\//.test(selectedImage)
                      ) ? (
                        <label className="aspect-square border-2 border-black border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:bg-[#ccff00]/10 transition-colors group">
                          <div className="w-24 h-24 bg-white border-2 border-black rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                            <Upload size={32} />
                          </div>
                          <span className="text-3xl font-black uppercase tracking-tighter">Add Component</span>
                          <span className="text-neutral-500 font-bold mt-2">IMAGE / PNG / JPG</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      ) : null}
                    </>
                  ) : (
                    <div className="relative border-2 border-black rounded-3xl bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 flex flex-col min-h-[min(72vw,420px)] md:min-h-[440px]">
                      <label htmlFor="text-brief-ui" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00c2d6] mb-2">
                        Describe the interface
                      </label>
                      <textarea
                        id="text-brief-ui"
                        value={textBrief}
                        onChange={(e) => setTextBrief(e.target.value)}
                        disabled={isAnalyzing}
                        rows={10}
                        placeholder="Example: Scientific brutalism marketing site for a genomics lab. Hero with image upload zone, acid lime (#CCFF00) and electric cyan accents, 2px black borders, ultra-rounded cards (≈3rem), Space Grotesk headings all-caps font-black, buttons with hard offset shadows that flatten on click…"
                        className="flex-1 w-full min-h-[200px] resize-y rounded-2xl border-2 border-black p-4 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00] focus-visible:ring-offset-2 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={isAnalyzing}
                        onClick={() => void analyzeStyleFromTextBrief()}
                        className="mt-4 w-full sm:w-auto self-center px-10 py-4 bg-[#ccff00] border-2 border-black rounded-full font-black text-xs uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <Sparkles size={18} aria-hidden />}
                        Generate style from text
                      </button>
                      {isAnalyzing ? (
                        <div className="absolute inset-0 rounded-3xl bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center">
                          <Loader2 className="animate-spin mb-3" size={40} aria-hidden />
                          <p className="text-sm font-black uppercase tracking-tight">Building UI system from your brief…</p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {analysisError ? (
                    <p className="text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-2xl px-4 py-3" role="alert">
                      {analysisError}
                    </p>
                  ) : null}
                </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : activeTab === 'analyze' && colorCardSession && !analysisResult ? (
          <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-12 pb-28">
            {!colorCardRefinementCommitted && selectedImage && /^data:image\//.test(selectedImage) ? (
              <div className="w-full relative">
                {analysisError ? (
                  <p className="text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-2xl px-4 py-3 mb-4" role="alert">
                    {analysisError}
                  </p>
                ) : null}
                <PaletteRefinementWorkspace
                  imageSrc={selectedImage}
                  initialSwatches={colorCardSession.colors}
                  deepseekApiKey={deepseekApiKey || null}
                  deepseekBaseUrl={deepseekColorCardBaseUrl}
                  deepseekModel={deepseekModel}
                  onBack={returnToExtractionWorkspace}
                  onFinalize={async (card) => {
                    setColorCardSession(card);
                    setColorCardRefinementCommitted(true);
                    setAnalysisError(null);
                    if (!user || !supabase) return;
                    setSavingStyle(true);
                    try {
                      if (vaultSavedId) {
                        const { error } = await updateColorCardVaultRow(vaultSavedId, card);
                        if (error) {
                          setAnalysisError(error.message || 'Could not update vault.');
                        } else {
                          await refreshStyles();
                          setVaultNotice({
                            kind: 'vault',
                            text: 'Palette finalized — Vault updated. Download or publish below.',
                          });
                        }
                      } else {
                        const { id, error: vaultErr } = await persistColorCardVaultRow(selectedImage, card);
                        if (vaultErr) {
                          setAnalysisError(vaultErr.message || 'Could not save to vault.');
                        } else if (id) {
                          setVaultSavedId(id);
                          await refreshStyles();
                          setVaultNotice({
                            kind: 'vault',
                            text: 'Color card saved to your Vault.',
                          });
                        }
                      }
                    } finally {
                      setSavingStyle(false);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="max-w-xl mx-auto w-full relative">
                {isAnalyzing ? (
                  <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-3xl">
                    <Loader2 className="animate-spin" size={44} aria-hidden />
                    <p className="text-sm font-black uppercase tracking-tight text-center px-6">Running UI/UX design…</p>
                  </div>
                ) : null}
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400 mb-4">Your color card</p>
                <div className="flex flex-nowrap items-center gap-2 mb-6 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 scroll-smooth">
                  <button
                    type="button"
                    onClick={returnToExtractionWorkspace}
                    disabled={savingStyle}
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
                  >
                    <ArrowLeft size={16} aria-hidden />
                    New extraction
                  </button>
                  {selectedImage && /^data:image\//.test(selectedImage) ? (
                    <button
                      type="button"
                      onClick={() => setColorCardRefinementCommitted(false)}
                      disabled={savingStyle || isAnalyzing}
                      className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 bg-neutral-100 border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-neutral-200/80 transition-all disabled:opacity-40"
                    >
                      Adjust palette
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={colorCardDownloadBusy}
                    onClick={() => downloadColorCardPng(selectedImage, colorCardSession)}
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    <Download size={16} aria-hidden />
                    Download PNG
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing || !deepseekApiKey}
                    onClick={() => void analyzeStyle()}
                    title={!deepseekApiKey ? 'Add VITE_DEEPSEEK_API_KEY for UI/UX design' : undefined}
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 bg-[#ccff00] border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
                  >
                    <Sparkles size={16} aria-hidden />
                    UI/UX design
                  </button>
                </div>
                {!deepseekApiKey ? (
                  <p className="text-xs font-bold text-amber-950 bg-amber-50 border-2 border-amber-600 rounded-xl px-3 py-2 mb-4">
                    Add VITE_DEEPSEEK_API_KEY to unlock the full UI/UX style preview from this photo.
                  </p>
                ) : null}
                {analysisError ? (
                  <p className="text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-2xl px-4 py-3 mb-4" role="alert">
                    {analysisError}
                  </p>
                ) : null}
                <ColorCardLayout
                  imageSrc={selectedImage}
                  colors={colorCardSession.colors}
                  swatchOnClick={(c) => {
                    const block = `HEX ${c.hex}\n${formatRgbLine(c.rgb[0], c.rgb[1], c.rgb[2])}\n${formatCmykLine(c.cmyk)}`;
                    copyToClipboard(block, `cc-${c.hex}`);
                    setCopiedSwatchHex(c.hex);
                    setTimeout(() => setCopiedSwatchHex(null), 2000);
                  }}
                  copiedHex={copiedSwatchHex}
                />
                {colorCardSession.overview ? (
                  <p className="mt-5 text-sm md:text-[15px] font-medium text-neutral-700 leading-relaxed text-center px-2 max-w-lg mx-auto">
                    {colorCardSession.overview}
                  </p>
                ) : null}
                <p className="text-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-3">
                  Tap a swatch to copy HEX · RGB · CMYK
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  {user && supabaseConfigured && vaultSavedId ? (
                    <p className="text-[10px] font-black uppercase text-green-900 border-2 border-green-700 bg-green-50 rounded-2xl py-3 px-4 text-center">
                      Saved to your Vault. Publish to Community when you want it public.
                    </p>
                  ) : null}
                  {user ? (
                    <button
                      type="button"
                      disabled={!supabaseConfigured || savingStyle || !vaultSavedId}
                      onClick={publishVaultEntryToCommunity}
                      className="w-full bg-[#ccff00] border-2 border-black py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 disabled:shadow-none inline-flex items-center justify-center gap-2"
                    >
                      {savingStyle ? <Loader2 className="animate-spin" size={18} aria-hidden /> : null}
                      Publish color card to community
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-12">
            {activeTab === 'about' ? (
              <AboutUsPage />
            ) : (
              <>
            {activeTab === 'analyze' && analysisResult && (
              <div className="max-w-7xl mx-auto flex flex-col items-center">
              <div className="w-full animate-in fade-in slide-in-from-bottom-12 duration-700">
                <div className="mb-8 w-full flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={returnToExtractionWorkspace}
                    disabled={savingStyle}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-black rounded-full font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Return to extraction workspace for a new extraction"
                  >
                    <ArrowLeft size={18} aria-hidden />
                    New extraction
                  </button>
                  <button
                    type="button"
                    onClick={() => analysisResult && setStylePreviewContext({ analysis: analysisResult })}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#ccff00] border-2 border-black rounded-full font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                    aria-label="Open UI style preview"
                  >
                    <Maximize2 size={16} aria-hidden />
                    UI/UX design preview
                  </button>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest max-w-md">
                    {extractionSource === 'text'
                      ? 'Start a new extraction to replace this text-generated style (vault draft removed if saved).'
                      : 'Upload a new reference; removes this draft from the vault if it was auto-saved.'}
                  </span>
                </div>
                {analysisError && (
                  <p
                    className="mb-8 w-full text-sm font-bold text-red-600 border-2 border-red-500 bg-red-50 rounded-2xl px-4 py-3"
                    role="alert"
                  >
                    {analysisError}
                  </p>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-8">
                    <div className="border-2 border-black rounded-[2.5rem] overflow-hidden shadow-2xl bg-white p-3">
                      {extractionSource === 'text' ? (
                        <div className="w-full aspect-[4/5] rounded-[2rem] bg-neutral-100 border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-4 p-8 text-center">
                          <Sparkles className="text-[#00c2d6]" size={40} strokeWidth={2} aria-hidden />
                          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Text brief</p>
                          <p className="text-sm font-bold text-neutral-800 leading-snug max-w-xs">
                            Style system generated from your description — open Style preview for the interactive kit.
                          </p>
                        </div>
                      ) : (
                        <img src={selectedImage} className="w-full aspect-[4/5] object-cover rounded-[2rem]" alt="Analysis reference" />
                      )}
                    </div>
                    <div className="flex gap-3 p-3 bg-white border-2 border-black rounded-[2rem] flex-wrap justify-center sm:justify-start">
                      {(analysisResult.palette || []).map((c, i) => {
                        const raw = typeof c === 'string' ? c : c?.hex;
                        if (!raw) return null;
                        const hex = String(raw).trim().startsWith('#')
                          ? String(raw).trim().toUpperCase()
                          : `#${String(raw).trim().replace(/^#/, '')}`.toUpperCase();
                        const copyKey = `pal-${i}-${hex}`;
                        return (
                          <button
                            key={copyKey}
                            type="button"
                            onClick={() => copyToClipboard(hex, copyKey)}
                            title={`Copy ${hex}`}
                            className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-1 min-w-[3.75rem] hover:bg-[#ccff00]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
                          >
                            <span
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                              style={{ backgroundColor: hex }}
                              aria-hidden
                            />
                            <span className="font-mono text-[9px] font-black tracking-tight text-center leading-none flex items-center justify-center gap-0.5">
                              {hex}
                              {copyStatus === copyKey ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" aria-hidden />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-12">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-[#00c2d6]">Visual Identification</h2>
                      <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-6 italic">{analysisResult.aesthetic}</h3>
                      <div className="flex flex-col gap-4 items-stretch">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="px-4 py-2 bg-[#ccff00] border border-black rounded-full text-[10px] font-black uppercase tracking-widest max-w-full">
                          {analysisResult.typography}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                          DeepSeek · color sample
                        </div>
                      </div>
                      {analysisResult.fonts && typeof analysisResult.fonts === 'object' && (
                        <div className="border-2 border-black rounded-2xl p-4 bg-white/90 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Font directions</p>
                          {['heading', 'body', 'accent'].map((key) =>
                            analysisResult.fonts[key] ? (
                              <p key={key} className="text-xs font-bold leading-snug">
                                <span className="uppercase text-neutral-500">{key}: </span>
                                {String(analysisResult.fonts[key])}
                              </p>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b-2 border-black pb-4">
                        <span className="font-black uppercase tracking-tighter text-2xl">Replication Prompt</span>
                        <button type="button" onClick={() => copyToClipboard(analysisResult.prompt, 'p1')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                          {copyStatus === 'p1' ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                      </div>
                      <p className="text-xl font-medium leading-relaxed italic text-neutral-800">"{analysisResult.prompt}"</p>
                    </div>

                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-t-2 border-black pt-6">
                      Overview, tags, interactive UI kit, typography, palette, and code live in Style preview (opens after each extraction).
                    </p>

                    <div className="flex flex-col gap-2 pt-4">
                      {user && supabaseConfigured && vaultSavedId && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-800 text-center border-2 border-green-700 bg-green-50 rounded-2xl py-3 px-4">
                          Auto-saved to your vault (private). Community does not see this until you publish.
                        </p>
                      )}
                      {user && supabaseConfigured && !vaultSavedId && savingStyle && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 text-center flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin shrink-0" size={16} aria-hidden />
                          Saving to your vault…
                        </p>
                      )}
                      {!user && authReady && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-center">
                          <button
                            type="button"
                            onClick={() => setAuthModalOpen(true)}
                            className="underline decoration-2 underline-offset-4 hover:text-black"
                          >
                            Sign in
                          </button>{' '}
                          to save extractions to your vault automatically (same flow after each extraction). Publish to
                          Community only when you want it public.
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {user ? (
                          <button
                            type="button"
                            disabled={!supabaseConfigured || savingStyle || !vaultSavedId}
                            onClick={publishVaultEntryToCommunity}
                            aria-label="Publish this extraction to the community feed"
                            title={
                              !vaultSavedId && supabaseConfigured
                                ? 'Wait for vault save to finish'
                                : !supabaseConfigured
                                  ? 'Configure Supabase to save and publish'
                                  : undefined
                            }
                            className="flex-1 bg-[#ccff00] border-2 border-black py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-40 disabled:shadow-none inline-flex items-center justify-center gap-2"
                          >
                            {savingStyle ? <Loader2 className="animate-spin" size={18} /> : null}
                            Publish to community
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={returnToExtractionWorkspace}
                          disabled={savingStyle}
                          className="px-8 border-2 border-black rounded-[2rem] hover:bg-neutral-100 transition-colors shrink-0 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Discard extraction and remove from vault if saved"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}

        {activeTab === 'library' && (
          <div className="max-w-7xl mx-auto">
            {vaultNotice && (
              <div
                className={`mb-6 rounded-2xl border-2 px-4 py-3 text-sm font-bold ${
                  vaultNotice.kind === 'vault'
                    ? 'border-green-700 bg-green-50 text-green-900'
                    : vaultNotice.kind === 'warn'
                      ? 'border-amber-600 bg-amber-50 text-amber-950'
                      : 'border-[#00c2d6] bg-cyan-50 text-cyan-950'
                }`}
                role="status"
              >
                {vaultNotice.text}
              </div>
            )}
            <div className="mb-12 border-b-2 border-black pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-6xl font-black uppercase tracking-tighter">Vault</h1>
                <p className="font-bold text-neutral-500 mt-2 uppercase tracking-widest text-xs">
                  COLOR PALETTES ONLY · PRIVATE
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="text"
                    placeholder="SEARCH DATABASE"
                    className="w-full pl-12 pr-6 py-3 border-2 border-black rounded-full font-black text-xs uppercase focus:outline-none focus:bg-[#ccff00]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {vaultColorPaletteItems.map((item) => (
                <StyleCard
                  key={item.id}
                  item={item}
                  onCopy={() => copyToClipboard(mergedStylePrompt(item) || item.prompt, item.id)}
                  copyStatus={copyStatus}
                  onOpenDetail={() =>
                    setStylePreviewContext({ analysis: styleItemToAnalysisResult(item), item })
                  }
                  onDelete={() => deleteVaultStyle(item.id)}
                  deletingVaultId={deletingVaultId}
                  publicPaletteHexCopyKey={publicPaletteHexCopyKey}
                  onCopyPaletteHex={(hex, key) => {
                    copyToClipboard(hex, `palette-hex-${item.id}`);
                    setPublicPaletteHexCopyKey(key);
                    setTimeout(() => setPublicPaletteHexCopyKey((k) => (k === key ? null : k)), 2000);
                  }}
                />
              ))}
              {vaultColorPaletteItems.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-black border-dashed rounded-[3rem] px-6">
                  {!user && authReady ? (
                    <>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-400 mb-2">Vault is locked</h3>
                      <p className="text-sm font-bold text-neutral-500 mb-6 max-w-md mx-auto">
                        Sign in to save color cards and see them here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(true)}
                        className="px-8 py-3 bg-[#ccff00] border-2 border-black rounded-full font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                      >
                        Sign in
                      </button>
                    </>
                  ) : user && personalLibrary.length > 0 ? (
                    <>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-500 mb-2">
                        No color cards in Vault
                      </h3>
                      <p className="text-sm font-bold text-neutral-500 max-w-md mx-auto">
                        This list only shows saved color palettes. Full UI/UX extractions are not listed here — create a
                        color card from Extract to see it in Vault.
                      </p>
                    </>
                  ) : (
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-300">No color cards saved yet</h3>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 pb-16">
            {vaultNotice && (
              <div
                className={`mb-5 rounded-2xl border-2 px-4 py-3 text-sm font-bold ${
                  vaultNotice.kind === 'vault'
                    ? 'border-green-700 bg-green-50 text-green-900'
                    : vaultNotice.kind === 'warn'
                      ? 'border-amber-600 bg-amber-50 text-amber-950'
                      : 'border-[#00c2d6] bg-cyan-50 text-cyan-950'
                }`}
                role="status"
              >
                {vaultNotice.text}
              </div>
            )}

            <h1 className="sr-only">Community — public color palettes</h1>

            <div ref={communitySearchWrapRef} className="relative w-full min-w-0 mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none z-[1]" size={20} />
              <input
                type="search"
                value={communitySearchQuery}
                onChange={(e) => setCommunitySearchQuery(e.target.value)}
                onFocus={() => setCommunitySearchGuideOpen(true)}
                placeholder="Search palettes, names, tags…"
                className="relative z-[1] w-full pl-12 pr-4 py-3.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white focus:border-neutral-300 transition-all"
                aria-label="Search community"
                aria-expanded={communitySearchGuideOpen}
                aria-controls="community-search-guide"
                autoComplete="off"
              />
              {communitySearchGuideOpen && (
                <CommunitySearchGuidePanel
                  sort={communitySort}
                  onSortChange={setCommunitySort}
                  onPickText={(text) => {
                    setCommunitySearchQuery((q) => appendCommunitySearchToken(q, text));
                  }}
                />
              )}
            </div>

            <div className="relative flex items-stretch border-b border-neutral-200 mb-6 sm:mb-8">
              <div
                ref={communityTagScrollRef}
                className="community-tag-scroll flex-1 min-w-0 flex gap-5 sm:gap-7 md:gap-9 overflow-x-auto pb-0 scroll-smooth"
              >
                {communityTagList.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      bumpCommunityTagClick(tag);
                      setCommunityTag(tag);
                    }}
                    className={`shrink-0 whitespace-nowrap pb-3 text-sm sm:text-[15px] font-semibold tracking-tight transition-colors border-b-[3px] -mb-px ${
                      communityTag === tag
                        ? 'text-black border-black'
                        : 'text-neutral-500 border-transparent hover:text-neutral-800'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="shrink-0 pl-2 pr-1 self-center text-neutral-500 hover:text-black mb-2"
                aria-label="Scroll tags right"
                onClick={() => communityTagScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
              >
                <ChevronRight size={22} strokeWidth={2} />
              </button>
            </div>

            {filteredExploreFeed.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 items-start">
                {filteredExploreFeed.map((item) => (
                  <CommunityCard
                    key={item.id}
                    item={item}
                    likedDailyPaletteIds={likedDailyPaletteIds}
                    onOpenDetail={() =>
                      setStylePreviewContext({ analysis: styleItemToAnalysisResult(item), item })
                    }
                    likedStyleIds={likedStyleIds}
                    communityLikeBusyId={communityLikeBusyId}
                    onToggleLike={() => void toggleCommunityLike(item.id)}
                    publicPaletteHexCopyKey={publicPaletteHexCopyKey}
                    onCopyPaletteHex={(hex, key) => {
                      copyToClipboard(hex, `palette-hex-${item.id}`);
                      setPublicPaletteHexCopyKey(key);
                      setTimeout(() => setPublicPaletteHexCopyKey((k) => (k === key ? null : k)), 2000);
                    }}
                    communityActiveTag={communityTag}
                    communitySearchQuery={communitySearchQuery}
                    onPickCommunityTag={handleCommunityPickTagFromCard}
                  />
                ))}
              </div>
            )}

            {filteredExploreFeed.length === 0 ? (
              <div
                className={
                  communitySearchQuery.trim() || (communityTag && communityTag !== 'All')
                    ? 'py-16 text-center border border-neutral-200 rounded-2xl px-6 bg-white'
                    : 'py-20 text-center border-2 border-dashed border-neutral-300 rounded-3xl px-6 bg-neutral-50/50'
                }
              >
                {communitySearchQuery.trim() || (communityTag && communityTag !== 'All') ? (
                  <>
                    <p className="text-base font-bold text-neutral-600 mb-2">No color palettes match your filters</p>
                    <p className="text-sm text-neutral-500 mb-4">Try another tag or clear search.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCommunityTag('All');
                        setCommunitySearchQuery('');
                        setCommunitySort('trending');
                        setCommunitySearchGuideOpen(false);
                      }}
                      className="text-sm font-black uppercase tracking-widest underline decoration-2 underline-offset-4 hover:text-[#15803d]"
                    >
                      Reset filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-neutral-400 mb-2">
                      No public color cards yet
                    </h3>
                    <p className="text-sm font-bold text-neutral-500 max-w-md mx-auto">
                      Publish a color card from Extract to share it here.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="px-6 py-4 bg-black text-white flex flex-col md:flex-row justify-between items-center gap-4 z-50">
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
          <a href="#" className="hover:text-[#ccff00] transition-colors">
            Instagram
          </a>
          <a href="#" className="hover:text-[#ccff00] transition-colors">
            Rednote
          </a>
          <a href="#" className="hover:text-[#ccff00] transition-colors">
            WeChat
          </a>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-50">GENOM LABS © 2026 // AVANT-GUARD.OS</div>
      </footer>
    </div>
  );
};

const HeaderTab = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 md:px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-full ${
      active ? 'bg-[#ccff00] text-black border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'text-neutral-500 hover:text-black'
    }`}
  >
    {label}
  </button>
);

function extractionSnapshotObject(item) {
  const s = item?.extractionSnapshot;
  return s && typeof s === 'object' ? s : null;
}

function mergedStylePrompt(item) {
  const snap = extractionSnapshotObject(item);
  if (snap?.colorCard && snap.colorCardData?.overview) return snap.colorCardData.overview;
  return item?.prompt || snap?.prompt || '';
}

function CommunityCard({
  item,
  onOpenDetail,
  likedStyleIds,
  likedDailyPaletteIds,
  communityLikeBusyId,
  onToggleLike,
  publicPaletteHexCopyKey,
  onCopyPaletteHex,
  communityActiveTag = null,
  communitySearchQuery: communitySearchQueryProp = '',
  onPickCommunityTag = null,
}) {
  const cd = itemColorCardData(item);

  if (cd?.colors?.length) {
    const liked =
      Boolean(likedStyleIds?.has?.(item.id)) || Boolean(likedDailyPaletteIds?.has?.(item.id));
    const baseLikes = item.likeCount ?? 0;
    const likeCount =
      item.isDailyPalette && likedDailyPaletteIds?.has?.(item.id)
        ? baseLikes + 1
        : baseLikes;
    return (
      <article className="group relative min-w-0">
        <PublicColorPaletteCard
          colors={cd.colors}
          title={item.aesthetic || 'Color palette'}
          overview={cd.overview || null}
          showOverviewText={Boolean(cd.overview)}
          hexCopyScope={String(item.id)}
          copiedHexKey={publicPaletteHexCopyKey}
          onCopyHex={onCopyPaletteHex}
          likeCount={likeCount}
          liked={liked}
          likeBusy={communityLikeBusyId === item.id}
          onToggleLike={onToggleLike}
          onOpenDetail={onOpenDetail}
          showSocialRow
          keywords={item.keywords}
          activeKeywordTag={communityActiveTag}
          activeSearchQuery={communitySearchQueryProp}
          onPickTag={onPickCommunityTag}
        />
      </article>
    );
  }

  return (
    <article className="min-w-0">
      <div className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-visible">
        <div className="relative overflow-visible">
          <button
            type="button"
            onClick={() => onOpenDetail?.()}
            aria-label={item.aesthetic ? `Open details: ${item.aesthetic}` : 'Open style details'}
            className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
          >
            <div className="relative w-full aspect-[3/4] max-h-[min(72vh,520px)] mx-auto overflow-hidden bg-neutral-100 rounded-t-xl sm:rounded-t-2xl">
              <StyleUiPreviewCard
                item={item}
                className="absolute inset-0 w-full h-full"
                scale={0.41}
                imgClassName="w-full h-full object-cover"
              />
            </div>
          </button>
          <div className="absolute bottom-2 right-2 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenDetail?.();
              }}
              className="w-9 h-9 rounded-full bg-white/95 border border-black/10 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-[#ccff00]/90 transition-colors"
              title="Preview"
              aria-label="Open preview"
            >
              <Maximize2 size={18} className="text-neutral-700" />
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-3.5 bg-white border-t border-neutral-100 rounded-b-xl sm:rounded-b-2xl">
          <p className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{item.aesthetic || 'Untitled style'}</p>
          {(item.keywords && item.keywords.length > 0) || item.typography ? (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-1 font-medium">
              {(item.keywords || []).slice(0, 3).join(' · ') || item.typography}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const StyleCard = ({
  item,
  onCopy,
  copyStatus,
  onOpenDetail,
  onDelete,
  deletingVaultId,
  publicPaletteHexCopyKey,
  onCopyPaletteHex,
}) => {
  const cd = itemColorCardData(item);
  if (cd?.colors?.length) {
    return (
      <div className="group relative">
        <PublicColorPaletteCard
          colors={cd.colors}
          title={item.aesthetic || 'Untitled palette'}
          overview={cd.overview || null}
          hexCopyScope={String(item.id)}
          copiedHexKey={publicPaletteHexCopyKey}
          onCopyHex={onCopyPaletteHex}
          showSocialRow={false}
          vaultActions={{
            onCopyOverview: onCopy,
            overviewCopied: copyStatus === item.id,
            onOpenDetail,
            onDelete,
            deleteBusy: deletingVaultId === item.id,
          }}
        />
      </div>
    );
  }
  return (
    <div className="group relative">
      <div className="border-2 border-black rounded-[2.5rem] overflow-hidden bg-white p-3 transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(204,255,0,1)]">
        <div className="aspect-[4/5] relative rounded-[2rem] overflow-hidden border border-black/5 bg-neutral-100">
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              disabled={deletingVaultId === item.id}
              className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors disabled:opacity-40"
              aria-label="Delete from vault"
              title="Delete"
            >
              {deletingVaultId === item.id ? (
                <Loader2 className="animate-spin w-4 h-4" aria-hidden />
              ) : (
                <Trash2 size={18} />
              )}
            </button>
          ) : null}
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
            <StyleUiPreviewCard
              item={item}
              className="absolute inset-0 w-full h-full"
              scale={0.36}
              imgClassName="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-x-4 bottom-4 z-20 flex gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="flex-1 bg-white border border-black py-3 rounded-full font-black text-[10px] uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 active:shadow-none active:translate-y-1 active:translate-x-1 transition-all"
            >
              {copyStatus === item.id ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
              {copyStatus === item.id ? 'Copied' : 'Prompt'}
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail?.()}
              aria-label="Open details"
              className="w-12 h-11 bg-[#ccff00] border border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8e600] transition-colors"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="pt-6 px-2 pb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase text-[#00c2d6] tracking-widest">{item.aesthetic}</span>
          <div className="flex gap-1">
            {item.palette?.slice(0, 3).map((c, i) => {
              const hex = typeof c === 'string' ? c : c?.hex;
              if (!hex) return null;
              return (
                <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: hex }} />
              );
            })}
          </div>
        </div>
        <p className="text-[11px] font-bold leading-tight line-clamp-2 uppercase italic text-neutral-600">
          &quot;{item.prompt}&quot;
        </p>
      </div>
    </div>
  );
};

export default App;
