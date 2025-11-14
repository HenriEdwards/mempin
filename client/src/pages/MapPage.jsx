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
import TopRightActions from '../components/layout/TopRightActions.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import api from '../services/api.js';

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
  const { isMemoriesPanelOpen, closeMemoriesPanel } = useUI();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [nearbyMemories, setNearbyMemories] = useState([]);
  const [placedMemories, setPlacedMemories] = useState([]);
  const [foundMemories, setFoundMemories] = useState([]);
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

  useEffect(() => {
    if (!userLocation) return;
    api
      .getNearbyMemories({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      })
      .then((data) => setNearbyMemories(data.memories || []))
      .catch(() => pushToast('Unable to load nearby memories', 'error'));
  }, [userLocation, pushToast]);

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
  }, [loadPersonalMemories]);

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
      setNearbyMemories((prev) => {
        const filtered = prev.filter((memory) => memory.id !== response.memory.id);
        return [...filtered, response.memory];
      });
      loadPersonalMemories();
    } catch (error) {
      pushToast(error.message, 'error');
    } finally {
      setSavingMemory(false);
    }
  };

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
      api
        .getNearbyMemories({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        })
        .then((data) => setNearbyMemories(data.memories || []))
        .catch(() => {});
      pushToast('Memory unlocked');
    } catch (error) {
      setUnlockError(error.message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleMemoryFromPanel = useCallback(
    (memory) => {
      closeMemoriesPanel();
      fetchMemoryDetails(memory.id);
    },
    [closeMemoriesPanel, fetchMemoryDetails],
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
      memories: nearbyMemories,
      onSelectGroup: handleGroupSelection,
      onRequestPlace: () => setPlacingMemory(true),
      canPlaceMemory,
    }),
    [
      userLocation,
      locationError,
      requestLocation,
      nearbyMemories,
      handleGroupSelection,
      canPlaceMemory,
    ],
  );

  return (
    <div className="map-page">
      <div className="map-page__canvas">
        <MapView {...mapProps} />
        <TopRightActions />
      </div>

      <Modal isOpen={placingMemory} onClose={() => setPlacingMemory(false)}>
        <h3>Place a memory</h3>
        <p className="memory-card__meta">
          Drop a note that others can unlock once they reach this spot.
        </p>
        <PlaceMemoryForm
          coords={userLocation}
          loading={savingMemory}
          onSubmit={handleCreateMemory}
          onCancel={() => setPlacingMemory(false)}
        />
      </Modal>

      <MemoriesPanel
        isOpen={isMemoriesPanelOpen}
        onClose={closeMemoriesPanel}
        placedMemories={placedMemories}
        foundMemories={foundMemories}
        onSelectMemory={handleMemoryFromPanel}
      />

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
        <h3>Join memloc</h3>
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
