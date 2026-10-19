import React, { useEffect, useRef, useState } from 'react';
import useColorApp from './hooks/useColorApp';
import ColorHuntShell from './components/layout/ColorHuntShell';
import CreateFab from './components/layout/CreateFab';
import MineDrawer from './components/MineDrawer';
import ColorMemoryGame from './components/ColorMemoryGame';
import ColorWalkFlowOverlay from './components/ColorWalkFlowOverlay';
import AuthModal from './components/AuthModal';
import { X } from 'lucide-react';
import SetPasswordModal from './components/SetPasswordModal';
import ColorCardPreviewOverlay from './components/ColorCardPreviewOverlay';
import { itemColorCardData } from './components/StyleUiPreviewCard';

import FavoritesPage from './pages/FavoritesPage';
import { PREVIEW_USER } from './lib/guestMineAccess';
import ColorSeaPage from './pages/ColorSeaPage';
import DailyOneColorPage from './pages/DailyOneColorPage';
import ProfilePage from './pages/ProfilePage';
import { needsProfileOnboarding } from './lib/profileOnboarding';
import { applyProfileFont } from './lib/profileFonts';
import SplashDrop from './components/SplashDrop';
import InkFilter from './components/icons/InkFilter';
import { compressImageDataUrl } from './lib/styleImageUpload';

import ExtractEditorPage from './flows/ExtractEditorPage';
import ShengSePage from './flows/ShengSePage';
import PublishPreviewPage from './flows/PublishPreviewPage';
import PaletteAnalysisPage from './flows/PaletteAnalysisPage';
import DailyChallengePage from './flows/DailyChallengePage';

