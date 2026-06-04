import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { compressImageDataUrl, uploadStyleImageFromDataUrl } from '../lib/styleImageUpload';
import { renderSekongPalettePngBlob } from '../lib/renderSekongPalettePng';
import {
  itemColorCardData,
  isCommunityPaletteCardItem,
  COMMUNITY_PALETTE_MIN_SWATCHES,
} from '../components/StyleUiPreviewCard';
import { isDisplayableSeaTag } from '../lib/colorSeaTags';
import {
  challengeDateKey,
  fetchMySubmissionForChallengeDate,
  insertDailyPaletteSubmission,
  runPendingDailyTallies,
} from '../lib/dailyOneColorApi';
import { DAILY_WINNER_TAG } from '../lib/dailyOneColorConstants';

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

function buildColorCardSnapshot(card, displayTitle, extraKeywords = [], snapshotOpts = {}) {
  const title =
    displayTitle?.trim() ||
    card.colors[0]?.name ||
    'Color card';
  const snap = {
    colorCard: true,
    colorCardData: { overview: card.overview, colors: card.colors },
    aesthetic: title.slice(0, 120),
    keywords: ['color-extract', 'palette', ...(Array.isArray(extraKeywords) ? extraKeywords : [])],
    prompt: card.overview,
  };
  if (snapshotOpts.sourceStyleId) {
    snap.sourceStyleId = snapshotOpts.sourceStyleId;
    snap.favoritedFrom = snapshotOpts.sourceStyleId;
  }
  return snap;
}

