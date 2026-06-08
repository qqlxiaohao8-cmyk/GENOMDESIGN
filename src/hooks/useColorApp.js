import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { authClient } from '../lib/authClient';
import { apiFetch, syncProfile } from '../lib/apiClient';
import { mapAuthUser, passwordResetTokenFromUrl } from '../lib/authUser';
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
} from '../lib/dailyOneColorApi';
import { DAILY_WINNER_TAG } from '../lib/dailyOneColorConstants';
import { uniquePoeticNamesForSwatches } from '../lib/poeticColorNaming';
import { generatePaletteTags } from '../lib/paletteTags';
import { normalizePublicPaletteTitle } from '../lib/palettePublicTitle';
import { clampPaletteTitle } from '../lib/palettePoeticTitle';

const COMMUNITY_TAG_CLICKS_KEY = 'genom-community-tag-clicks';

export { normalizePublicPaletteTitle } from '../lib/palettePublicTitle';

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
  const rawColors = (card.colors || []).map((c) => ({
    hex: c.hex,
    name: String(c.name || '').trim(),
  }));
  const poeticNames = uniquePoeticNamesForSwatches(rawColors);
  const colorsWithNames = rawColors.map((c, i) => ({
    hex: c.hex,
    name: c.name || poeticNames[i],
  }));
  const hexes = colorsWithNames.map((c) => c.hex);
  const paletteMeta = snapshotOpts.paletteMeta && typeof snapshotOpts.paletteMeta === 'object'
    ? snapshotOpts.paletteMeta
    : {};
  const engineTags = Array.isArray(snapshotOpts.engineTags) && snapshotOpts.engineTags.length
    ? snapshotOpts.engineTags
    : generatePaletteTags(hexes, paletteMeta);

  const title =
    displayTitle?.trim() ||
    colorsWithNames[0]?.name ||
    'Color card';
  const snap = {
    colorCard: true,
    colorCardData: { overview: card.overview, colors: colorsWithNames },
    aesthetic: title.slice(0, 120),
    keywords: ['color-extract', 'palette', ...(Array.isArray(extraKeywords) ? extraKeywords : [])],
    prompt: card.overview,
    paletteMeta,
    engineTags,
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

export { displayUserName } from '../lib/authUser';

export default function useColorApp() {
  const { data: authSession, isPending: authPending } = authClient.useSession();
  const [recoveryMode, setRecoveryMode] = useState(false);

  const [personalLibrary, setPersonalLibrary] = useState([]);
  const [exploreFeed, setExploreFeed] = useState([]);
  const [likedStyleIds, setLikedStyleIds] = useState(() => new Set());
  const [communityLikeBusyId, setCommunityLikeBusyId] = useState(null);
  const [vaultFavoriteBusyId, setVaultFavoriteBusyId] = useState(null);

  // Flow stack for full-screen creation flows
  const [flowStack, setFlowStack] = useState([]);

  const session = authSession ?? null;
  const user = useMemo(() => mapAuthUser(authSession?.user), [authSession?.user]);
  const authReady = !authPending;

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (passwordResetTokenFromUrl()) setRecoveryMode(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    syncProfile().catch(() => {});
  }, [user?.id]);

  const refreshStyles = useCallback(async () => {
    try {
      const pubRes = await apiFetch('/styles?scope=explore');
      setExploreFeed((pubRes.data || []).map(mapStyleRow));
    } catch {
      setExploreFeed([]);
    }

    if (!user?.id) {
      setPersonalLibrary([]);
      return;
    }
    try {
      const libRes = await apiFetch('/styles?scope=vault');
      setPersonalLibrary((libRes.data || []).map(mapStyleRow));
    } catch {
      setPersonalLibrary([]);
    }
  }, [user?.id]);

  const fetchStyleById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const res = await apiFetch(`/styles/${id}`);
      return res.data ? mapStyleRow(res.data) : null;
    } catch {
      return null;
    }
  }, []);

  const refreshMyStyleLikes = useCallback(async () => {
    if (!user?.id) {
      setLikedStyleIds(new Set());
      return;
    }
    try {
      const { data } = await apiFetch('/style-likes');
      setLikedStyleIds(new Set(data || []));
    } catch {
      setLikedStyleIds(new Set());
    }
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
      if (item.isPublic) ids.add(item.id);
      const sid = item.extractionSnapshot?.sourceStyleId ?? item.extractionSnapshot?.favoritedFrom;
      if (sid) ids.add(sid);
    });
    return ids;
  }, [vaultColorPaletteItems]);

  // ── Toggle like ───────────────────────────────────────────────────────
  const toggleCommunityLike = useCallback(
    async (itemId) => {
      if (!user?.id || communityLikeBusyId) return;
      setCommunityLikeBusyId(itemId);
      const wasLiked = likedStyleIds.has(itemId);
      try {
        if (wasLiked) {
          await apiFetch(`/styles/${itemId}/like`, { method: 'DELETE' });
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
          await apiFetch(`/styles/${itemId}/like`, { method: 'POST' });
          setLikedStyleIds((prev) => new Set([...prev, itemId]));
          setExploreFeed((prev) =>
            prev.map((it) =>
              it.id === itemId ? { ...it, likeCount: (it.likeCount ?? 0) + 1 } : it
            )
          );
        }
      } catch (e) {
        console.warn('like toggle failed', e);
      }
      setCommunityLikeBusyId(null);
    },
    [user?.id, likedStyleIds, communityLikeBusyId]
  );

  // ── Save to vault ─────────────────────────────────────────────────────
  const persistColorCardVaultRow = useCallback(
    async (imageSrc, card, opts = {}) => {
      if (!user) {
        return { id: null, error: new Error('请先登录。') };
      }
      if (!card?.colors?.length || !imageSrc) {
        return { id: null, error: new Error('缺少色卡数据。') };
      }
      const displayTitle = opts?.paletteDisplayTitle?.trim() || null;
      let imageUrl = imageSrc;
      if (/^data:image\//.test(imageSrc)) {
        const { publicUrl, error: upErr } = await uploadStyleImageFromDataUrl(
          null, user.id, imageSrc
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
        paletteMeta: opts?.paletteMeta,
        engineTags: opts?.engineTags,
      });
      let extraction_snapshot;
      try { extraction_snapshot = JSON.parse(JSON.stringify(snapshot)); } catch { extraction_snapshot = null; }
      try {
        const { id } = await apiFetch('/styles', {
          method: 'POST',
          body: {
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
          },
        });
        await refreshStyles();
        return { id: id ?? null, error: null };
      } catch (e) {
        return { id: null, error: new Error(e.message || '保存失败。') };
      }
    },
    [user, refreshStyles]
  );

  // ── Delete private vault row (never use for public 色海 entries) ───────
  const deleteVaultItem = useCallback(
    async (itemId) => {
      if (!user || !itemId) return { error: new Error('无法删除。') };
      const item = personalLibrary.find((i) => i.id === itemId);
      if (item?.isPublic) {
        return { error: new Error('已发布色卡请使用「取消收藏」从收藏页移除。') };
      }
      try {
        await apiFetch(`/styles/${itemId}`, { method: 'DELETE' });
        await refreshStyles();
        return { error: null };
      } catch (e) {
        return { error: e };
      }
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
      if (!user || !itemId) return { error: new Error('无法移除。') };
      const item = personalLibrary.find((i) => i.id === itemId);
      if (!item) return { error: new Error('未找到色卡。') };

      if (item.isPublic) {
        const base =
          item.extractionSnapshot && typeof item.extractionSnapshot === 'object'
            ? item.extractionSnapshot
            : {};
        const extraction_snapshot = { ...base, hiddenFromVault: true };
        try {
          await apiFetch(`/styles/${itemId}`, {
            method: 'PATCH',
            body: { extraction_snapshot },
          });
          await refreshStyles();
          return { error: null };
        } catch (e) {
          return { error: e };
        }
      }

      return deleteVaultItem(itemId);
    },
    [user, personalLibrary, deleteVaultItem, refreshStyles]
  );

  // ── 色海 → 私人收藏库 ─────────────────────────────────────────────────
  const toggleVaultFavoriteFromExplore = useCallback(
    async (item) => {
      if (!user || !item?.id || vaultFavoriteBusyId) return;
      const cd = itemColorCardData(item);
      if (!cd?.colors?.length) return;

      setVaultFavoriteBusyId(item.id);
      const ownedDirect = vaultColorPaletteItems.find((v) => v.id === item.id);
      const existingCopy = vaultItemForSourceStyle(vaultColorPaletteItems, item.id);
      try {
        if (ownedDirect) {
          await removeFromVault(item.id);
        } else if (existingCopy) {
          if (existingCopy.isPublic) {
            await removeFromVault(existingCopy.id);
          } else {
            await deleteVaultItem(existingCopy.id);
          }
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
    [user, vaultFavoriteBusyId, vaultColorPaletteItems, deleteVaultItem, persistColorCardVaultRow, removeFromVault]
  );

  // ── 投稿到每日一色（不公开到色海，进入当日投票池）────────────────────────
  const publishDailyPaletteCard = useCallback(
    async ({ title, hexes, imageDataUrl, tags = [], dailyAnchorHex, dailyDateKey }) => {
      if (!user) return { ok: false, error: '请先登录再投稿。' };
      if (!Array.isArray(hexes) || hexes.length < 2) {
        return { ok: false, error: '缺少色卡数据。' };
      }
      const challengeDate = challengeDateKey();
      if (dailyDateKey && dailyDateKey !== challengeDate) {
        return { ok: false, error: '挑战已过期，请返回重新开始。' };
      }
      const { row: existing } = await fetchMySubmissionForChallengeDate(
        null,
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

      const poeticNames = uniquePoeticNamesForSwatches(hexes.map((h) => ({ hex: h })));
      const card = {
        overview: title || '',
        colors: hexes.map((h, i) => ({ hex: h, name: poeticNames[i] })),
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
        await apiFetch(`/styles/${styleId}`, {
          method: 'PATCH',
          body: { extraction_snapshot },
        });
      }

      let imageUrlForSub = imageSrc;
      try {
        const vaultRes = await apiFetch('/styles?scope=vault');
        const styleRow = (vaultRes.data || []).find((r) => r.id === styleId);
        if (styleRow?.image_url) imageUrlForSub = styleRow.image_url;
      } catch { /* use imageSrc */ }

      const { id: submissionId, error: subErr } = await insertDailyPaletteSubmission(null, {
        challengeDate,
        userId: user.id,
        styleId,
        title: title.trim(),
        palette: hexes,
        imageUrl: imageUrlForSub,
        tags: extraKeywords,
        dailyAnchorHex: dailyAnchorHex || hexes[0] || null,
      });
      if (subErr) {
        const msg = subErr.message || '';
        if (/unique|one_per_user/i.test(msg)) {
          return { ok: false, error: '今日已投稿，明日可再挑战。' };
        }
        if (/challenge_closed/i.test(msg)) {
          return { ok: false, error: '挑战已过期，请返回重新开始。' };
        }
        return { ok: false, error: msg || '投稿失败。' };
      }
      return { ok: true, id: submissionId, styleId };
    },
    [user, persistColorCardVaultRow],
  );

  // ── Publish to 色海 ───────────────────────────────────────────────────
  const publishColorCard = useCallback(
    async ({ title, hexes, imageDataUrl, sourceType = 'own_shot', tags = [], paletteMeta = {} }) => {
      if (!user) return { ok: false, error: '请先登录再发布。' };
      if (!Array.isArray(hexes) || hexes.length < 2 || !imageDataUrl) {
        return { ok: false, error: '缺少色卡数据或图片。' };
      }
      const displayTitle = clampPaletteTitle(title);
      const normTitle = normalizePublicPaletteTitle(displayTitle);
      if (!normTitle) return { ok: false, error: '请先填写色卡名称。' };
      const duplicate = exploreFeed.some(
        (i) => i.isPublic && normalizePublicPaletteTitle(i.aesthetic) === normTitle,
      );
      if (duplicate) return { ok: false, error: 'duplicate_title' };

      const poeticNames = uniquePoeticNamesForSwatches(hexes.map((h) => ({ hex: h })));
      const card = {
        overview: displayTitle || '',
        colors: hexes.map((h, i) => ({ hex: h, name: poeticNames[i] })),
      };
      const engineTags = Array.isArray(tags) && tags.length
        ? tags
        : generatePaletteTags(hexes, paletteMeta);
      const { id, error: saveErr } = await persistColorCardVaultRow(imageDataUrl, card, {
        paletteDisplayTitle: displayTitle,
        extraKeywords: engineTags,
        paletteMeta,
        engineTags,
      });
      if (saveErr || !id) return { ok: false, error: saveErr?.message || '保存失败。' };

      const snapshot = buildColorCardSnapshot(card, displayTitle, engineTags, {
        paletteMeta,
        engineTags,
      });
      const snapshotWithMeta = {
        ...snapshot,
        sourceType,
        publishedAt: new Date().toISOString(),
      };
      let extraction_snapshot;
      try { extraction_snapshot = JSON.parse(JSON.stringify(snapshotWithMeta)); } catch { extraction_snapshot = null; }

      try {
        await apiFetch(`/styles/${id}`, {
          method: 'PATCH',
          body: { is_public: true, extraction_snapshot },
        });
      } catch (e) {
        if (e?.code === 'duplicate_title' || /duplicate_title/i.test(e.message || '')) {
          return { ok: false, error: 'duplicate_title' };
        }
        return { ok: false, error: e.message || '发布失败。' };
      }
      await refreshStyles();
      return { ok: true, id };
    },
    [user, persistColorCardVaultRow, refreshStyles, exploreFeed]
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
  const copyShareLink = useCallback((itemId, mode = 'analysis') => {
    const open = mode === 'shengse' ? 'shengse' : 'analysis';
    const url = `${window.location.origin}${window.location.pathname}?style=${itemId}&open=${open}`;
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

  const updateFlowTop = useCallback((patch) => {
    setFlowStack((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return next;
    });
  }, []);

  /** 生色 → 预览：单次更新栈，避免 update + push 竞态 */
  const advanceShengSeToPublish = useCallback(({ hexes, tags, savedState, imageFallback = '' }) => {
    setFlowStack((prev) => {
      if (!prev.length) return prev;
      const top = prev[prev.length - 1];
      if (top.type !== 'shengSe') return prev;
      const updatedShengSe = { ...top, hexes, tags, savedState };
      return [
        ...prev.slice(0, -1),
        updatedShengSe,
        {
          type: 'publish',
          hexes,
          tags: tags || [],
          paletteMeta: savedState?.paletteMeta ?? top.paletteMeta ?? null,
          imageDataUrl: top.imageDataUrl || imageFallback,
          source: top.source,
          returnTo: top.returnTo,
          dailyData: top.dailyData,
        },
      ];
    });
  }, []);

  const popFlow = useCallback(() => {
    setFlowStack((prev) => prev.slice(0, -1));
  }, []);

  const clearFlows = useCallback(() => {
    setFlowStack([]);
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await authClient.signOut();
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
    fetchStyleById,
    // Flow
    flowStack, pushFlow, popFlow, clearFlows, updateFlowTop, advanceShengSeToPublish,
  };
}
