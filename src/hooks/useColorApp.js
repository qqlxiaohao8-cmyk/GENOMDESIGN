import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { compressImageDataUrl, uploadStyleImageFromDataUrl } from '../lib/styleImageUpload';
import { renderSekongPalettePngBlob } from '../lib/renderSekongPalettePng';
import {
  itemColorCardData,
  isCommunityPaletteCardItem,
  COMMUNITY_PALETTE_MIN_SWATCHES,
} from '../components/StyleUiPreviewCard';

const COMMUNITY_TAG_CLICKS_KEY = 'genom-community-tag-clicks';

function mapStyleRow(row) {
  return {
    id: row.id,
    ownerUserId: row.user_id ?? null,
    imageUrl: row.image_url,
    aesthetic: row.aesthetic,
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

function buildColorCardSnapshot(card, displayTitle) {
  const title =
    displayTitle?.trim() ||
    card.colors[0]?.name ||
    'Color card';
  return {
    colorCard: true,
    colorCardData: { overview: card.overview, colors: card.colors },
    aesthetic: title.slice(0, 120),
    keywords: ['color-extract', 'palette'],
    prompt: card.overview,
  };
}

export function displayUserName(user) {
  if (!user) return '';
  const m = user.user_metadata || {};
  if (m.username) return m.username;
  const combined = [m.first_name, m.last_name]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
  if (combined) return combined;
  if (m.full_name) return m.full_name.trim();
  if (m.name) return m.name.trim();
  if (user.email) return user.email.split('@')[0];
  return '';
}

export default function useColorApp() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const [personalLibrary, setPersonalLibrary] = useState([]);
  const [exploreFeed, setExploreFeed] = useState([]);
  const [likedStyleIds, setLikedStyleIds] = useState(() => new Set());
  const [communityLikeBusyId, setCommunityLikeBusyId] = useState(null);

  // Flow stack for full-screen creation flows
  const [flowStack, setFlowStack] = useState([]);

  const user = session?.user ?? null;

  // ── Auth ──────────────────────────────────────────────────────────────
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────
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
    else setExploreFeed([]);

    if (!user?.id) {
      setPersonalLibrary([]);
      return;
    }
    const libRes = await supabase
      .from('styles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!libRes.error && libRes.data) setPersonalLibrary(libRes.data.map(mapStyleRow));
    else setPersonalLibrary([]);
  }, [user?.id]);

  const refreshMyStyleLikes = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLikedStyleIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from('style_likes')
      .select('style_id')
      .eq('user_id', user.id);
    if (error) return;
    setLikedStyleIds(new Set((data || []).map((r) => r.style_id)));
  }, [user?.id]);

  useEffect(() => {
    refreshStyles();
  }, [refreshStyles]);

  useEffect(() => {
    refreshMyStyleLikes();
  }, [refreshMyStyleLikes]);

  // ── Derived data ──────────────────────────────────────────────────────
  const colorPaletteExploreFeed = useMemo(
    () => exploreFeed.filter((item) => isCommunityPaletteCardItem(item)),
    [exploreFeed]
  );

  const vaultColorPaletteItems = useMemo(
    () => personalLibrary.filter((item) => Boolean(itemColorCardData(item)?.colors?.length)),
    [personalLibrary]
  );

  // ── Toggle like ───────────────────────────────────────────────────────
  const toggleCommunityLike = useCallback(
    async (itemId) => {
      if (!supabase || !user?.id || communityLikeBusyId) return;
      setCommunityLikeBusyId(itemId);
      const wasLiked = likedStyleIds.has(itemId);
      if (wasLiked) {
        await supabase
          .from('style_likes')
          .delete()
          .eq('style_id', itemId)
          .eq('user_id', user.id);
        setLikedStyleIds((prev) => {
          const n = new Set(prev);
          n.delete(itemId);
          return n;
        });
        setExploreFeed((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, likeCount: Math.max(0, (it.likeCount ?? 0) - 1) } : it
          )
        );
      } else {
        await supabase.from('style_likes').insert({ style_id: itemId, user_id: user.id });
        setLikedStyleIds((prev) => new Set([...prev, itemId]));
        setExploreFeed((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, likeCount: (it.likeCount ?? 0) + 1 } : it
          )
        );
      }
      setCommunityLikeBusyId(null);
    },
    [supabase, user?.id, likedStyleIds, communityLikeBusyId]
  );

  // ── Save to vault ─────────────────────────────────────────────────────
  const persistColorCardVaultRow = useCallback(
    async (imageSrc, card, opts = {}) => {
      if (!user || !supabase) {
        return { id: null, error: new Error('请先登录并配置 Supabase。') };
      }
      if (!card?.colors?.length || !imageSrc) {
        return { id: null, error: new Error('缺少色卡数据。') };
      }
      const displayTitle = opts?.paletteDisplayTitle?.trim() || null;
      let imageUrl = imageSrc;
      if (/^data:image\//.test(imageSrc)) {
        const { publicUrl, error: upErr } = await uploadStyleImageFromDataUrl(
          supabase, user.id, imageSrc
        );
        if (publicUrl) {
          imageUrl = publicUrl;
        } else {
          console.warn('style-images upload failed:', upErr);
          try {
            imageUrl = await compressImageDataUrl(imageSrc, 1200, 0.82);
            if (imageUrl.length > 1_200_000)
              imageUrl = await compressImageDataUrl(imageSrc, 800, 0.78);
          } catch (e) {
            return { id: null, error: new Error(e.message || '图片处理失败。') };
          }
        }
      }
      const hexes = card.colors.map((c) => c.hex);
      const snapshot = buildColorCardSnapshot(card, displayTitle);
      let extraction_snapshot;
      try { extraction_snapshot = JSON.parse(JSON.stringify(snapshot)); } catch { extraction_snapshot = null; }
      const row = {
        user_id: user.id,
        is_public: false,
        image_url: imageUrl,
        aesthetic: (displayTitle || card.colors[0]?.name || 'Color card').slice(0, 120),
        typography: null,
        fonts: null,
        palette: hexes,
        design_logic: card.overview,
        keywords: snapshot.keywords,
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
      if (error) return { id: null, error: new Error(error.message || '保存失败。') };
      await refreshStyles();
      return { id: data?.id ?? null, error: null };
    },
    [user, refreshStyles]
  );

  // ── Delete from vault ─────────────────────────────────────────────────
  const deleteVaultItem = useCallback(
    async (itemId) => {
      if (!user || !supabase || !itemId) return { error: new Error('无法删除。') };
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);
      if (!error) await refreshStyles();
      return { error: error || null };
    },
    [user, refreshStyles]
  );

  // ── Publish to 色海 ───────────────────────────────────────────────────
  const publishColorCard = useCallback(
    async ({ title, hexes, imageDataUrl, sourceType = 'own_shot' }) => {
      if (!user || !supabase) return { ok: false, error: '请先登录再发布。' };
      if (!Array.isArray(hexes) || hexes.length < 2 || !imageDataUrl) {
        return { ok: false, error: '缺少色卡数据或图片。' };
      }
      const card = {
        overview: title || '',
        colors: hexes.map((h) => ({ hex: h })),
      };
      const { id, error: saveErr } = await persistColorCardVaultRow(imageDataUrl, card, {
        paletteDisplayTitle: title,
      });
      if (saveErr || !id) return { ok: false, error: saveErr?.message || '保存失败。' };

      const snapshot = buildColorCardSnapshot(card, title);
      const snapshotWithMeta = {
        ...snapshot,
        sourceType,
        publishedAt: new Date().toISOString(),
      };
      let extraction_snapshot;
      try { extraction_snapshot = JSON.parse(JSON.stringify(snapshotWithMeta)); } catch { extraction_snapshot = null; }

      const { error: pubErr } = await supabase
        .from('styles')
        .update({ is_public: true, extraction_snapshot })
        .eq('id', id)
        .eq('user_id', user.id);
      if (pubErr) return { ok: false, error: pubErr.message || '发布失败。' };
      await refreshStyles();
      return { ok: true, id };
    },
    [user, persistColorCardVaultRow, refreshStyles]
  );

  // ── PNG download ──────────────────────────────────────────────────────
  const downloadColorCardPng = useCallback(async (colors, title) => {
    if (!colors?.length) return;
    try {
      const blob = await renderSekongPalettePngBlob({ title: title || '色盘', colors });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'genom-color-palette.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ── Share link ────────────────────────────────────────────────────────
  const copyShareLink = useCallback((itemId) => {
    const url = `${window.location.origin}${window.location.pathname}?style=${itemId}`;
    try {
      navigator.clipboard.writeText(url).catch(() => {
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    } catch {
      /* ignore */
    }
  }, []);

  // ── Flow stack ────────────────────────────────────────────────────────
  const pushFlow = useCallback((flow) => {
    setFlowStack((prev) => [...prev, flow]);
  }, []);

  const popFlow = useCallback(() => {
    setFlowStack((prev) => prev.slice(0, -1));
  }, []);

  const clearFlows = useCallback(() => {
    setFlowStack([]);
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setPersonalLibrary([]);
    setLikedStyleIds(new Set());
  }, []);

  // ── Tag click tracking ────────────────────────────────────────────────
  const [tagClickEpoch, setTagClickEpoch] = useState(0);
  const bumpTagClick = useCallback((tag) => {
    if (!tag || tag === 'All') return;
    try {
      const raw = window.localStorage.getItem(COMMUNITY_TAG_CLICKS_KEY);
      const o = raw ? JSON.parse(raw) : {};
      const cur = o && typeof o === 'object' ? { ...o } : {};
      cur[String(tag)] = (Number(cur[String(tag)]) || 0) + 1;
      window.localStorage.setItem(COMMUNITY_TAG_CLICKS_KEY, JSON.stringify(cur));
    } catch { /* ignore */ }
    setTagClickEpoch((n) => n + 1);
  }, []);

  const communityTagList = useMemo(() => {
    const stats = new Map();
    colorPaletteExploreFeed.forEach((item) => {
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
    });
    let tagClicks = {};
    try {
      const raw = window.localStorage.getItem(COMMUNITY_TAG_CLICKS_KEY);
      const o = raw ? JSON.parse(raw) : {};
      if (o && typeof o === 'object') tagClicks = o;
    } catch { /* ignore */ }
    const ranked = Array.from(stats.entries()).sort((a, b) => {
      const ca = Number(tagClicks[a[0]]) || 0;
      const cb = Number(tagClicks[b[0]]) || 0;
      if (cb !== ca) return cb - ca;
      const [, sa] = a; const [, sb] = b;
      if (sb.likesSum !== sa.likesSum) return sb.likesSum - sa.likesSum;
      return sb.count - sa.count;
    });
    return ['All', ...ranked.map(([tag]) => tag)];
  }, [colorPaletteExploreFeed, tagClickEpoch]);

  return {
    // Auth
    session, user, authReady, recoveryMode,
    setRecoveryMode,
    signOut,
    // Data
    personalLibrary, exploreFeed, colorPaletteExploreFeed, vaultColorPaletteItems,
    likedStyleIds, communityLikeBusyId,
    refreshStyles,
    communityTagList, bumpTagClick,
    // Actions
    toggleCommunityLike,
    persistColorCardVaultRow,
    deleteVaultItem,
    publishColorCard,
    downloadColorCardPng,
    copyShareLink,
    // Flow
    flowStack, pushFlow, popFlow, clearFlows,
    // Supabase ref (for AuthModal etc.)
    supabase,
    supabaseConfigured,
  };
}