function vaultItemForSourceStyle(vaultItems, sourceStyleId) {
  if (!sourceStyleId) return null;
  return (
    vaultItems.find((item) => {
      const snap = item.extractionSnapshot;
      const sid = snap?.sourceStyleId ?? snap?.favoritedFrom;
      return sid === sourceStyleId;
    }) ?? null
  );
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
  const [vaultFavoriteBusyId, setVaultFavoriteBusyId] = useState(null);

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
    if (!supabase) return undefined;
    let cancelled = false;
    (async () => {
      await runPendingDailyTallies(supabase);
      if (!cancelled) await refreshStyles();
    })();
    return () => { cancelled = true; };
  }, [supabase, refreshStyles]);

  useEffect(() => {
    refreshMyStyleLikes();
  }, [refreshMyStyleLikes]);

  // ── Derived data ──────────────────────────────────────────────────────
  const colorPaletteExploreFeed = useMemo(
    () => exploreFeed.filter((item) => isCommunityPaletteCardItem(item)),
    [exploreFeed]
  );

  const vaultColorPaletteItems = useMemo(
    () =>
      personalLibrary.filter((item) => {
        if (item.extractionSnapshot?.hiddenFromVault) return false;
        return Boolean(itemColorCardData(item)?.colors?.length);
      }),
    [personalLibrary]
  );

  const favoritedExploreStyleIds = useMemo(() => {
    const ids = new Set();
    vaultColorPaletteItems.forEach((item) => {
      const sid = item.extractionSnapshot?.sourceStyleId ?? item.extractionSnapshot?.favoritedFrom;
      if (sid) ids.add(sid);
    });
    return ids;
  }, [vaultColorPaletteItems]);

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
      const snapshot = buildColorCardSnapshot(card, displayTitle, opts?.extraKeywords, {
        sourceStyleId: opts?.sourceStyleId || null,
      });
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

  // ── Delete private vault row (never use for public 色海 entries) ───────
  const deleteVaultItem = useCallback(
    async (itemId) => {
      if (!user || !supabase || !itemId) return { error: new Error('无法删除。') };
      const item = personalLibrary.find((i) => i.id === itemId);
      if (item?.isPublic) {
        return { error: new Error('已发布色卡请使用「取消收藏」从收藏页移除。') };
      }
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);
      if (!error) await refreshStyles();
      return { error: error || null };
    },
    [user, personalLibrary, refreshStyles]
  );

  /**
   * 收藏页「取消收藏」：仅从用户收藏列表移除，不删除色海公开记录。
   * - 私人副本（含从色海收藏的副本）：删除该行
   * - 已发布到色海的色卡：仅标记 hiddenFromVault，保留 is_public
   */
  const removeFromVault = useCallback(
    async (itemId) => {
      if (!user || !supabase || !itemId) return { error: new Error('无法移除。') };
      const item = personalLibrary.find((i) => i.id === itemId);
      if (!item) return { error: new Error('未找到色卡。') };

      if (item.isPublic) {
        const base =
          item.extractionSnapshot && typeof item.extractionSnapshot === 'object'
            ? item.extractionSnapshot
            : {};
        const extraction_snapshot = { ...base, hiddenFromVault: true };
        const { error } = await supabase
          .from('styles')
          .update({ extraction_snapshot })
          .eq('id', itemId)
          .eq('user_id', user.id);
        if (error && /extraction_snapshot|column/i.test(error.message || '')) {
          return { error: new Error(error.message || '移除失败。') };
        }
        if (!error) await refreshStyles();
        return { error: error || null };
      }

      return deleteVaultItem(itemId);
    },
    [user, supabase, personalLibrary, deleteVaultItem, refreshStyles]
  );

  // ── 色海 → 私人收藏库 ─────────────────────────────────────────────────
  const toggleVaultFavoriteFromExplore = useCallback(
    async (item) => {
      if (!user || !supabase || !item?.id || vaultFavoriteBusyId) return;
      const cd = itemColorCardData(item);
      if (!cd?.colors?.length) return;

      setVaultFavoriteBusyId(item.id);
      const existing = vaultItemForSourceStyle(vaultColorPaletteItems, item.id);
      try {
        if (existing) {
          await deleteVaultItem(existing.id);
        } else {
          const imageSrc =
            item.imageUrl ||
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
          const card = {
            overview: item.aesthetic || item.designLogic || '',
            colors: cd.colors,
          };
          await persistColorCardVaultRow(imageSrc, card, {
            paletteDisplayTitle: item.aesthetic,
            sourceStyleId: item.id,
            extraKeywords: item.keywords,
          });
        }
      } finally {
        setVaultFavoriteBusyId(null);
      }
    },
    [user, supabase, vaultFavoriteBusyId, vaultColorPaletteItems, deleteVaultItem, persistColorCardVaultRow]
  );

  // ── 投稿到每日一色（不公开到色海，进入当日投票池）────────────────────────
  const publishDailyPaletteCard = useCallback(
    async ({ title, hexes, imageDataUrl, tags = [], dailyAnchorHex }) => {
      if (!user || !supabase) return { ok: false, error: '请先登录再投稿。' };
      if (!Array.isArray(hexes) || hexes.length < 2) {
        return { ok: false, error: '缺少色卡数据。' };
      }
      const challengeDate = challengeDateKey();
      const { row: existing } = await fetchMySubmissionForChallengeDate(
        supabase,
        challengeDate,
        user.id,
      );
      if (existing) return { ok: false, error: '今日已投稿，明日可再挑战。' };

      let imageSrc = imageDataUrl;
      try {
        if (!imageSrc || !/^data:image\//.test(imageSrc)) {
          const blob = await renderSekongPalettePngBlob({
            title: title || '色卡',
            colors: hexes.map((h) => ({ hex: h })),
          });
          imageSrc = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        }
      } catch (e) {
        return { ok: false, error: e.message || '生成色卡图失败。' };
      }

      const card = {
        overview: title || '',
        colors: hexes.map((h) => ({ hex: h })),
      };
      const extraKeywords = [
        ...(Array.isArray(tags) ? tags : []),
        '每日一色投稿',
      ];
      const { id: styleId, error: saveErr } = await persistColorCardVaultRow(imageSrc, card, {
        paletteDisplayTitle: title,
        extraKeywords,
      });
      if (saveErr || !styleId) return { ok: false, error: saveErr?.message || '保存失败。' };

      const snapshot = {
        ...buildColorCardSnapshot(card, title, extraKeywords),
        dailyChallenge: true,
        challengeDate,
        dailyAnchorHex: dailyAnchorHex || hexes[0] || null,
      };
      let extraction_snapshot;
      try { extraction_snapshot = JSON.parse(JSON.stringify(snapshot)); } catch { extraction_snapshot = null; }
      if (extraction_snapshot) {
        await supabase
          .from('styles')
          .update({ extraction_snapshot })
          .eq('id', styleId)
          .eq('user_id', user.id);
      }

      const { data: styleRow } = await supabase
        .from('styles')
        .select('image_url')
        .eq('id', styleId)
        .maybeSingle();

      const { id: submissionId, error: subErr } = await insertDailyPaletteSubmission(supabase, {
        challengeDate,
        userId: user.id,
        styleId,
        title: title.trim(),
        palette: hexes,
        imageUrl: styleRow?.image_url || imageSrc,
        tags: extraKeywords,
        dailyAnchorHex: dailyAnchorHex || hexes[0] || null,
      });
      if (subErr) {
        const msg = subErr.message || '';
        if (/unique|one_per_user/i.test(msg)) {
          return { ok: false, error: '今日已投稿，明日可再挑战。' };
        }
        return { ok: false, error: msg || '投稿失败。' };
      }
      return { ok: true, id: submissionId, styleId };
    },
    [user, supabase, persistColorCardVaultRow],
  );

  // ── Publish to 色海 ───────────────────────────────────────────────────
  const publishColorCard = useCallback(
    async ({ title, hexes, imageDataUrl, sourceType = 'own_shot', tags = [] }) => {
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
        extraKeywords: Array.isArray(tags) ? tags : [],
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
        if (!s || seen.has(s) || !isDisplayableSeaTag(s)) return;
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
    const tags = ranked.map(([tag]) => tag);
    const hasWinnerTag = tags.includes(DAILY_WINNER_TAG)
      || colorPaletteExploreFeed.some((item) =>
        (item.keywords || []).includes(DAILY_WINNER_TAG),
      );
    if (hasWinnerTag && !tags.includes(DAILY_WINNER_TAG)) {
      tags.unshift(DAILY_WINNER_TAG);
    }
    return ['All', ...tags];
  }, [colorPaletteExploreFeed, tagClickEpoch]);

  return {
    // Auth
    session, user, authReady, recoveryMode,
    setRecoveryMode,
    signOut,
    // Data
    personalLibrary, exploreFeed, colorPaletteExploreFeed, vaultColorPaletteItems,
    likedStyleIds, communityLikeBusyId, favoritedExploreStyleIds, vaultFavoriteBusyId,
    refreshStyles,
    communityTagList, bumpTagClick,
    // Actions
    toggleCommunityLike,
    toggleVaultFavoriteFromExplore,
    persistColorCardVaultRow,
    deleteVaultItem,
    removeFromVault,
    publishColorCard,
    publishDailyPaletteCard,
    downloadColorCardPng,
    copyShareLink,
    // Flow
    flowStack, pushFlow, popFlow, clearFlows,
    // Supabase ref (for AuthModal etc.)
    supabase,
    supabaseConfigured,
  };
}
