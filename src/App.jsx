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
import ProfilePage from './pages/ProfilePage';
import ProfileOnboardingPage from './pages/ProfileOnboardingPage';
import { needsProfileOnboarding } from './lib/profileOnboarding';
import { applyProfileFont } from './lib/profileFonts';

import CreateActionSheet from './flows/CreateActionSheet';
import ExtractEditorPage from './flows/ExtractEditorPage';
import ShengSePage from './flows/ShengSePage';
import PublishPreviewPage from './flows/PublishPreviewPage';
import LandingPage from './components/LandingPage';

import { normalizeHex } from './lib/randomInspiration';

function shouldShowDesktopLanding() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('style')) return false;
  return window.matchMedia('(min-width: 768px)').matches;
}

const PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default function App() {
  const app = useColorApp();
  const {
    user, session, authReady, recoveryMode, setRecoveryMode, signOut, supabase,
    colorPaletteExploreFeed, vaultColorPaletteItems, likedStyleIds, communityLikeBusyId,
    communityTagList, bumpTagClick,
    toggleCommunityLike, persistColorCardVaultRow, deleteVaultItem,
    publishColorCard, downloadColorCardPng, copyShareLink,
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
    if (!user) {
      applyProfileFont('serif');
      return;
    }
    applyProfileFont(user.user_metadata?.font_id || 'serif');
  }, [user?.id, user?.user_metadata?.font_id]);

  // ── Tab change helper ─────────────────────────────────────────────────
  const handleTabChange = (key) => {
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
          onNext={(hexes) => {
            const imageDataUrl = currentFlow.imageDataUrl || PLACEHOLDER_IMAGE;
            pushFlow({ type: 'publish', hexes, imageDataUrl, source: currentFlow.source });
          }}
          onSaveToFavorites={async (hexes) => {
            if (!user) { setAuthModalOpen(true); return; }
            const card = { overview: '', colors: hexes.map((h) => ({ hex: h })) };
            await persistColorCardVaultRow(currentFlow.imageDataUrl || PLACEHOLDER_IMAGE, card);
          }}
        />
      );
    }

    if (currentFlow.type === 'publish') {
      return (
        <PublishPreviewPage
          flow={currentFlow}
          user={user}
          onBack={popFlow}
          onPublish={async ({ title, hexes, imageDataUrl }) => {
            if (!user) { setAuthModalOpen(true); return { ok: false, error: '请先登录。' }; }
            const res = await publishColorCard({ title, hexes, imageDataUrl });
            if (res.ok) {
              clearFlows();
              handleTabChange('colorSea');
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
            onDeleteItem={(id) => deleteVaultItem(id)}
            onOpenInShengSe={(colors) => openShengSe(colors?.map((c) => c?.hex || c))}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
          />
        );
      case 'colorSea':
        return (
          <ColorSeaPage
            user={user}
            colorPaletteExploreFeed={colorPaletteExploreFeed}
            likedStyleIds={likedStyleIds}
            communityLikeBusyId={communityLikeBusyId}
            communityTagList={communityTagList}
            onToggleLike={(id) => toggleCommunityLike(id)}
            onOpenInShengSe={(colors) => openShengSe(colors?.map((c) => c?.hex || c))}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onCopyLink={(id) => copyShareLink(id)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'game':
        return <GamePage />;
      case 'profile':
        return (
          <ProfilePage
            user={user}
            supabase={supabase}
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
    {desktopLandingOpen && (
      <LandingPage onGoExplore={() => setDesktopLandingOpen(false)} />
    )}
    {showProfileOnboarding && (
      <ProfileOnboardingPage
        user={user}
        supabase={supabase}
        onComplete={() => {
          setProfileSetupDone(true);
          handleTabChange('profile');
        }}
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

      {/* ── Auth modals ── */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        supabase={supabase}
      />
      {recoveryMode && supabase && (
        <SetPasswordModal
          supabase={supabase}
          onClose={() => setRecoveryMode(false)}
        />
      )}
    </div>
    </>
  );
}
