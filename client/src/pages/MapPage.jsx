import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '../components/map/MapView.jsx';
import UnlockDialog from '../components/map/UnlockDialog.jsx';
import PlaceMemoryForm from '../components/memory/PlaceMemoryForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Toast from '../components/ui/Toast.jsx';
import OverlappingMemoryPanel from '../components/memory/OverlappingMemoryPanel.jsx';
import MemoryDetailsModal from '../components/memory/MemoryDetailsModal.jsx';
import MemoriesPanel from '../components/memory/MemoriesPanel.jsx';
import JourneysPanel from '../components/memory/JourneysPanel.jsx';
import TopRightActions from '../components/layout/TopRightActions.jsx';
import ProfilePanel from '../components/profile/ProfilePanel.jsx';
import FriendsPanel from '../components/friends/FriendsPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import api from '../services/api.js';

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
  const { user, status, isGuest, loginAsGuest } = useAuth();
  const { activePanel, closePanel } = useUI();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [allMemories, setAllMemories] = useState([]);
  const [placedMemories, setPlacedMemories] = useState([]);
  const [foundMemories, setFoundMemories] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [journeyMemories, setJourneyMemories] = useState({});
  const [journeyLoadingId, setJourneyLoadingId] = useState(null);
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
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    return list;
  }, [allMemories, filters, user, foundIds]);

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

  const fetchJourneyMemories = useCallback(
    async (journeyId) => {
      if (!journeyId) return;
      setJourneyLoadingId(journeyId);
      try {
        const data = await api.getJourneyMemories(journeyId);
        const updatedMemories = data.memories || [];
        setJourneyMemories((prev) => ({
          ...prev,
          [journeyId]: { memories: updatedMemories },
        }));
        if (updatedMemories.length) {
          setPlacedMemories((prev) =>
            prev.map((mem) => {
              const newer = updatedMemories.find((item) => item.id === mem.id);
              return newer ? { ...mem, ...newer } : mem;
            }),
          );
          setAllMemories((prev) =>
            prev.map((mem) => {
              const newer = updatedMemories.find((item) => item.id === mem.id);
              return newer ? { ...mem, ...newer } : mem;
            }),
          );
        }
      } catch (error) {
        pushToast(error.message || 'Unable to load journey', 'error');
      } finally {
        setJourneyLoadingId(null);
      }
    },
    [pushToast],
  );

  const handleVisibilityUpdate = useCallback(
    async (memory, visibility) => {
      try {
        const response = await api.updateMemoryVisibility(memory.id, visibility);
        const updated = response.memory;
        setPlacedMemories((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        );
        setAllMemories((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        );
        pushToast('Visibility updated');
      } catch (error) {
        pushToast(error.message || 'Unable to update visibility', 'error');
        throw error;
      }
    },
    [pushToast],
  );

  const handleJourneyVisibilityUpdate = useCallback(
    async (journeyId, visibility) => {
      try {
        const response = await api.updateJourneyVisibility(journeyId, visibility);
        const updatedMemories = response.memories || [];
        setJourneyMemories((prev) => ({
          ...prev,
          [journeyId]: { memories: updatedMemories },
        }));
        if (updatedMemories.length) {
          setPlacedMemories((prev) =>
            prev.map((mem) => {
              if (mem.journeyId !== journeyId) return mem;
              const newer = updatedMemories.find((item) => item.id === mem.id);
              return newer ? { ...mem, ...newer } : { ...mem, visibility };
            }),
          );
          setAllMemories((prev) =>
            prev.map((mem) => {
              if (mem.journeyId !== journeyId) return mem;
              const newer = updatedMemories.find((item) => item.id === mem.id);
              return newer ? { ...mem, ...newer } : { ...mem, visibility };
            }),
          );
        }
        pushToast('Journey visibility updated');
      } catch (error) {
        pushToast(error.message || 'Unable to update journey', 'error');
        throw error;
      }
    },
    [pushToast],
  );

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
    }),
    [
      userLocation,
      locationError,
      requestLocation,
      filteredMemories,
      handleGroupSelection,
      canPlaceMemory,
    ],
  );

  return (
    <div className="map-page">
      <div className="map-page__canvas">
        <MapView {...mapProps} />
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

      <Modal
        isOpen={placingMemory}
        onClose={() => setPlacingMemory(false)}
        className="modal-content--wide"
      >
        <h3>Place a memory</h3>
        <p className="memory-card__meta">
          Drop a note that others can unlock once they reach this spot.
        </p>
        <PlaceMemoryForm
          coords={userLocation}
          loading={savingMemory}
          suggestedTags={suggestedTags}
          onSubmit={handleCreateMemory}
          onCancel={() => setPlacingMemory(false)}
        />
      </Modal>

      <MemoriesPanel
        isOpen={activePanel === 'memories'}
        onClose={closePanel}
        placedMemories={placedMemories}
        foundMemories={foundMemories}
        onSelectMemory={handleMemoryFromPanel}
        onChangeVisibility={handleVisibilityUpdate}
      />
      <JourneysPanel
        isOpen={activePanel === 'journeys'}
        onClose={closePanel}
        journeys={journeys}
        journeyVisibilityMap={journeyVisibilityMap}
        journeyMemories={journeyMemories}
        loadingJourneyId={journeyLoadingId}
        onSelectJourney={fetchJourneyMemories}
        onChangeJourneyVisibility={handleJourneyVisibilityUpdate}
        onSelectMemory={handleMemoryFromPanel}
      />
      <ProfilePanel isOpen={activePanel === 'profile'} onClose={closePanel} />
      <FriendsPanel isOpen={activePanel === 'followers'} onClose={closePanel} />

      <Modal
        isOpen={Boolean(memoryGroupSelection)}
        onClose={() => setMemoryGroupSelection(null)}
      >
        <OverlappingMemoryPanel
          group={memoryGroupSelection}
          onClose={() => setMemoryGroupSelection(null)}
          onSelectMemory={handleMemoryFromGroup}
        />
      </Modal>

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
      />

      <Modal isOpen={guestPromptOpen} onClose={() => {}}>
        <h3>Join mempin</h3>
        <p>
          Sign in to place and unlock memories at real-world locations. You can
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
