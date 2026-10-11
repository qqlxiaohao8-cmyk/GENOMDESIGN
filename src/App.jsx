import React, { useEffect, useRef, useState } from 'react';
import useColorApp from './hooks/useColorApp';
import ColorHuntShell from './components/layout/ColorHuntShell';
import AppNav from './components/layout/AppNav';
import AuthModal from './components/AuthModal';
import SetPasswordModal from './components/SetPasswordModal';
import ColorCardPreviewOverlay from './components/ColorCardPreviewOverlay';
import { itemColorCardData } from './components/StyleUiPreviewCard';

import FavoritesPage, { PREVIEW_USER } from './pages/FavoritesPage';
import ColorSeaPage from './pages/ColorSeaPage';
import DailyOneColorPage from './pages/DailyOneColorPage';
import ProfilePage from './pages/ProfilePage';
import ProfileOnboardingPage from './pages/ProfileOnboardingPage';
import { needsProfileOnboarding } from './lib/profileOnboarding';
import { applyProfileFont } from './lib/profileFonts';
import SplashDrop from './components/SplashDrop';
import { compressImageDataUrl } from './lib/styleImageUpload';

import ExtractEditorPage from './flows/ExtractEditorPage';
import ShengSePage from './flows/ShengSePage';
import PublishPreviewPage from './flows/PublishPreviewPage';
import PaletteAnalysisPage from './flows/PaletteAnalysisPage';
import DailyChallengePage from './flows/DailyChallengePage';

import { normalizeHex } from './lib/randomInspiration';
import { authClient } from './lib/authClient';

const LANDING_DISMISSED_KEY = 'genom-landing-dismissed';
const ACTIVE_TAB_KEY = 'genom-active-tab';
const VALID_TABS = new Set(['favorites', 'colorSea', 'dailyOneColor', 'profile']);

function readStoredActiveTab() {
  if (typeof window === 'undefined') return 'favorites';
  try {
    const tab = sessionStorage.getItem(ACTIVE_TAB_KEY);
    if (tab && VALID_TABS.has(tab)) return tab;
  } catch {
    /* private mode */
  }
  return 'favorites';
}

function shouldShowDesktopLanding() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('style')) return false;
  try {
    if (localStorage.getItem(LANDING_DISMISSED_KEY)) return false;
    } catch {
    /* private mode */
  }
  return window.matchMedia('(min-width: 768px)').matches;
}

