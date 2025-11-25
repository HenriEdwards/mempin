import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '../components/map/MapView.jsx';
import UnlockDialog from '../components/map/UnlockDialog.jsx';
import PlaceMemoryForm from '../components/memory/PlaceMemoryForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Toast from '../components/ui/Toast.jsx';
import OverlappingMemoryPanel from '../components/memory/OverlappingMemoryPanel.jsx';
import MemoryDetailsModal from '../components/memory/MemoryDetailsModal.jsx';
import TopRightActions from '../components/layout/TopRightActions.jsx';
import ProfilePanel from '../components/profile/ProfilePanel.jsx';
import UserProfilePanel from '../components/profile/UserProfilePanel.jsx';
import SlidingPanel from '../components/layout/SlidingPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import { getHandleError, normalizeHandle } from '../utils/handles.js';

const ALL_VISIBILITIES = ['public', 'followers', 'unlisted', 'private'];

function useToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const pushToast = useCallback((message, kind = 'info') => {
    setToast({ message, kind });
  }, []);

  return [toast, pushToast];
}

function MapPage() {
  const { user, status, isGuest, loginAsGuest, refresh } = useAuth();
  const {
    activePanel,
    closePanel,
    goBackFromUserProfile,
    openUserProfilePanel,
    openProfilePanel,
    userProfileHandle,
    userProfileActions,
  } = useUI();
  const { theme, cycleTheme } = useTheme();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [allMemories, setAllMemories] = useState([]);
  const [placedMemories, setPlacedMemories] = useState([]);
  const [foundMemories, setFoundMemories] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [journeyMemories, setJourneyMemories] = useState({});
  const [followingIds, setFollowingIds] = useState(new Set());
  const [placingMemory, setPlacingMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [memoryGroupSelection, setMemoryGroupSelection] = useState(null);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [toast, pushToast] = useToast();
  const [detailMemory, setDetailMemory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    ownership: 'all',
    visibilities: new Set(ALL_VISIBILITIES),
    journey: 'all',
    media: 'all',
    search: '',
  });
  const [handleModalOpen, setHandleModalOpen] = useState(false);
  const [handleDraft, setHandleDraft] = useState('');
  const [handleError, setHandleError] = useState('');
  const [savingHandle, setSavingHandle] = useState(false);
  const [focusBounds, setFocusBounds] = useState(null);
  const [journeyPaths, setJourneyPaths] = useState([]);
  const [userMemoriesTarget, setUserMemoriesTarget] = useState(null);
  const [userJourneysTarget, setUserJourneysTarget] = useState(null);
  const [journeyPanel, setJourneyPanel] = useState(null);
  const [journeyPanelSearch, setJourneyPanelSearch] = useState('');
  const suggestedTags = useMemo(() => {
    const tagSet = new Set();
    placedMemories.forEach((memory) => {
      (memory.tags || []).forEach((tag) => tag && tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [placedMemories]);
  const journeyVisibilityMap = useMemo(() => {
    const map = {};
    placedMemories.forEach((memory) => {
      if (!memory.journeyId) return;
      if (!map[memory.journeyId]) {
        map[memory.journeyId] = new Set();
      }
      map[memory.journeyId].add(memory.visibility);
    });
    return map;
  }, [placedMemories]);
  const foundIds = useMemo(
    () => new Set(foundMemories.map((memory) => memory.id)),
    [foundMemories],
  );

  const normalizedUserHandle = useMemo(() => normalizeHandle(user?.handle || ''), [user]);

  const canPlaceMemory = Boolean(user);
  const canUnlock = Boolean(user);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError('');
      },
      (error) => {
        setLocationError(error.message || 'Unable to fetch location');
      },
      { enableHighAccuracy: true },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const loadConnections = useCallback(async () => {
    if (!user) {
      setFollowingIds(new Set());
      return;
    }
    try {
      const data = await api.getFollowers();
      const ids = new Set((data.following || []).map((item) => item.id));
      setFollowingIds(ids);
    } catch (error) {
      pushToast(error.message || 'Unable to load following list', 'error');
    }
  }, [user, pushToast]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const filteredMemories = useMemo(() => {
    let list = allMemories;
    if (filters.visibilities.size && filters.visibilities.size < ALL_VISIBILITIES.length) {
      list = list.filter((memory) => filters.visibilities.has(memory.visibility));
    }
    if (filters.ownership === 'mine' && user) {
      list = list.filter((memory) => memory.ownerId === user.id);
    } else if (filters.ownership === 'others' && user) {
      list = list.filter((memory) => memory.ownerId !== user.id);
    } else if (filters.ownership === 'unlocked') {
      list = list.filter((memory) => foundIds.has(memory.id));
    } else if (filters.ownership === 'following' && user) {
      list = list.filter((memory) => followingIds.has(memory.ownerId));
    }
    if (filters.journey === 'journey') {
      list = list.filter((memory) => Boolean(memory.journeyId));
    } else if (filters.journey === 'standalone') {
      list = list.filter((memory) => !memory.journeyId);
    }
    if (filters.media === 'withMedia') {
      list = list.filter((memory) => memory.hasMedia);
    } else if (filters.media === 'textOnly') {
      list = list.filter((memory) => !memory.hasMedia);
    }
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      list = list.filter((memory) => {
        const haystack = [
          memory.title,
          memory.shortDescription,
          memory.body,
          (memory.tags || []).join(' '),
          memory.journeyTitle,
          memory.ownerName,
          memory.ownerHandle ? `@${memory.ownerHandle}` : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    return list;
  }, [allMemories, filters, user, foundIds]);

  useEffect(() => {
    const grouped = new Map();
    filteredMemories
      .filter((mem) => mem.journeyId)
      .forEach((mem) => {
        if (!grouped.has(mem.journeyId)) {
          grouped.set(mem.journeyId, []);
        }
        grouped.get(mem.journeyId).push(mem);
      });

    const palette = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];
    const paths = Array.from(grouped.entries())
      .map(([journeyId, mems]) => {
        const sorted = [...mems].sort((a, b) => (a.journeyStep || 0) - (b.journeyStep || 0));
        const points = sorted.map((m) => ({
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
          id: m.id,
        }));
        const color = palette[journeyId % palette.length];
        return { id: journeyId, points, color, ownerHandle: sorted[0]?.ownerHandle };
      })
      .filter((p) => p.points.length >= 2);
    setJourneyPaths(paths);
  }, [filteredMemories]);

  const toggleVisibilityFilter = useCallback((value) => {
    setFilters((prev) => {
      const next = new Set(prev.visibilities);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      if (next.size === 0) {
        ALL_VISIBILITIES.forEach((vis) => next.add(vis));
      }
      return { ...prev, visibilities: next };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ownership: 'all',
      visibilities: new Set(ALL_VISIBILITIES),
      journey: 'all',
      media: 'all',
      search: '',
    });
    setFocusBounds(null);
  }, []);

  const loadAllMemories = useCallback(async () => {
    try {
      const data = await api.getAllMemories();
      setAllMemories(data.memories || []);
    } catch (error) {
      pushToast(error.message || 'Unable to load memories', 'error');
    }
  }, [pushToast]);

  useEffect(() => {
    if (status === 'loading') return;
    loadAllMemories();
  }, [status, user, loadAllMemories]);

  const loadJourneys = useCallback(async () => {
    if (!user) {
      setJourneys([]);
      setJourneyMemories({});
      return;
    }
    try {
      const data = await api.getJourneys();
      setJourneys(data.journeys || []);
    } catch (error) {
      pushToast(error.message || 'Unable to load journeys', 'error');
    }
  }, [user, pushToast]);

  const loadPersonalMemories = useCallback(async () => {
    if (!user) {
      setPlacedMemories([]);
      setFoundMemories([]);
      return;
    }
    try {
      const [placedResponse, foundResponse] = await Promise.all([
        api.getPlacedMemories(),
        api.getUnlockedMemories(),
      ]);
      setPlacedMemories(placedResponse.memories || []);
      setFoundMemories(foundResponse.memories || []);
    } catch (error) {
      pushToast(error.message, 'error');
    }
  }, [user, pushToast]);

  useEffect(() => {
    loadPersonalMemories();
    loadJourneys();
  }, [loadPersonalMemories, loadJourneys]);

  useEffect(() => {
    const shouldPrompt = status === 'ready' && !user && !isGuest;
    setGuestPromptOpen(shouldPrompt);
  }, [status, user, isGuest]);

  useEffect(() => {
    if (user && !user.handle) {
      setHandleModalOpen(true);
      setHandleDraft('');
      setHandleError('');
      return;
    }
    setHandleModalOpen(false);
    setHandleDraft(user?.handle || '');
    setHandleError('');
  }, [user]);

  const handleHandleSubmit = async (event) => {
    event.preventDefault();
    const validationError = getHandleError(handleDraft);
    if (validationError) {
      setHandleError(validationError);
      return;
    }
    setSavingHandle(true);
    try {
      await api.updateHandle(normalizeHandle(handleDraft));
      await refresh();
      setHandleModalOpen(false);
      pushToast('Handle saved');
    } catch (error) {
      setHandleError(error.message || 'Unable to save handle');
    } finally {
      setSavingHandle(false);
    }
  };

  const handleCreateMemory = async (formData) => {
    setSavingMemory(true);
    try {
      const response = await api.createMemory(formData);
      pushToast('Memory placed successfully');
      setPlacingMemory(false);
      setAllMemories((prev) => {
        const filtered = prev.filter((memory) => memory.id !== response.memory.id);
        return [...filtered, response.memory];
      });
      loadPersonalMemories();
      loadJourneys();
      loadAllMemories();
    } catch (error) {
      pushToast(error.message, 'error');
    } finally {
      setSavingMemory(false);
    }
  };

  const userMemories = useMemo(() => {
    if (!userMemoriesTarget?.handle) {
      return { placed: [], found: [] };
    }
    const target = userMemoriesTarget.handle;
    const placed = allMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === target,
    );
    const foundList = foundMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === target,
    );
    return { placed, found: foundList };
  }, [allMemories, foundMemories, userMemoriesTarget]);

  useEffect(() => {
    if (activePanel !== 'userProfile') {
      setUserMemoriesTarget(null);
    }
  }, [activePanel]);

  const userJourneysData = useMemo(() => {
    if (!userJourneysTarget?.handle) {
      return { journeys: [], memMap: {}, visibilityMap: {} };
    }
    const target = userJourneysTarget.handle;
    const grouped = new Map();
    allMemories
      .filter((memory) => memory.journeyId && normalizeHandle(memory.ownerHandle) === target)
      .forEach((memory) => {
        if (!grouped.has(memory.journeyId)) {
          grouped.set(memory.journeyId, []);
        }
        grouped.get(memory.journeyId).push(memory);
      });

    const journeysList = Array.from(grouped.entries()).map(([journeyId, mems]) => {
      const sorted = [...mems].sort((a, b) => (a.journeyStep || 0) - (b.journeyStep || 0));
      const first = sorted[0] || {};
      return {
        id: journeyId,
        title: first.journeyTitle || 'Journey',
        description: first.journeyDescription || '',
        stepCount: sorted.length,
        memories: sorted,
      };
    });

    const memMap = {};
    const visibilityMap = {};
    journeysList.forEach((journey) => {
      memMap[journey.id] = { memories: journey.memories };
      visibilityMap[journey.id] = new Set(
        journey.memories.map((memory) => memory.visibility).filter(Boolean),
      );
    });

    return { journeys: journeysList, memMap, visibilityMap };
  }, [allMemories, userJourneysTarget]);

  useEffect(() => {
    if (activePanel !== 'userProfile') {
      setUserJourneysTarget(null);
    }
  }, [activePanel]);

  useEffect(() => {
    if (activePanel !== 'profile' && activePanel !== 'userProfile') {
      setJourneyPanel(null);
      setJourneyPanelSearch('');
    }
  }, [activePanel]);

  const fetchMemoryDetails = useCallback(
    async (memoryId) => {
      setDetailLoading(true);
      try {
        const response = await api.getMemoryDetail(memoryId);
        setDetailMemory(response.memory);
      } catch (error) {
        pushToast(error.message, 'error');
      } finally {
        setDetailLoading(false);
      }
    },
    [pushToast],
  );

  const handleUnlock = async () => {
    if (!selectedMemory || !userLocation) {
      return;
    }
    setUnlocking(true);
    setUnlockError('');
    try {
      const response = await api.unlockMemory(selectedMemory.id, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
      setSelectedMemory(null);
      setDetailMemory(response.memory);
      loadPersonalMemories();
      await loadAllMemories().catch(() => {});
      pushToast('Memory unlocked');
    } catch (error) {
      setUnlockError(error.message);
    } finally {
      setUnlocking(false);
    }
  };

  const openJourneyPanel = useCallback(
    ({ journeyId, journeyTitle, ownerHandle }) => {
      if (!journeyId) {
        setJourneyPanel(null);
        setJourneyPanelSearch('');
        return;
      }
      const normalized = normalizeHandle(ownerHandle || '');
      const memoriesInJourney = allMemories
        .filter(
          (memory) =>
            memory.journeyId === journeyId &&
            (!normalized || normalizeHandle(memory.ownerHandle) === normalized),
        )
        .sort((a, b) => (a.journeyStep || 0) - (b.journeyStep || 0));
      setJourneyPanel({
        journeyId,
        journeyTitle: journeyTitle || 'Collection',
        ownerHandle: normalized,
        memories: memoriesInJourney,
      });
      setJourneyPanelSearch('');
      setMemoryGroupSelection(null);
    },
    [allMemories],
  );

  const handleMemoryFromPanel = useCallback(
    (memory) => {
      closePanel();
      fetchMemoryDetails(memory.id);
    },
    [closePanel, fetchMemoryDetails],
  );

  const processMemorySelection = useCallback(
    (memory) => {
      if (!memory) return;
      setUnlockError('');

      if (!user) {
        setSelectedMemory(memory);
        return;
      }

      const unlockedEntry =
        foundMemories.find((item) => item.id === memory.id) ||
        placedMemories.find((item) => item.id === memory.id);

      if (unlockedEntry) {
        fetchMemoryDetails(memory.id);
        return;
      }

      setSelectedMemory(memory);
    },
    [user, foundMemories, placedMemories, fetchMemoryDetails],
  );

  const handleGroupSelection = useCallback(
    (group) => {
      if (!group) return;
      if (group.memories.length > 1) {
        setMemoryGroupSelection(group);
        return;
      }
      processMemorySelection(group.memories[0]);
    },
    [processMemorySelection],
  );

  const handleMemoryFromGroup = useCallback(
    (memory) => {
      setMemoryGroupSelection(null);
      processMemorySelection(memory);
    },
    [processMemorySelection],
  );

  const mapProps = useMemo(
    () => ({
      userLocation,
      locationError,
      onRetryLocation: requestLocation,
      memories: filteredMemories,
      onSelectGroup: handleGroupSelection,
      onRequestPlace: () => setPlacingMemory(true),
      canPlaceMemory,
      focusBounds,
      journeyPaths,
    }),
    [
      userLocation,
      locationError,
      requestLocation,
      filteredMemories,
      handleGroupSelection,
      canPlaceMemory,
      focusBounds,
      journeyPaths,
    ],
  );

  const handleProfileMemoryClick = useCallback(
    (memory) => {
      if (!memory) return;
      setFocusBounds({
        minLat: Number(memory.latitude),
        maxLat: Number(memory.latitude),
        minLng: Number(memory.longitude),
        maxLng: Number(memory.longitude),
      });
      handleMemoryFromPanel(memory);
    },
    [handleMemoryFromPanel],
  );

  const openProfileFromList = useCallback(
    (handleValue, options = {}) => {
      const normalized = normalizeHandle(handleValue?.handle || handleValue);
      if (!normalized) return;
      if (normalized === normalizeHandle(user?.handle || '')) {
        openProfilePanel();
        return;
      }
      const displayName = handleValue?.name || '';
      setUserMemoriesTarget({ handle: normalized, name: displayName });
      setUserJourneysTarget({ handle: normalized, name: displayName });
      openUserProfilePanel(normalized, options);
    },
    [openProfilePanel, openUserProfilePanel, user?.handle],
  );

  return (
    <div className="map-page">
      <div className="map-page__canvas">
        <MapView
          {...mapProps}
          isPanelOpen={Boolean(activePanel)}
          panelWidth={activePanel ? '480px' : '480px'}
        />
        <TopRightActions
          filters={filters}
          isFilterOpen={isFilterOpen}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          onResetFilters={resetFilters}
          onSelectOwnership={(value) => setFilters((prev) => ({ ...prev, ownership: value }))}
          onSelectJourneyType={(value) => setFilters((prev) => ({ ...prev, journey: value }))}
          onSelectMedia={(value) => setFilters((prev) => ({ ...prev, media: value }))}
          onToggleVisibilityFilter={toggleVisibilityFilter}
          onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        />
      </div>
      <div className="map-theme-toggle">
        <Button
          variant="ghost"
          className="map-fab__button"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}`}
          title="Change theme"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z" />
          </svg>
        </Button>
      </div>

      <Modal
        isOpen={handleModalOpen}
        onClose={user?.handle ? () => setHandleModalOpen(false) : undefined}
        className="modal-content--narrow"
      >
        <h3>Pick a handle</h3>
        <p className="memory-card__meta">
          Handles are unique, public, and used for following. You can change it later if needed.
        </p>
        <form onSubmit={handleHandleSubmit} className="form-grid">
          <Input
            label="Handle"
            value={handleDraft}
            onChange={(event) => {
              setHandleDraft(event.target.value);
              setHandleError('');
            }}
            placeholder="@wanderer"
            autoFocus
          />
          {handleError && <p className="error-text">{handleError}</p>}
          <div className="form-actions">
            <Button type="submit" variant="primary" disabled={savingHandle}>
              {savingHandle ? 'Saving...' : 'Save handle'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={placingMemory}
        onClose={() => setPlacingMemory(false)}
        className="modal-content--wide"
      >
        <h3 className='pb-4'>New Pin</h3>
        <PlaceMemoryForm
          coords={userLocation}
          loading={savingMemory}
          suggestedTags={suggestedTags}
          onSubmit={handleCreateMemory}
          onCancel={() => setPlacingMemory(false)}
        />
      </Modal>

      <ProfilePanel
        isOpen={activePanel === 'profile'}
        onClose={closePanel}
        placedMemories={placedMemories}
        foundMemories={foundMemories}
        journeys={journeys}
        onSelectMemory={handleProfileMemoryClick}
        onOpenProfile={openProfileFromList}
        journeyMemories={journeyMemories}
        journeyVisibilityMap={journeyVisibilityMap}
        onOpenJourneyPanel={({ journeyId, journeyTitle }) =>
          openJourneyPanel({ journeyId, journeyTitle, ownerHandle: normalizedUserHandle })
        }
      />
      <SlidingPanel
        isOpen={Boolean(journeyPanel)}
        onClose={() => openJourneyPanel({ journeyId: null })}
        title={journeyPanel?.journeyTitle || 'Collection'}
        side="left"
        width="480px"
        showCloseButton
      >
        {journeyPanel ? (
          <>
            <Input
              placeholder="Search memories in this collection..."
              value={journeyPanelSearch}
              onChange={(event) => setJourneyPanelSearch(event.target.value)}
            />
            <div className="profile-memory-list" style={{ marginTop: '0.75rem' }}>
              {journeyPanel.memories
                .filter((memory) => {
                  if (!journeyPanelSearch.trim()) return true;
                  const term = journeyPanelSearch.toLowerCase();
                  return `${memory.title} ${memory.shortDescription || ''} ${memory.body || ''}`
                    .toLowerCase()
                    .includes(term);
                })
                .map((memory) => {
                  const assets = memory.assets || [];
                  const imageCount =
                    memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length;
                  const audioCount =
                    memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length;
                  const videoCount =
                    memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length;
                  const expiryText = memory.expiresAt
                    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                        new Date(memory.expiresAt),
                      )
                    : 'Forever';
                  return (
                    <button
                      key={memory.id}
                      type="button"
                      className="profile-memory-item"
                      onClick={() => {
                        handleProfileMemoryClick(memory);
                        openJourneyPanel({ journeyId: null });
                      }}
                    >
                      <div className="profile-memory-row">
                        <div className="profile-memory-title">{memory.title}</div>
                        <span className="profile-memory-pill">Step {memory.journeyStep || '-'}</span>
                        <span className="profile-memory-pill">{memory.visibility}</span>
                        <span className="profile-memory-pill">Found {memory.timesFound ?? 0}</span>
                        <span className="profile-memory-pill">{expiryText}</span>
                      </div>
                      <div className="profile-memory-meta profile-memory-assets">
                        <span className="profile-memory-asset">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="18" height="14" rx="2" ry="2" />
                            <circle cx="8.5" cy="8" r="1.5" />
                            <path d="M21 14l-5-5-4 4-2-2-4 4" />
                          </svg>
                          <span>{imageCount}</span>
                        </span>
                        <span className="profile-memory-asset">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M5 4h4l7 4v8l-7 4H5V4Z" />
                            <path d="M15 9v6" />
                          </svg>
                          <span>{audioCount}</span>
                        </span>
                        <span className="profile-memory-asset">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 6a2 2 0 0 1 2-2h8.5a2 2 0 0 1 1.6.8l3.5 4.2a2 2 0 0 1 0 2.6l-3.5 4.2a2 2 0 0 1-1.6.8H6a2 2 0 0 1-2-2V6Z" />
                            <path d="m12 9.5-2.5 2L12 13" />
                          </svg>
                          <span>{videoCount}</span>
                        </span>
                      </div>
                      {memory.createdAt && (
                        <div className="profile-memory-sub mt-4">
                          {new Date(memory.createdAt).toLocaleString()}
                        </div>
                      )}
                    </button>
                  );
                })}
              {journeyPanel.memories.length === 0 && (
                <div className="empty-state">No memories in this collection.</div>
              )}
            </div>
          </>
        ) : null}
      </SlidingPanel>
      <SlidingPanel
        isOpen={Boolean(memoryGroupSelection)}
        onClose={() => setMemoryGroupSelection(null)}
        title="Memories in this area"
        side="left"
        width="480px"
        showCloseButton
      >
        <OverlappingMemoryPanel
          group={memoryGroupSelection}
          onClose={() => setMemoryGroupSelection(null)}
          onSelectMemory={handleMemoryFromGroup}
        />
      </SlidingPanel>

      <UnlockDialog
        memory={selectedMemory}
        canUnlock={canUnlock}
        isUnlocking={unlocking}
        error={unlockError}
        onUnlock={handleUnlock}
        onClose={() => setSelectedMemory(null)}
      />

      <MemoryDetailsModal
        memory={detailMemory}
        loading={detailLoading}
        onClose={() => setDetailMemory(null)}
        onViewProfile={(handleValue) => openProfileFromList(handleValue)}
      />

      <UserProfilePanel
        isOpen={activePanel === 'userProfile'}
        handle={userProfileHandle}
        isFollowing={userProfileActions.isFollowing}
        onFollow={userProfileActions.onFollow}
        onUnfollow={userProfileActions.onUnfollow}
        onViewMemories={(profile) => {
          if (profile?.handle) {
            openProfileFromList(profile);
          }
        }}
        onViewJourneys={(profile) => {
          if (profile?.handle) {
            openProfileFromList(profile);
          }
        }}
        onSelectMemory={handleProfileMemoryClick}
        placedMemories={userMemories.placed}
        foundMemories={userMemories.found}
        journeys={userJourneysData.journeys}
        journeyMemories={userJourneysData.memMap}
        journeyVisibilityMap={userJourneysData.visibilityMap}
        onOpenProfile={openProfileFromList}
        onOpenJourneyPanel={({ journeyId, journeyTitle }) =>
          openJourneyPanel({ journeyId, journeyTitle, ownerHandle: userMemoriesTarget?.handle })
        }
        onClose={() => goBackFromUserProfile()}
      />

      <Modal isOpen={guestPromptOpen} onClose={() => {}}>
        <h3><strong>Join mempin</strong></h3>
        <br></br>
        <p>
          Sign in to place and unlock memory pins at real-world locations. You can
          also continue as a guest to browse nearby markers.
        </p>
        <div className="guest-modal__actions">
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = `${api.API_BASE_URL}/auth/google`;
            }}
          >
            Sign in with Google
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              loginAsGuest();
              setGuestPromptOpen(false);
            }}
          >
            Continue as guest
          </Button>
        </div>
      </Modal>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}

export default MapPage;