import { normalizeHex } from './lib/randomInspiration';
import { authClient } from './lib/authClient';
import { canOpenMine } from './lib/guestMineAccess';
import { useCalendarDateKey } from './hooks/useCalendarDateKey';

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
    user, session, authReady, libraryReady, recoveryMode, setRecoveryMode, signOut,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memorySession, setMemorySession] = useState(0);
  const [walkOpen, setWalkOpen] = useState(false);
  const extractInputRef = useRef(null);
  const dateKey = useCalendarDateKey();
  // Shared style preview overlay (deep-link or card detail)
  const [previewOverlay, setPreviewOverlay] = useState(null);
  const [colorSeaSimilarHex, setColorSeaSimilarHex] = useState(null);
  const [colorSeaSimilarMeta, setColorSeaSimilarMeta] = useState(null);
  const pendingReturnRef = useRef(null);
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [desktopLandingOpen, setDesktopLandingOpen] = useState(false);
  const mainScrollRef = useRef(null);
  const seenTabRef = useRef(false);
  const slideTab = seenTabRef.current;

  useEffect(() => {
    seenTabRef.current = true;
  }, [activeTab]);

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
    setActiveTab(canOpenMine(user) ? 'favorites' : 'colorSea');
  }, [gate, user]);

  useEffect(() => {
    if (!authReady) return;
    if (activeTab === 'profile') {
      setActiveTab(canOpenMine(user) ? 'favorites' : 'colorSea');
      return;
    }
    if (canOpenMine(user)) return;
    if (activeTab === 'favorites' || activeTab === 'dailyOneColor') {
      setActiveTab('colorSea');
    }
  }, [authReady, user, activeTab]);

  // ── Tab change helper ─────────────────────────────────────────────────
  const promptLogin = () => {
    setGate('flip');
  };

  const handleTabChange = (key) => {
    if ((key === 'favorites' || key === 'dailyOneColor') && !canOpenMine(user)) {
      promptLogin();
      return;
    }
    setCreateOpen(false);
    setDrawerOpen(false);
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

  const openColorCardPreview = (item, colors) => {
    const fromItem = itemColorCardData(item);
    const swatches = fromItem?.colors?.length ? fromItem.colors : (colors || []);
    if (!swatches.length) return;
    const title = fromItem?.title
      || fromItem?.paletteTitle
      || fromItem?.overview
      || item?.aesthetic
      || '';
    setPreviewOverlay({
      item: item || null,
      colorCardData: {
        ...(fromItem || {}),
        colors: swatches,
        title,
        paletteTitle: title,
      },
    });
  };

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
          key={`daily-${flowStack.length}-${currentFlow.dailyData?.hex || ''}`}
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
              handleTabChange('favorites');
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
        if (!canOpenMine(user)) return null;
        return (
          <FavoritesPage
            user={user}
            authReady={authReady}
            libraryReady={libraryReady}
            vaultColorPaletteItems={vaultColorPaletteItems}
            onOpenAuth={() => setGate('flip')}
            onDeleteItem={(id) => removeFromVault(id)}
            onOpenInShengSe={(colors, item) => openColorCardPreview(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onAnalyzePalette={openPaletteAnalysis}
            onCopyLink={(id) => copyShareLink(id, 'analysis')}
            onStartChallenge={(dailyData) => {
              const { sourceRect, ...rest } = dailyData || {};
              pushFlow({
                type: 'dailyChallenge',
                dailyData: rest,
                sourceRect: sourceRect || null,
                source: 'mine',
              });
            }}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => {
              setCreateOpen(false);
              setDrawerOpen((open) => !open);
            }}
            onOpenSea={() => {
              setCreateOpen(false);
              handleTabChange('colorSea');
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
            onOpenInShengSe={(colors, item) => openColorCardPreview(item, colors)}
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
            onBack={() => handleTabChange('favorites')}
          />
        );
      case 'dailyOneColor':
        if (!canOpenMine(user)) return null;
        return (
          <DailyOneColorPage
                user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenInShengSe={(colors, item) => openShengSeFromItem(item, colors)}
            onDownload={(colors, title) => downloadColorCardPng(colors, title)}
            onBackToGame={() => handleTabChange('favorites')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    <InkFilter />
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
      className="xuan-paper relative flex h-screen max-h-dvh min-h-0 flex-col overflow-hidden font-zenSans font-extralight"
    >
      <div className="zen-mist-layer zen-mist-layer--subtle pointer-events-none" aria-hidden>
        <div className="zen-paper-blob zen-paper-blob--a" />
        <div className="zen-paper-blob zen-paper-blob--b" />
        <div className="zen-paper-blob zen-paper-blob--c" />
        <div className="zen-paper-blob zen-paper-blob--d" />
        <div className="zen-paper-blob zen-paper-blob--e" />
      </div>

      <ColorHuntShell>
        <main
          ref={mainScrollRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent pt-[env(safe-area-inset-top,0px)]"
        >
          <div
            key={activeTab}
            className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden${slideTab ? ' page-slide-left' : ''}`}
          >
            {renderTab()}
          </div>
      </main>
      </ColorHuntShell>

      {(() => {
        const chromeUser = user || PREVIEW_USER;
        const hideCreate = Boolean(currentFlow || settingsOpen || memoryOpen || walkOpen);
        return (
          <>
            {!hideCreate && gate === 'app' && (
              <CreateFab
                open={createOpen}
                sink={drawerOpen}
                onToggle={() => setCreateOpen((v) => !v)}
                onShengSe={() => {
                  setCreateOpen(false);
                  pushFlow({ type: 'shengSe', source: 'fab' });
                }}
                onExtract={() => {
                  setCreateOpen(false);
                  extractInputRef.current?.click();
                }}
              />
            )}

            <MineDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              user={user}
              isPreview={!user}
              username={
                chromeUser?.user_metadata?.username
                || chromeUser?.email?.split('@')[0]
                || '用户'
              }
              accentHex={chromeUser?.user_metadata?.accent_hex || '#C93756'}
              dateKey={dateKey}
              vaultItems={vaultColorPaletteItems}
              onEditProfile={() => {
                setDrawerOpen(false);
                if (!user) {
                  setGate('flip');
                  return;
                }
                setEditProfileOpen(true);
                setSettingsOpen(true);
              }}
              onOpenMemory={() => {
                setDrawerOpen(false);
                setMemorySession((n) => n + 1);
                setMemoryOpen(true);
              }}
              onOpenWalk={() => {
                setDrawerOpen(false);
                setWalkOpen(true);
              }}
              onOpenSettings={() => {
                setDrawerOpen(false);
                setSettingsOpen(true);
              }}
            />
          </>
        );
      })()}

      {settingsOpen && (
        <div className="page-slide-left fixed inset-0 z-[170] flex flex-col bg-zen-paper" role="dialog" aria-modal="true" aria-label="设定">
          <div className="flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="flex h-10 w-10 items-center justify-center"
              aria-label="关闭设定"
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ProfilePage
              user={user}
              onOpenAuth={() => setGate('flip')}
              onSignOut={() => {
                setSettingsOpen(false);
                signOut();
              }}
              editOpen={editProfileOpen}
              onEditConsumed={() => setEditProfileOpen(false)}
            />
          </div>
        </div>
      )}

      {memoryOpen && (
        <div className="page-slide-left fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label="色彩记忆">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <div className="mb-3 flex w-full max-w-md justify-end">
              <button
                type="button"
                onClick={() => setMemoryOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-white"
                aria-label="关闭游戏"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
              <ColorMemoryGame key={memorySession} mobileFill />
            </div>
          </div>
        </div>
      )}

      {walkOpen && (
        <div className="page-slide-left fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label="Color Walk">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <div className="mb-3 flex w-full max-w-md justify-end">
              <button
                type="button"
                onClick={() => setWalkOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-white"
                aria-label="关闭 Color Walk"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
              <ColorWalkFlowOverlay
                open
                variant="modal"
                onClose={() => setWalkOpen(false)}
                user={user}
                onOpenAuth={() => setGate('flip')}
                initialPhase="spin"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen flows ── */}
      {renderFlow()}

      <input
        ref={extractInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleExtractFile}
      />

      {/* ── Color card preview overlay (deep-link / share) ── */}
      {previewOverlay?.colorCardData && (
        <ColorCardPreviewOverlay
          imageSrc={previewOverlay.item?.imageUrl || ''}
          colorCardData={previewOverlay.colorCardData}
          onClose={() => setPreviewOverlay(null)}
          onDownload={() => {
            if (!user) { setAuthModalOpen(true); return; }
            const colors = previewOverlay.colorCardData?.colors || [];
            const title = previewOverlay.colorCardData?.title || previewOverlay.item?.aesthetic;
            downloadColorCardPng(colors, title);
          }}
          onToggleFavorite={
            previewOverlay.item && !previewOverlay.item.isLocalPreview
              ? () => {
                if (!user) { setAuthModalOpen(true); return; }
                toggleVaultFavoriteFromExplore(previewOverlay.item);
              }
              : undefined
          }
          isFavorite={Boolean(previewOverlay.item?.id && favoritedExploreStyleIds?.has(previewOverlay.item.id))}
          favoriteBusy={vaultFavoriteBusyId === previewOverlay.item?.id}
          onGenerateSimilar={() => {
            const colors = previewOverlay.colorCardData?.colors || [];
            openShengSeFromItem(previewOverlay.item, colors);
          }}
          onOpenInExtract={() => {
            const colors = previewOverlay.colorCardData?.colors || [];
            openShengSeFromItem(previewOverlay.item, colors);
          }}
        />
      )}

            </div>
      {(gate === 'splash' || (gate === 'flip' && !user) || showProfileOnboarding) && (
        <SplashDrop
          ready={authReady && libraryReady}
          user={user}
          setupProfile={showProfileOnboarding}
          landOnHero={Boolean(user) && !showProfileOnboarding}
          accentHex={user?.user_metadata?.accent_hex || PREVIEW_USER.user_metadata.accent_hex}
          username={
            user?.user_metadata?.username
            || user?.email?.split('@')[0]
            || PREVIEW_USER.user_metadata.username
          }
          startAtLogin={gate === 'flip' || (showProfileOnboarding && gate !== 'splash')}
          onLanded={() => {
            setGate('app');
            if (!canOpenMine(user)) handleTabChange('colorSea');
          }}
          onNeedLogin={() => setGate('flip')}
          onSkip={() => {
            setGate('app');
            handleTabChange('colorSea');
          }}
          onAuthed={() => {
            setProfileSetupDone(true);
            setGate('app');
            handleTabChange('favorites');
          }}
        />
      )}
    </>
  );
}
