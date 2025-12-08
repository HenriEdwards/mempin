import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '../components/map/MapView.jsx';
import UnlockDialog from '../components/map/UnlockDialog.jsx';
import PlaceMemoryForm from '../components/memory/PlaceMemoryForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Toast from '../components/ui/Toast.jsx';
import OverlappingMemoryPanel from '../components/memory/OverlappingMemoryPanel.jsx';
import MemoryDetailsContent from '../components/memory/MemoryDetailsContent.jsx';
import MemoriesPanel from '../components/memory/MemoriesPanel.jsx';
import TopRightActions from '../components/layout/TopRightActions.jsx';
import ProfilePanel from '../components/profile/ProfilePanel.jsx';
import UserProfilePanel from '../components/profile/UserProfilePanel.jsx';
import ProfileFollowersTab from '../components/profile/ProfileFollowersTab.jsx';
import ProfileFollowingTab from '../components/profile/ProfileFollowingTab.jsx';
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
    panels,
    leftView,
    centerView,
    rightView,
    rightHistory,
    closeLeftPanel,
    closeCenterPanel,
    goBackFromUserProfile,
    openUserProfilePanel,
    openProfilePanel,
    openFollowersPanel,
    openFollowingPanel,
    openMemoriesPanel,
    openClusterPanel,
    openMemoryDetailsPanel,
    openCreateMemoryPanel,
    resetRightPanel,
    goBackRightPanel,
    userProfileHandle,
    userProfileActions,
  } = useUI();
  const { theme, cycleTheme } = useTheme();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [allMemories, setAllMemories] = useState([]);
  const [placedMemories, setPlacedMemories] = useState([]);
  const [foundMemories, setFoundMemories] = useState([]);
  const [savedMemories, setSavedMemories] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [journeyMemories, setJourneyMemories] = useState({});
  const [followingIds, setFollowingIds] = useState(new Set());
  const [placingMemory, setPlacingMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [selectedMemoryPushHistory, setSelectedMemoryPushHistory] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockPasscode, setUnlockPasscode] = useState('');
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
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [navigationOrigin, setNavigationOrigin] = useState('');
  const [navigationMode, setNavigationMode] = useState('DRIVING');
  const [navigationSummary, setNavigationSummary] = useState(null);
  const [navigationError, setNavigationError] = useState('');
  const [navigationRequest, setNavigationRequest] = useState(null);
  const [navigationFromMemory, setNavigationFromMemory] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );
  const [placeMemoryDraft, setPlaceMemoryDraft] = useState(null);
  const isMobile = viewportWidth <= 1024;
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

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setSavedMemories([]);
      return;
    }
    try {
      const [placedResponse, foundResponse, savedResponse] = await Promise.all([
        api.getPlacedMemories(),
        api.getUnlockedMemories(),
        api.getSavedMemories(),
      ]);
      setPlacedMemories(placedResponse.memories || []);
      setFoundMemories(foundResponse.memories || []);
      setSavedMemories(savedResponse.memories || []);
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
      setPlaceMemoryDraft(null);
      closeCenterPanel();
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
    if (leftView !== 'userProfile') {
      setUserMemoriesTarget(null);
    }
  }, [leftView]);

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
    if (leftView !== 'userProfile') {
      setUserJourneysTarget(null);
    }
  }, [leftView]);

  useEffect(() => {
    if (leftView !== 'profile' && leftView !== 'userProfile') {
      setJourneyPanel(null);
      setJourneyPanelSearch('');
    }
  }, [leftView]);

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

  const handleUnlock = async (passcodeInput = '') => {
    if (!selectedMemory) {
      return;
    }
    if (selectedMemory.unlockRequiresLocation && !userLocation) {
      setUnlockError('Location required to unlock this memory.');
      return;
    }
    setUnlocking(true);
    setUnlockError('');
    try {
      const payload = {};
      if (userLocation) {
        payload.latitude = userLocation.latitude;
        payload.longitude = userLocation.longitude;
      }
      if (selectedMemory.unlockRequiresPasscode) {
        payload.passcode = passcodeInput || unlockPasscode;
      }
      const response = await api.unlockMemory(selectedMemory.id, payload);
      setSelectedMemory(null);
      const unlockedMemory = response.memory;
      setDetailMemory(unlockedMemory);
      setUnlockPasscode('');
      openMemoryDetailsPanel(
        { memoryId: unlockedMemory.id },
        { pushHistory: selectedMemoryPushHistory },
      );
      setSelectedMemoryPushHistory(false);
      loadPersonalMemories();
      await loadAllMemories().catch(() => {});
      pushToast('Memory unlocked');
    } catch (error) {
      setUnlockError(error.message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleToggleSave = useCallback(
    async (memory, shouldSave) => {
      if (!memory?.id) return;
      try {
        if (shouldSave) {
          await api.saveMemory(memory.id);
          setSavedMemories((prev) => {
            const exists = prev.some((item) => item.id === memory.id);
            if (exists) return prev;
            return [...prev, { ...memory, saved: true }];
          });
        } else {
          await api.removeSavedMemory(memory.id);
          setSavedMemories((prev) => prev.filter((item) => item.id !== memory.id));
        }
        setDetailMemory((prev) => (prev?.id === memory.id ? { ...prev, saved: shouldSave } : prev));
      } catch (error) {
        pushToast(error.message || 'Unable to update saved state', 'error');
      }
    },
    [pushToast],
  );

  const openJourneyPanel = useCallback(
    ({ journeyId, journeyTitle, ownerHandle }) => {
      if (!journeyId) {
        setJourneyPanel(null);
        setJourneyPanelSearch('');
        setMemoryGroupSelection(null);
        setFocusBounds(null);
        setNavigationTarget(null);
        setNavigationOrigin('');
        setNavigationRequest(null);
        setNavigationSummary(null);
        setNavigationError('');
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

    const journeyStops = memoriesInJourney
      .map((memory) => ({
        lat: Number(memory.latitude),
        lng: Number(memory.longitude),
      }))
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));

      if (journeyStops.length >= 1) {
        const origin =
          userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)
            ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }
            : journeyStops[0];
        const destination = journeyStops[journeyStops.length - 1];
        const waypoints = journeyStops.slice(1, -1).map((pt) => ({ location: pt, stopover: false }));

        setNavigationTarget({
          title: journeyTitle || 'Journey',
          latitude: destination.lat,
          longitude: destination.lng,
        });
        setNavigationFromMemory(null);
        setNavigationSummary(null);
        setNavigationError('');
        setNavigationMode('DRIVING');
        setNavigationOrigin(
          userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)
            ? `${Number(userLocation.latitude).toFixed(5)}, ${Number(userLocation.longitude).toFixed(5)}`
            : `${origin.lat}, ${origin.lng}`,
        );
        setNavigationRequest({
          origin,
          destination,
          waypoints,
          mode: 'DRIVING',
        });
      }

      const coords = memoriesInJourney
        .map((memory) => ({
          lat: Number(memory.latitude),
          lng: Number(memory.longitude),
        }))
        .filter(({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng));

      if (coords.length) {
        const bounds = coords.reduce(
          (acc, { lat, lng }) => ({
            minLat: Math.min(acc.minLat, lat),
            maxLat: Math.max(acc.maxLat, lat),
            minLng: Math.min(acc.minLng, lng),
            maxLng: Math.max(acc.maxLng, lng),
          }),
          {
            minLat: coords[0].lat,
            maxLat: coords[0].lat,
            minLng: coords[0].lng,
            maxLng: coords[0].lng,
          },
        );
        setFocusBounds(bounds);
      } else {
        setFocusBounds(null);
      }

      setJourneyPanel({
        journeyId,
        journeyTitle: journeyTitle || 'Journey',
        ownerHandle: normalized,
        memories: memoriesInJourney,
      });
      setJourneyPanelSearch('');
      setMemoryGroupSelection(null);
    },
    [allMemories, userLocation],
  );

  const openMemoryDetails = useCallback(
    (memory, { pushHistory = false } = {}) => {
      if (!memory?.id) return;
      setDetailMemory(null);
      openMemoryDetailsPanel({ memoryId: memory.id }, { pushHistory });
      fetchMemoryDetails(memory.id);
    },
    [fetchMemoryDetails, openMemoryDetailsPanel],
  );

  const handleCloseNavigation = useCallback(() => {
    setNavigationTarget(null);
    setNavigationRequest(null);
    setNavigationSummary(null);
    setNavigationError('');
    setNavigationFromMemory(null);
  }, []);

  const processMemorySelection = useCallback(
    (memory, options = {}) => {
      if (!memory) return;
      setUnlockError('');
      const pushHistory = Boolean(options.pushHistory);

       // If navigation panel is open for another memory, close it before opening new detail
      if (navigationTarget && Number(memory.id) !== Number(navigationTarget.id)) {
        handleCloseNavigation();
      }

      const isUnlockFree =
        !memory.unlockRequiresLocation &&
        !memory.unlockRequiresFollowers &&
        !memory.unlockRequiresPasscode;
      const isTimeLocked =
        memory.unlockAvailableFrom &&
        new Date(memory.unlockAvailableFrom).getTime() > Date.now();

      if (isTimeLocked) {
        setSelectedMemory(memory);
        setSelectedMemoryPushHistory(pushHistory);
        return;
      }

      if (isUnlockFree) {
        openMemoryDetails(memory, { pushHistory });
        return;
      }

      if (!user) {
        setSelectedMemory(memory);
        setSelectedMemoryPushHistory(pushHistory);
        return;
      }

      const unlockedEntry =
        foundMemories.find((item) => item.id === memory.id) ||
        placedMemories.find((item) => item.id === memory.id);

      if (unlockedEntry) {
        openMemoryDetails(memory, { pushHistory });
        return;
      }

      setSelectedMemory(memory);
      setSelectedMemoryPushHistory(pushHistory);
    },
    [user, foundMemories, placedMemories, openMemoryDetails, navigationTarget, handleCloseNavigation],
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
      processMemorySelection(memory, { pushHistory: true });
    },
    [processMemorySelection],
  );

  const handleGroupSelection = useCallback(
    (group) => {
      if (!group) return;
      if (group.memories.length > 1) {
        setMemoryGroupSelection(group);
        openClusterPanel(group);
        return;
      }
      processMemorySelection(group.memories[0]);
    },
    [processMemorySelection, openClusterPanel],
  );

  const handleMemoryFromGroup = useCallback(
    (memory) => {
      processMemorySelection(memory, { pushHistory: true });
    },
    [processMemorySelection],
  );

  const journeyStopPoints = useMemo(() => {
    const memories = journeyPanel?.memories || [];
    return memories
      .map((memory) => ({
        lat: Number(memory.latitude),
        lng: Number(memory.longitude),
      }))
      .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));
  }, [journeyPanel]);

  const activeJourneyPaths = useMemo(() => {
    const points = journeyStopPoints.map((pt) => ({ latitude: pt.lat, longitude: pt.lng }));
    if (points.length < 2) return [];
    return [
      {
        id: journeyPanel?.journeyId,
        points,
        color: '#0ea5e9',
        ownerHandle: journeyPanel?.ownerHandle,
      },
    ];
  }, [journeyPanel?.journeyId, journeyPanel?.ownerHandle, journeyStopPoints]);

  useEffect(() => {
    if (rightView !== 'cluster') {
      setMemoryGroupSelection(null);
    }
  }, [rightView]);

  useEffect(() => {
    if (rightView !== 'memoryDetails') {
      setDetailMemory(null);
      setDetailLoading(false);
    }
  }, [rightView]);

  useEffect(() => {
    setUnlockPasscode('');
    setUnlockError('');
  }, [selectedMemory]);

  const renderPanel = useCallback(
    (title, onClose, actions, content, leading) => {
      const showHeader = Boolean(title || onClose || actions || leading);
      return (
        <div className="panel-surface">
          {showHeader && (
            <div className="panel-surface__header">
              <div className="panel-surface__header-left">
                {leading}
                <h3 className="panel-surface__title">{title || ''}</h3>
              </div>
              <div className="panel-surface__actions">
                {actions}
                {onClose && (
                  <button
                    type="button"
                    className="panel-surface__close"
                    aria-label="Close panel"
                    onClick={onClose}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="panel-surface__body">{content}</div>
        </div>
      );
    },
    [],
  );

  const handleOpenExternalMap = useCallback((memory) => {
    if (!memory) return;
    const lat = Number(memory.latitude);
    const lng = Number(memory.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleNavigateFromMemory = useCallback(
    (memory) => {
      if (!memory) return;
      const lat = Number(memory.latitude);
      const lng = Number(memory.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setNavigationFromMemory(memory);
      setNavigationTarget(memory);
      const originValue = userLocation
        ? `${Number(userLocation.latitude).toFixed(5)}, ${Number(userLocation.longitude).toFixed(5)}`
        : '';
      setNavigationOrigin(originValue);
      setNavigationMode('DRIVING');
      setNavigationSummary(null);
      setNavigationError('');
      setNavigationRequest({
        origin: userLocation
          ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }
          : originValue,
        destination: { lat, lng },
        mode: 'DRIVING',
      });
    },
    [userLocation],
  );

  const handleStartNavigation = useCallback(() => {
    if (!navigationTarget) return;
    const lat = Number(navigationTarget.latitude);
    const lng = Number(navigationTarget.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setNavigationError('Destination is missing coordinates.');
      return;
    }
    const originValue = navigationOrigin?.trim();
    const originCoords = originValue
      ? originValue
      : userLocation
      ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }
      : null;
    if (!originCoords) {
      setNavigationError('Enter a start location.');
      return;
    }
    setNavigationError('');
    setNavigationRequest({
      origin: originCoords,
      destination: { lat, lng },
      mode: navigationMode,
    });
  }, [navigationTarget, navigationOrigin, navigationMode, userLocation]);

  useEffect(() => {
    if (!isMobile) return;
    // ensure only one left slot layer
    if (placingMemory) {
      handleCloseNavigation();
      setJourneyPanel(null);
      setMemoryGroupSelection(null);
      setDetailMemory(null);
    } else if (navigationTarget) {
      setJourneyPanel(null);
      setMemoryGroupSelection(null);
      setDetailMemory(null);
    } else if (detailMemory) {
      setJourneyPanel(null);
      setMemoryGroupSelection(null);
    } else if (journeyPanel && memoryGroupSelection) {
      setMemoryGroupSelection(null);
    }
  }, [
    isMobile,
    placingMemory,
    navigationTarget,
    handleCloseNavigation,
    journeyPanel,
    memoryGroupSelection,
    detailMemory,
  ]);


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


  useEffect(() => {
    if (centerView === 'newMemory') {
      setPlacingMemory(true);
    } else {
      setPlacingMemory(false);
    }
  }, [centerView]);

  const activeMemoriesHandle = useMemo(
    () => normalizeHandle(panels.right?.payload?.handle || normalizedUserHandle),
    [panels.right?.payload?.handle, normalizedUserHandle],
  );

  const memoriesForHandle = useMemo(() => {
    if (!activeMemoriesHandle) return { placed: [], found: [] };
    const placedList = allMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === activeMemoriesHandle,
    );
    const foundList = foundMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === activeMemoriesHandle,
    );
    return { placed: placedList, found: foundList };
  }, [activeMemoriesHandle, allMemories, foundMemories]);

  const clusterGroup = panels.right?.payload || memoryGroupSelection;
  const socialMode = panels.right?.payload?.mode || 'followers';
  const socialHandle = panels.right?.payload?.handle
    ? normalizeHandle(panels.right.payload.handle)
    : normalizedUserHandle;
  const lastRightHistory = rightHistory[rightHistory.length - 1] || null;
  const showRightBack = rightHistory.length > 0;
  const currentMemoryId = detailMemory?.id || panels.right?.payload?.memoryId || null;
  const showMemoryBack =
    rightView === 'memoryDetails' &&
    lastRightHistory?.view === 'cluster' &&
    currentMemoryId &&
    Array.isArray(lastRightHistory?.payload?.memories) &&
    lastRightHistory.payload.memories.some((mem) => mem?.id === currentMemoryId);

  const leftContent = useMemo(() => {
    if (journeyPanel) {
      const journeyTitle = journeyPanel?.journeyTitle || 'Journey';
      return renderPanel(
        journeyTitle,
        () => openJourneyPanel({ journeyId: null }),
        null,
        (
          <>
            <Input
              placeholder="Search memories in this journey..."
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
                <div className="empty-state">No memories in this journey.</div>
              )}
            </div>
          </>
        ),
        (
          <button
            type="button"
            className="profile-back-button profile-back-button--inline"
            onClick={() => openJourneyPanel({ journeyId: null })}
            aria-label="Back to journeys"
            title="Back to journeys"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ),
      );
    }

    if (leftView === 'profile') {
      return renderPanel(
        'Profile',
        closeLeftPanel,
        null,
        (
          <ProfilePanel
            isOpen
            onClose={closeLeftPanel}
            placedMemories={placedMemories}
            foundMemories={foundMemories}
            savedMemories={savedMemories}
            journeys={journeys}
            onSelectMemory={handleProfileMemoryClick}
            onOpenProfile={openProfileFromList}
            journeyMemories={journeyMemories}
            journeyVisibilityMap={journeyVisibilityMap}
            onOpenJourneyPanel={({ journeyId, journeyTitle }) =>
              openJourneyPanel({ journeyId, journeyTitle, ownerHandle: normalizedUserHandle })
            }
          />
        ),
      );
    }

    if (leftView === 'userProfile') {
      return renderPanel(
        `@${userProfileHandle || 'profile'}`,
        () => goBackFromUserProfile(),
        null,
        (
          <UserProfilePanel
            isOpen
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
        ),
      );
    }

    return null;
  }, [
    journeyPanel,
    journeyPanelSearch,
    handleProfileMemoryClick,
    openJourneyPanel,
    leftView,
    closeLeftPanel,
    placedMemories,
    foundMemories,
    savedMemories,
    journeys,
    openProfileFromList,
    journeyMemories,
    journeyVisibilityMap,
    normalizedUserHandle,
    userProfileHandle,
    userProfileActions.isFollowing,
    userProfileActions.onFollow,
    userProfileActions.onUnfollow,
    userMemories.placed,
    userMemories.found,
    userJourneysData.journeys,
    userJourneysData.memMap,
    userJourneysData.visibilityMap,
    userMemoriesTarget?.handle,
    goBackFromUserProfile,
    renderPanel,
  ]);

  const centerContent = useMemo(() => {
    if (centerView === 'newMemory') {
      return renderPanel(
        'New Pin',
        () => {
          closeCenterPanel();
          setPlacingMemory(false);
        },
        null,
        (
          <PlaceMemoryForm
            coords={userLocation}
            loading={savingMemory}
            suggestedTags={suggestedTags}
            initialFormState={placeMemoryDraft}
            onPersistDraft={setPlaceMemoryDraft}
            onSubmit={handleCreateMemory}
            onCancel={() => {
              closeCenterPanel();
              setPlacingMemory(false);
            }}
          />
        ),
      );
    }

    if (centerView === 'pricing') {
      return renderPanel(
        'Pricing',
        closeCenterPanel,
        null,
        <div className="empty-state">Pricing options will live here.</div>,
      );
    }

    return null;
  }, [
    centerView,
    closeCenterPanel,
    userLocation,
    savingMemory,
    suggestedTags,
    handleCreateMemory,
    renderPanel,
    placeMemoryDraft,
    setPlaceMemoryDraft,
  ]);

  const rightContent = useMemo(() => {
    if (navigationTarget) {
      const navigationBack = () => {
        const memoryToReopen = navigationFromMemory;
        handleCloseNavigation();
        if (memoryToReopen) {
          openMemoryDetails(memoryToReopen, { pushHistory: false });
          setNavigationFromMemory(null);
        }
      };

      return renderPanel(
        `Navigate to ${navigationTarget.title || 'memory'}`,
        handleCloseNavigation,
        navigationFromMemory ? (
          <Button variant="ghost" onClick={navigationBack}>
            Back
          </Button>
        ) : null,
        (
          <div className="navigate-panel">
            <Input
              label="Start"
              placeholder="Your location or address"
              value={navigationOrigin}
              onChange={(event) => setNavigationOrigin(event.target.value)}
            />
            <Input
              label="Destination"
              value={`${Number(navigationTarget.latitude).toFixed(5)}, ${Number(navigationTarget.longitude).toFixed(5)}`}
              readOnly
              disabled
            />
            <div className="nav-modes">
              {[
                ['DRIVING', 'Drive'],
                ['WALKING', 'Walk'],
                ['BICYCLING', 'Bike'],
                ['TRANSIT', 'Transit'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={navigationMode === value ? 'primary' : 'ghost'}
                  onClick={() => setNavigationMode(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {navigationSummary && (
              <div className="nav-summary">
                <span>{navigationSummary.distanceText || ''}</span>
                <span>-</span>
                <span>{navigationSummary.durationText || ''}</span>
              </div>
            )}
            {navigationError && <p className="error-text">{navigationError}</p>}
            <div className="form-actions">
              <Button variant="primary" onClick={handleStartNavigation}>
                Navigate
              </Button>
              <Button variant="ghost" onClick={() => handleOpenExternalMap(navigationTarget)}>
                View on Google Maps
              </Button>
            </div>
            <div className="navigation-memory-preview">
              <h4>{navigationTarget.title}</h4>
              {navigationTarget.shortDescription && (
                <p className="memory-details__preview">{navigationTarget.shortDescription}</p>
              )}
              {(navigationTarget.tags || []).length > 0 && (
                <div className="memory-details__tags">
                  {(navigationTarget.tags || []).map((tag) => (
                    <span key={tag} className="chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      );
    }

    if (rightView === 'memoryDetails') {
      return renderPanel(
        detailMemory?.title || 'Memory',
        resetRightPanel,
        showMemoryBack ? (
          <Button variant="ghost" onClick={goBackRightPanel}>
            Back
          </Button>
        ) : null,
        (
          <>
            {detailLoading && <p className="muted">Loading memory...</p>}
            {!detailLoading && detailMemory && (
              <MemoryDetailsContent
                memory={detailMemory}
                onGenerateQR={null}
                onViewProfile={openProfileFromList}
                onNavigate={handleNavigateFromMemory}
                onOpenExternal={handleOpenExternalMap}
                onToggleSave={(mem, next) => handleToggleSave(mem, next)}
              />
            )}
            {!detailLoading && !detailMemory && <div className="empty-state">Select a memory.</div>}
          </>
        ),
      );
    }

    if (rightView === 'cluster') {
      return renderPanel(
        'Memories in this area',
        () => resetRightPanel(),
        null,
        (
          <OverlappingMemoryPanel
            group={clusterGroup}
            onClose={() => resetRightPanel()}
            onSelectMemory={(memory) => processMemorySelection(memory, { pushHistory: true })}
          />
        ),
      );
    }

    if (rightView === 'social') {
      return renderPanel(
        'Social',
        resetRightPanel,
        null,
        (
          <>
            <div className="tabs tabs--segmented" style={{ marginBottom: '0.5rem' }}>
              <button
                type="button"
                className={`tab-button ${socialMode === 'followers' ? 'active' : ''}`}
                onClick={() => openFollowersPanel(socialHandle)}
              >
                Followers
              </button>
              <button
                type="button"
                className={`tab-button ${socialMode === 'following' ? 'active' : ''}`}
                onClick={() => openFollowingPanel(socialHandle)}
              >
                Following
              </button>
            </div>
            {socialMode === 'followers' ? (
              <ProfileFollowersTab
                isActive
                openProfile={openProfileFromList}
                profileHandle={socialHandle}
                hideSuggestions
              />
            ) : (
              <ProfileFollowingTab
                isActive
                openProfile={openProfileFromList}
                profileHandle={socialHandle}
                hideSuggestions={false}
              />
            )}
          </>
        ),
      );
    }

    if (rightView === 'memories') {
      return renderPanel(
        'Memories',
        resetRightPanel,
        showRightBack ? (
          <Button variant="ghost" onClick={goBackRightPanel}>
            Back
          </Button>
        ) : null,
        (
          <MemoriesPanel
            placed={memoriesForHandle.placed}
            found={memoriesForHandle.found}
            onSelectMemory={(memory) => processMemorySelection(memory, { pushHistory: true })}
            titleHandle={activeMemoriesHandle}
          />
        ),
      );
    }

    return null;
  }, [
    rightView,
    detailMemory,
    resetRightPanel,
    goBackRightPanel,
    detailLoading,
    openProfileFromList,
    handleNavigateFromMemory,
    handleOpenExternalMap,
    clusterGroup,
    processMemorySelection,
    handleToggleSave,
    socialMode,
    openFollowersPanel,
    socialHandle,
    openFollowingPanel,
    memoriesForHandle.placed,
    memoriesForHandle.found,
    activeMemoriesHandle,
    showRightBack,
    showMemoryBack,
    navigationTarget,
    navigationOrigin,
    navigationMode,
    navigationSummary,
    navigationError,
    handleStartNavigation,
    handleOpenExternalMap,
    handleCloseNavigation,
    navigationFromMemory,
    setNavigationOrigin,
    openMemoryDetails,
  ]);  const mapProps = useMemo(
    () => ({
      userLocation,
      locationError,
      onRetryLocation: requestLocation,
      memories: filteredMemories,
      onSelectGroup: handleGroupSelection,
      focusBounds,
      journeyPaths: activeJourneyPaths,
      navigationRequest,
      onRouteComputed: (summary) => {
        setNavigationSummary(summary);
        if (!summary) {
          setNavigationError('Unable to find a route.');
        } else {
          setNavigationError('');
        }
      },
    }),
    [
      userLocation,
      locationError,
      requestLocation,
      filteredMemories,
      handleGroupSelection,
      focusBounds,
      activeJourneyPaths,
      navigationRequest,
    ],
  );

  const disablePlaceMemory = !canPlaceMemory || !userLocation;

  return (
    <div className="app-shell">
      <div className="app-shell__map">
        <MapView {...mapProps} />
      </div>

      <div className="app-shell__overlay">
        <div className="shell-top-nav">
          <button type="button" className="shell-brand shell-brand--button">
            mempin
          </button>
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

        <div className="shell-panels">
          <div className={`shell-panel-slot shell-panel-slot--left ${leftContent ? 'is-active' : 'is-empty'}`}>
            {leftContent ? <div className="shell-panel shell-panel--left">{leftContent}</div> : null}
          </div>
          <div className={`shell-panel-slot shell-panel-slot--center ${centerContent ? 'is-active' : 'is-empty'}`}>
            {centerContent ? <div className="shell-panel shell-panel--center">{centerContent}</div> : null}
          </div>
          <div className={`shell-panel-slot shell-panel-slot--right ${rightContent ? 'is-active' : 'is-empty'}`}>
            {rightContent ? <div className="shell-panel shell-panel--right">{rightContent}</div> : null}
          </div>
        </div>

        <div className="shell-bottom-nav">
          <div className="shell-bottom-left">
            <Button
              variant="ghost"
              className="nav-action"
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
          <div className="shell-bottom-right">
            <Button
              variant="ghost"
              className="nav-action"
              disabled={disablePlaceMemory}
              onClick={() => {
                if (centerView === 'newMemory') {
                  closeCenterPanel();
                  setPlacingMemory(false);
                  return;
                }
                openCreateMemoryPanel();
                setPlacingMemory(true);
              }}
              aria-label="Place memory"
              title="Place memory"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="22"
                viewBox="0 -960 960 960"
                width="22"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M480-301q99-80 149.5-154T680-594q0-90-56-148t-144-58q-88 0-144 58t-56 148q0 65 50.5 139T480-301Zm0 101Q339-304 269.5-402T200-594q0-125 78-205.5T480-880q124 0 202 80.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520ZM200-80v-80h560v80H200Zm280-520Z" />
              </svg>
              <span style={{ marginLeft: '0.35rem' }}>New memory pin</span>
            </Button>
          </div>
        </div>
      </div>

      <UnlockDialog
        memory={selectedMemory}
        canUnlock={canUnlock}
        isUnlocking={unlocking}
        error={unlockError}
        onUnlock={handleUnlock}
        passcode={unlockPasscode}
        onPasscodeChange={setUnlockPasscode}
        onClose={() => {
          setSelectedMemory(null);
          setSelectedMemoryPushHistory(false);
        }}
      />

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
        isOpen={guestPromptOpen}
        onClose={() => {}}
      >
        <h3><strong>Join mempin</strong></h3>
        <br />
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


