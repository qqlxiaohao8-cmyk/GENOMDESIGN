import React, { useEffect, useRef, useState } from 'react';
import useColorApp from './hooks/useColorApp';
import ColorHuntShell from './components/layout/ColorHuntShell';
import AppNav from './components/layout/AppNav';
import AuthModal from './components/AuthModal';
import SetPasswordModal from './components/SetPasswordModal';
import ColorCardPreviewOverlay from './components/ColorCardPreviewOverlay';
import { itemColorCardData } from './components/StyleUiPreviewCard';

import FavoritesPage from './pages/FavoritesPage';
import ColorSeaPage from './pages/ColorSeaPage';
import GamePage from './pages/GamePage';
import DailyOneColorPage from './pages/DailyOneColorPage';
import ProfilePage from './pages/ProfilePage';
import ProfileOnboardingPage from './pages/ProfileOnboardingPage';
import { needsProfileOnboarding } from './lib/profileOnboarding';
import { applyProfileFont } from './lib/profileFonts';

import CreateActionSheet from './flows/CreateActionSheet';
import ExtractEditorPage from './flows/ExtractEditorPage';
import ShengSePage from './flows/ShengSePage';
import PublishPreviewPage from './flows/PublishPreviewPage';
import PaletteAnalysisPage from './flows/PaletteAnalysisPage';
import DailyChallengePage from './flows/DailyChallengePage';
import LandingPage from './components/LandingPage';

import { normalizeHex } from './lib/randomInspiration';
import { authClient } from './lib/authClient';

const LANDING_DISMISSED_KEY = 'genom-landing-dismissed';

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
    exploreFeed, personalLibrary, fetchStyleById,
  } = app;

  const [activeTab, setActiveTab] = useState('favorites');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  // Shared style preview overlay (deep-link or card detail)
  const [previewOverlay, setPreviewOverlay] = useState(null);
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

  // ── Tab change helper ─────────────────────────────────────────────────
  const handleTabChange = (key) => {
    if (key === 'favorites' && !user) {
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(key);
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

  const openPaletteAnalysis = (vaultItem) => {
    if (!vaultItem?.id) return;
    pushFlow({ type: 'paletteAnalysis', itemId: vaultItem.id });
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
            updateFlowTop({ savedState });
            pushFlow({
              type: 'shengSe',
              hexes,
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
            onOpenAuth={() => setAuthModalOpen(true)}
            onDeleteItem={(id) => removeFromVault(id)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onAnalyzePalette={openPaletteAnalysis}
            onCopyLink={(id) => copyShareLink(id, 'analysis')}
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
          />
        );
      case 'dailyOneColor':
        return (
          <DailyOneColorPage
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onBackToGame={() => handleTabChange('game')}
          />
        );
      case 'game':
        return (
          <GamePage
            onStartChallenge={(dailyData) => {
              pushFlow({ type: 'dailyChallenge', dailyData, source: 'game' });
            }}
            onOpenDailyPool={() => handleTabChange('dailyOneColor')}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSignOut={signOut}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    {authReady && desktopLandingOpen && !user && (
      <LandingPage onGoExplore={() => dismissDesktopLanding(setDesktopLandingOpen)} />
    )}
    {showProfileOnboarding && (
      <ProfileOnboardingPage
        user={user}
        onComplete={() => {
          setProfileSetupDone(true);
          handleTabChange('profile');
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
        <div className="zen-mist-c" />
      </div>

      <ColorHuntShell
        sidebar={
          /* AppNav renders desktop sidebar inline + mobile bar as fixed overlay */
          <AppNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onFabClick={() => setCreateSheetOpen(true)}
          />
        }
      >
        <main
          ref={mainScrollRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white pt-[env(safe-area-inset-top,0px)] pb-[max(5.5rem,env(safe-area-inset-bottom,0px))] md:pb-0 md:pt-0"
        >
          {renderTab()}
        </main>
      </ColorHuntShell>

      {/* ── Full-screen flows ── */}
      {renderFlow()}

      {/* ── Create action sheet ── */}
      {createSheetOpen && (
        <CreateActionSheet
          onClose={() => setCreateSheetOpen(false)}
          onShengSe={() => {
            pushFlow({ type: 'shengSe', source: 'fab' });
          }}
          onExtract={openExtract}
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