function dismissDesktopLanding(setter) {
  setter(false);
  try {
    localStorage.setItem(LANDING_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
}

const PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default function App() {
  const app = useColorApp();
  const {
    user, session, authReady, recoveryMode, setRecoveryMode, signOut,
    colorPaletteExploreFeed, vaultColorPaletteItems, favoritedExploreStyleIds, vaultFavoriteBusyId,
    communityTagList, bumpTagClick,
    toggleVaultFavoriteFromExplore, persistColorCardVaultRow, deleteVaultItem, removeFromVault,
    publishColorCard, publishDailyPaletteCard, downloadColorCardPng, copyShareLink,
    flowStack, pushFlow, popFlow, clearFlows, updateFlowTop, advanceShengSeToPublish,
    exploreFeed, personalLibrary, fetchStyleById, patchExploreFeedLikeCount,
  } = app;

  const [activeTab, setActiveTab] = useState(readStoredActiveTab);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [gate, setGate] = useState('splash');
  const [seaFocusTag, setSeaFocusTag] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const extractInputRef = useRef(null);
  // Shared style preview overlay (deep-link or card detail)
  const [previewOverlay, setPreviewOverlay] = useState(null);
  const [colorSeaSimilarHex, setColorSeaSimilarHex] = useState(null);
  const [colorSeaSimilarMeta, setColorSeaSimilarMeta] = useState(null);
  const pendingReturnRef = useRef(null);
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [desktopLandingOpen, setDesktopLandingOpen] = useState(false);
  const mainScrollRef = useRef(null);

  // OAuth redirect / fresh load — ensure session cookie is picked up
  useEffect(() => {
    authClient.getSession().catch(() => {});
  }, []);

  // Wait for auth before showing intro; logged-in users enter directly
  useEffect(() => {
    if (!authReady) return;
    if (user) {
      dismissDesktopLanding(setDesktopLandingOpen);
      return;
    }
    if (shouldShowDesktopLanding()) setDesktopLandingOpen(true);
  }, [authReady, user]);

  // ── Deep-link: ?style=<uuid>&open=shengse|analysis ───────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const styleId = params.get('style');
    if (!styleId || !authReady) return;

    let cancelled = false;

    const resolveItem = async () => {
      const local = [...(exploreFeed || []), ...(personalLibrary || [])].find(
        (i) => i.id === styleId,
      );
      if (local) return local;
      return fetchStyleById(styleId);
    };

    (async () => {
      const item = await resolveItem();
      if (cancelled || !item) return;

      const openMode = params.get('open') || 'analysis';
      history.replaceState(null, '', window.location.pathname);
      dismissDesktopLanding(setDesktopLandingOpen);

      if (openMode === 'shengse') {
        const cd = itemColorCardData(item);
        const hexes = (cd?.colors || [])
          .map((c) => c?.hex)
          .filter(Boolean)
          .map(normalizeHex);
        if (hexes.length >= 2) {
          pushFlow({ type: 'shengSe', hexes, source: 'share' });
        }
      return;
    }

      pushFlow({ type: 'paletteAnalysis', itemId: styleId, item });
    })();

    return () => { cancelled = true; };
  }, [authReady, exploreFeed, personalLibrary, fetchStyleById, pushFlow]);

  // ── Close auth modal on sign in ───────────────────────────────────────
  useEffect(() => {
    if (user) setAuthModalOpen(false);
  }, [user]);

  useEffect(() => {
    if (!user) setProfileSetupDone(false);
  }, [user]);

  const showProfileOnboarding =
    authReady &&
    user &&
    !recoveryMode &&
    !profileSetupDone &&
    needsProfileOnboarding(user);

  useEffect(() => {
    if (showProfileOnboarding) dismissDesktopLanding(setDesktopLandingOpen);
  }, [showProfileOnboarding]);

  useEffect(() => {
    if (!user) {
      applyProfileFont('serif');
        return;
      }
    applyProfileFont(user.user_metadata?.font_id || 'serif');
  }, [user?.id, user?.user_metadata?.font_id]);

  useEffect(() => {
    if (user && gate === 'flip') {
      setGate('app');
      setActiveTab('favorites');
    }
  }, [user, gate]);

  useEffect(() => {
    if (gate !== 'splash') return;
    setActiveTab('favorites');
  }, [gate]);

  // ── Tab change helper ─────────────────────────────────────────────────
  const handleTabChange = (key) => {
    setActiveTab(key);
    try {
      sessionStorage.setItem(ACTIVE_TAB_KEY, key);
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // ── Flow helpers ──────────────────────────────────────────────────────
  const restoreCardPreview = (itemId) => {
    const item = [...(exploreFeed || []), ...(personalLibrary || [])].find((i) => i.id === itemId);
    if (!item) return;
    const cd = itemColorCardData(item);
    if (cd) setPreviewOverlay({ colorCardData: cd, item });
  };

  const handleFlowBack = () => {
    const top = flowStack[flowStack.length - 1];
    if (top?.returnTo?.kind === 'cardPreview' && flowStack.length === 1) {
      pendingReturnRef.current = top.returnTo;
    }
    popFlow();
  };

  useEffect(() => {
    if (flowStack.length > 0 || !pendingReturnRef.current) return;
    const { itemId } = pendingReturnRef.current;
    pendingReturnRef.current = null;
    restoreCardPreview(itemId);
  }, [flowStack.length, exploreFeed, personalLibrary]);

  const openShengSeFromItem = (item, colors) => {
    const hexes = (colors || [])
      .map((c) => (typeof c === 'string' ? c : c?.hex))
      .filter(Boolean)
      .map(normalizeHex);
    const flow = {
      type: 'shengSe',
      hexes: hexes.length >= 2 ? hexes : undefined,
      source: 'card',
    };
    if (item?.id) {
      flow.returnTo = { kind: 'cardPreview', itemId: item.id };
    }
    pushFlow(flow);
  };

  const openShengSe = (seedHexes) => {
    const hexes = seedHexes?.length >= 2 ? seedHexes.map(normalizeHex) : undefined;
    pushFlow({ type: 'shengSe', hexes, source: 'card' });
  };

  const openExtract = (imageDataUrl) => {
    pushFlow({ type: 'extract', imageDataUrl, source: 'fab' });
  };

  const handleExtractFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || '')) {
      alert('请选择 JPG / PNG / WEBP 图片。');
      return;
    }
    if (file.size > 28 * 1024 * 1024) {
      alert('图片过大（需 ≤ 28MB）。');
      return;
    }
    try {
      const raw = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('无法读取文件'));
        r.readAsDataURL(file);
      });
      const compressed = await compressImageDataUrl(raw, 3200, 0.88);
      openExtract(compressed);
    } catch (err) {
      alert(err?.message || '处理图片失败。');
    }
  };

  const openPaletteAnalysis = (vaultItem) => {
    if (!vaultItem?.id) return;
    pushFlow({ type: 'paletteAnalysis', itemId: vaultItem.id });
  };

  const openColorSeaSimilarTo = (hex, meta = null) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    clearFlows();
    setColorSeaSimilarHex(norm);
    setColorSeaSimilarMeta(meta ? { name: meta.name || null } : null);
    handleTabChange('colorSea');
  };

  const currentFlow = flowStack[flowStack.length - 1] ?? null;

  // ── Render active flow (full-screen overlay) ──────────────────────────
  const renderFlow = () => {
    if (!currentFlow) return null;

    if (currentFlow.type === 'extract') {
    return (
        <ExtractEditorPage
          flow={currentFlow}
          onBack={handleFlowBack}
          onContinue={(hexes, savedState) => {
            const normalized = (hexes || [])
              .map((h) => normalizeHex(typeof h === 'string' ? h : h?.hex))
              .filter(Boolean);
            if (normalized.length < 2) return;
            updateFlowTop({ savedState: { ...savedState, hexes: normalized } });
            pushFlow({
              type: 'shengSe',
              hexes: normalized,
              source: 'extract',
              imageDataUrl: currentFlow.imageDataUrl,
            });
        }}
      />
    );
  }

    if (currentFlow.type === 'shengSe') {
  return (
        <ShengSePage
          key={`shengse-${(currentFlow.hexes || []).join(',')}-${(currentFlow.savedState?.hexes || []).join(',')}`}
          flow={currentFlow}
          onBack={handleFlowBack}
          onNext={(hexes, tags, savedState) => {
            advanceShengSeToPublish({
              hexes,
              tags,
              savedState,
              imageFallback: PLACEHOLDER_IMAGE,
            });
          }}
          onSaveToFavorites={async (hexes) => {
            if (!user) { setAuthModalOpen(true); return; }
            const card = { overview: '', colors: hexes.map((h) => ({ hex: h })) };
            await persistColorCardVaultRow(currentFlow.imageDataUrl || PLACEHOLDER_IMAGE, card);
          }}
        />
      );
    }

    if (currentFlow.type === 'dailyChallenge') {
                  return (
        <DailyChallengePage
          flow={currentFlow}
          onBack={popFlow}
          onNext={(hexes, tags) => {
            pushFlow({
              type: 'publish',
              hexes,
              tags: tags || [],
              imageDataUrl: PLACEHOLDER_IMAGE,
              source: 'dailyChallenge',
              dailyData: currentFlow.dailyData,
            });
          }}
        />
      );
    }

    if (currentFlow.type === 'paletteAnalysis') {
      const item =
        currentFlow.item ||
        vaultColorPaletteItems.find((i) => i.id === currentFlow.itemId) ||
        colorPaletteExploreFeed.find((i) => i.id === currentFlow.itemId);
      if (!item) {
        popFlow();
        return null;
      }
                  return (
        <PaletteAnalysisPage
          item={item}
          exploreFeed={colorPaletteExploreFeed}
          onBack={popFlow}
          onUnfavorite={() => removeFromVault(item.id)}
          onFindSimilarPalettes={openColorSeaSimilarTo}
          onLikeCountUpdate={patchExploreFeedLikeCount}
        />
      );
    }

    if (currentFlow.type === 'publish') {
      const isDailySubmit = currentFlow.source === 'dailyChallenge';
      return (
        <PublishPreviewPage
          flow={currentFlow}
          user={user}
          publishTarget={isDailySubmit ? 'dailyOneColor' : 'colorSea'}
          existingPublicTitles={colorPaletteExploreFeed.map((i) => i.aesthetic).filter(Boolean)}
          onBack={handleFlowBack}
          onOpenAuth={() => setAuthModalOpen(true)}
          onPublish={async ({ title, hexes, imageDataUrl, tags }) => {
            if (!user) { setAuthModalOpen(true); return { ok: false, error: '请先登录。' }; }
            const res = isDailySubmit
              ? await publishDailyPaletteCard({
                  title,
                  hexes,
                  imageDataUrl,
                  tags,
                  dailyAnchorHex: currentFlow.dailyData?.hex,
                  dailyDateKey: currentFlow.dailyData?.dateKey,
                })
              : await publishColorCard({
                  title,
                  hexes,
                  imageDataUrl,
                  tags,
                  paletteMeta: currentFlow.paletteMeta,
                });
            if (res.ok && !isDailySubmit) {
              clearFlows();
              handleTabChange('colorSea');
            }
            return res;
          }}
          onGoToDailyVote={() => {
            clearFlows();
            handleTabChange('dailyOneColor');
          }}
          onDownload={(colors, title) => downloadColorCardPng(colors, title)}
          onCopyLink={(id) => copyShareLink(id, 'shengse')}
        />
      );
    }

    return null;
  };

  // ── Render active tab ─────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'favorites':
        return (
          <FavoritesPage
            user={user}
            authReady={authReady}
            vaultColorPaletteItems={vaultColorPaletteItems}
            onOpenAuth={() => setGate('flip')}
            onDeleteItem={(id) => removeFromVault(id)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onAnalyzePalette={openPaletteAnalysis}
            onCopyLink={(id) => copyShareLink(id, 'analysis')}
            onStartChallenge={(dailyData) => {
              pushFlow({ type: 'dailyChallenge', dailyData, source: 'mine' });
            }}
            onOpenDailyPool={() => handleTabChange('dailyOneColor')}
            onEditProfile={() => {
              setEditProfileOpen(true);
              handleTabChange('profile');
            }}
          />
        );
      case 'colorSea':
        return (
          <ColorSeaPage
                user={user}
            colorPaletteExploreFeed={colorPaletteExploreFeed}
            favoritedExploreStyleIds={favoritedExploreStyleIds}
            vaultFavoriteBusyId={vaultFavoriteBusyId}
            communityTagList={communityTagList}
            onTagClick={bumpTagClick}
            onToggleFavorite={(item) => toggleVaultFavoriteFromExplore(item)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onCopyLink={(id) => copyShareLink(id, 'analysis')}
                onOpenAuth={() => setAuthModalOpen(true)}
            similarHexFilter={colorSeaSimilarHex}
            similarHexMeta={colorSeaSimilarMeta}
            onClearSimilarHexFilter={() => {
              setColorSeaSimilarHex(null);
              setColorSeaSimilarMeta(null);
            }}
            focusTag={seaFocusTag}
          />
        );
      case 'dailyOneColor':
        return (
          <DailyOneColorPage
                user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onBackToGame={() => handleTabChange('favorites')}
          />
        );
      case 'profile':
                        return (
          <ProfilePage
            user={user}
            onOpenAuth={() => setGate('flip')}
            onSignOut={signOut}
            editOpen={editProfileOpen}
            onEditConsumed={() => setEditProfileOpen(false)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    {showProfileOnboarding && (
      <ProfileOnboardingPage
        user={user}
        onComplete={() => {
          setProfileSetupDone(true);
          handleTabChange('favorites');
        }}
      />
    )}
    <AuthModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
    />
    {recoveryMode && (
      <SetPasswordModal
        onSuccess={() => setRecoveryMode(false)}
      />
    )}
    <div
      className={`xuan-paper relative flex h-screen max-h-dvh min-h-0 flex-col overflow-hidden font-zenSans font-extralight ${showProfileOnboarding ? 'invisible h-0 overflow-hidden' : ''}`}
      aria-hidden={showProfileOnboarding}
    >
      <div className="zen-mist-layer zen-mist-layer--subtle pointer-events-none" aria-hidden>
        <div className="zen-paper-blob zen-paper-blob--a" />
        <div className="zen-paper-blob zen-paper-blob--b" />
        <div className="zen-paper-blob zen-paper-blob--c" />
        <div className="zen-paper-blob zen-paper-blob--d" />
        <div className="zen-paper-blob zen-paper-blob--e" />
      </div>

      <ColorHuntShell
        sidebar={
          /* AppNav renders desktop sidebar inline + mobile bar as fixed overlay */
          <AppNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onShengSe={() => pushFlow({ type: 'shengSe', source: 'fab' })}
            onExtract={() => extractInputRef.current?.click()}
          />
        }
      >
        <main
          ref={mainScrollRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-transparent pt-[env(safe-area-inset-top,0px)] pb-[max(5.5rem,env(safe-area-inset-bottom,0px))] md:pb-0 md:pt-0"
        >
          {renderTab()}
      </main>
      </ColorHuntShell>

      {/* ── Full-screen flows ── */}
      {renderFlow()}

      <input
        ref={extractInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleExtractFile}
      />

      {(gate === 'splash' || (gate === 'flip' && !user)) && (
        <SplashDrop
          ready={authReady}
          user={user}
          landOnHero
          accentHex={user?.user_metadata?.accent_hex || PREVIEW_USER.user_metadata.accent_hex}
          username={
            user?.user_metadata?.username
            || user?.email?.split('@')[0]
            || PREVIEW_USER.user_metadata.username
          }
          startAtLogin={gate === 'flip'}
          onLanded={() => setGate('app')}
          onNeedLogin={() => setGate('flip')}
          onSkip={() => {
            setGate('app');
            handleTabChange('colorSea');
          }}
          onAuthed={() => {
            setGate('app');
            handleTabChange('favorites');
          }}
        />
      )}

      {/* ── Color card preview overlay (deep-link / share) ── */}
      {previewOverlay?.colorCardData && (
        <ColorCardPreviewOverlay
          imageSrc={previewOverlay.item?.imageUrl || ''}
          colorCardData={previewOverlay.colorCardData}
          onClose={() => setPreviewOverlay(null)}
          onOpenInExtract={() => {
            const colors = previewOverlay.colorCardData?.colors || [];
            openShengSeFromItem(previewOverlay.item, colors);
          }}
        />
      )}

            </div>
    </>
  );
}
