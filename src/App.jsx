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
    flowStack, pushFlow, popFlow, clearFlows,
  } = app;

  const [activeTab, setActiveTab] = useState('favorites');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  // Shared style preview overlay (deep-link or card detail)
  const [previewOverlay, setPreviewOverlay] = useState(null);
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [desktopLandingOpen, setDesktopLandingOpen] = useState(shouldShowDesktopLanding);
  const mainScrollRef = useRef(null);

  // OAuth redirect / fresh load — ensure session cookie is picked up
  useEffect(() => {
    authClient.getSession().catch(() => {});
  }, []);

  // Logged-in or onboarding users should never see the marketing landing
  useEffect(() => {
    if (!authReady) return;
    if (user) dismissDesktopLanding(setDesktopLandingOpen);
  }, [authReady, user]);

  // ── Deep-link: ?style=<uuid> ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const styleId = params.get('style');
    if (!styleId) return;
    history.replaceState(null, '', window.location.pathname);
    // Wait for feed to populate then open overlay
    const tryOpen = (retries = 0) => {
      const item = [...(app.exploreFeed || []), ...(app.personalLibrary || [])].find(
        (i) => i.id === styleId
      );
      if (item) {
        const cd = itemColorCardData(item);
        if (cd) setPreviewOverlay({ colorCardData: cd, item });
      } else if (retries < 5) {
        setTimeout(() => tryOpen(retries + 1), 600);
      }
    };
    tryOpen();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          onBack={popFlow}
          onContinue={(hexes) => {
            pushFlow({ type: 'shengSe', hexes, source: 'extract', imageDataUrl: currentFlow.imageDataUrl });
          }}
        />
      );
    }

    if (currentFlow.type === 'shengSe') {
      return (
        <ShengSePage
          flow={currentFlow}
          onBack={popFlow}
          onNext={(hexes, tags) => {
            const imageDataUrl = currentFlow.imageDataUrl || PLACEHOLDER_IMAGE;
            pushFlow({ type: 'publish', hexes, tags: tags || [], imageDataUrl, source: currentFlow.source });
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
      const item = vaultColorPaletteItems.find((i) => i.id === currentFlow.itemId);
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
          onBack={popFlow}
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
                })
              : await publishColorCard({ title, hexes, imageDataUrl, tags });
            if (res.ok) {
              clearFlows();
              handleTabChange(isDailySubmit ? 'dailyOneColor' : 'colorSea');
            }
            return res;
          }}
          onDownload={(colors, title) => downloadColorCardPng(colors, title)}
          onCopyLink={(id) => copyShareLink(id)}
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
            onOpenInShengSe={(colors) => openShengSe(colors?.map((c) => c?.hex || c))}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onAnalyzePalette={openPaletteAnalysis}
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
            onOpenInShengSe={(colors) => openShengSe(colors?.map((c) => c?.hex || c))}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onCopyLink={(id) => copyShareLink(id)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'dailyOneColor':
        return (
          <DailyOneColorPage
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenInShengSe={(colors) => openShengSe(colors?.map((c) => c?.hex || c))}
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
    {desktopLandingOpen && !user && (
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
      className={`relative flex h-screen max-h-dvh min-h-0 flex-col overflow-hidden bg-[#FBFBFC] text-zen-ink font-zenSans font-extralight selection:bg-zen-vermilion/15 selection:text-zen-ink ${showProfileOnboarding ? 'invisible h-0 overflow-hidden' : ''}`}
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
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[max(5.5rem,env(safe-area-inset-bottom,0px))] md:pb-0 bg-zen-mist"
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
            setPreviewOverlay(null);
            const colors = previewOverlay.colorCardData?.colors || [];
            openShengSe(colors.map((c) => c?.hex));
          }}
        />
      )}

    </div>
    </>
  );
}
