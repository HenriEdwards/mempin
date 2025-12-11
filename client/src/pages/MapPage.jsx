import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import MapView from '../components/map/MapView.jsx';
import PlaceMemoryForm from '../components/memory/PlaceMemoryForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Toast from '../components/ui/Toast.jsx';
import OverlappingMemoryPanel from '../components/memory/OverlappingMemoryPanel.jsx';
import MemoryDetailsContent from '../components/memory/MemoryDetailsContent.jsx';
import LockedMemoryDetails from '../components/memory/LockedMemoryDetails.jsx';
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
const LAST_LOCATION_KEY = 'mempin_last_location';

function loadStoredLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch (error) {
    // ignore bad data
  }
  return null;
}

function haversineDistanceMeters(origin, destination) {
  if (!origin || !destination) return null;
  const { lat: lat1, lng: lng1 } = origin;
  const { lat: lat2, lng: lng2 } = destination;
  if (![lat1, lng1, lat2, lng2].every((value) => Number.isFinite(value))) return null;

  const R = 6371000; // meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = radLat2 - radLat1;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    openLockedMemoryPanel,
    openCreateMemoryPanel,
    resetRightPanel,
    goBackRightPanel,
    userProfileHandle,
    userProfileActions,
  } = useUI();
  const { theme, cycleTheme } = useTheme();
  const [userLocation, setUserLocation] = useState(() => loadStoredLocation());
  const [locationError, setLocationError] = useState('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [allMemories, setAllMemories] = useState([]);
  const [placedMemories, setPlacedMemories] = useState([]);
  const [foundMemories, setFoundMemories] = useState([]);
  const [savedMemories, setSavedMemories] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [journeyMemories, setJourneyMemories] = useState({});
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followingMap, setFollowingMap] = useState(new Map());
  const [placingMemory, setPlacingMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [lockedMemory, setLockedMemory] = useState(null);
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
  const [profileJourneyState, setProfileJourneyState] = useState({ id: null, scrollTop: 0 });
  const [userProfileJourneyState, setUserProfileJourneyState] = useState({ id: null, scrollTop: 0 });
  const [userProfileMeta, setUserProfileMeta] = useState({ handle: '', name: '', avatarUrl: '' });
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );
  const [placeMemoryDraft, setPlaceMemoryDraft] = useState(null);
  const isMobile = viewportWidth <= 1024;
  const lastUserIdRef = useRef(null);
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

  const hasUserLocation = useMemo(
    () =>
      Boolean(
        userLocation &&
          Number.isFinite(userLocation.latitude) &&
          Number.isFinite(userLocation.longitude),
      ),
    [userLocation],
  );

  const normalizedUserHandle = useMemo(() => normalizeHandle(user?.handle || ''), [user]);

  const canPlaceMemory = Boolean(user);
  const canUnlock = Boolean(user);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      setIsRequestingLocation(false);
      return;
    }
    setLocationError('');
    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(nextLocation);
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(nextLocation));
          }
        } catch (error) {
          // ignore storage errors
        }
        setLocationError('');
        setIsRequestingLocation(false);
      },
      (error) => {
        setLocationError(error.message || 'Unable to fetch location');
        setIsRequestingLocation(false);
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

  const handleCenterOnUser = useCallback(() => {
    setFocusBounds(null);
    setUserLocation((prev) => (prev ? { ...prev } : prev));
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (status !== 'ready') return;
    const currentId = user?.id || null;
    const previousId = lastUserIdRef.current;
    if (currentId && currentId !== previousId) {
      handleCenterOnUser();
    }
    lastUserIdRef.current = currentId;
  }, [status, user?.id, handleCenterOnUser]);

  const loadConnections = useCallback(async () => {
    if (!user) {
      setFollowingIds(new Set());
      setFollowingMap(new Map());
      return;
    }
    try {
      const data = await api.getFollowers();
      const followingList = data.following || [];
      const ids = new Set(followingList.map((item) => item.id));
      const map = new Map();
      followingList.forEach((item) => {
        const handle = normalizeHandle(item.handle || item.username || '');
        if (handle) {
          map.set(handle, item.id);
        }
      });
      setFollowingIds(ids);
      setFollowingMap(map);
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
      setUserProfileMeta({ handle: '', name: '', avatarUrl: '' });
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

  const lockedLocationStatus = useMemo(() => {
    if (!lockedMemory || !lockedMemory.unlockRequiresLocation) {
      return { required: false, withinRadius: true, hasLocation: Boolean(userLocation), distance: null };
    }
    if (!userLocation) {
      return { required: true, withinRadius: false, hasLocation: false, distance: null };
    }
    const distance = haversineDistanceMeters(
      { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) },
      { lat: Number(lockedMemory.latitude), lng: Number(lockedMemory.longitude) },
    );
    const withinRadius = Number.isFinite(distance) ? distance <= Number(lockedMemory.radiusM || 0) : false;
    return {
      required: true,
      withinRadius,
      hasLocation: true,
      distance: Number.isFinite(distance) ? distance : null,
    };
  }, [lockedMemory, userLocation]);

  const lockedFollowerStatus = useMemo(() => {
    if (!lockedMemory || !lockedMemory.unlockRequiresFollowers) {
      return { required: false, allowed: true };
    }
    if (!user) {
      return { required: true, allowed: false };
    }
    if (lockedMemory.ownerId && lockedMemory.ownerId === user.id) {
      return { required: true, allowed: true };
    }
    return {
      required: true,
      allowed: followingIds.has(lockedMemory.ownerId),
    };
  }, [lockedMemory, user, followingIds]);

  const handleUnlock = useCallback(
    async (passcodeInput = '') => {
      if (!lockedMemory) {
        return;
      }
      if (lockedMemory.unlockRequiresLocation && !userLocation) {
        setUnlockError('Location required to unlock this memory.');
        return;
      }
      if (lockedMemory.unlockRequiresLocation && !lockedLocationStatus.withinRadius) {
        setUnlockError(
          lockedLocationStatus.hasLocation
            ? 'Move closer to this memory to unlock.'
            : 'Location required to unlock this memory.',
        );
        return;
      }
      if (
        lockedMemory.unlockRequiresFollowers &&
        user &&
        lockedMemory.ownerId !== user.id &&
        !followingIds.has(lockedMemory.ownerId)
      ) {
        setUnlockError('Only followers can unlock this memory.');
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
        if (lockedMemory.unlockRequiresPasscode) {
          payload.passcode = passcodeInput || unlockPasscode;
        }
        const response = await api.unlockMemory(lockedMemory.id, payload);
        setLockedMemory(null);
        const unlockedMemory = response.memory;
        setDetailMemory(unlockedMemory);
        setUnlockPasscode('');
        openMemoryDetailsPanel({ memoryId: unlockedMemory.id });
        loadPersonalMemories();
        await loadAllMemories().catch(() => {});
        pushToast('Memory unlocked');
      } catch (error) {
        setUnlockError(error.message);
      } finally {
        setUnlocking(false);
      }
    },
    [
      lockedMemory,
      userLocation,
      unlockPasscode,
      openMemoryDetailsPanel,
      loadPersonalMemories,
      loadAllMemories,
      pushToast,
      followingIds,
      user,
      lockedLocationStatus,
    ],
  );

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

  const buildRoutePlan = useCallback(
    (stops = []) => {
      const validStops = (stops || [])
        .map((pt) => ({
          lat: Number(pt.lat),
          lng: Number(pt.lng),
        }))
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));

      const userOrigin =
        userLocation &&
        Number.isFinite(userLocation.latitude) &&
        Number.isFinite(userLocation.longitude)
          ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) }
          : null;

      const baseStops = userOrigin ? [userOrigin, ...validStops] : validStops;
      if (baseStops.length < 2) return null;

      const origin = baseStops[0];
      const destination = baseStops[baseStops.length - 1];
      const waypoints = baseStops.slice(1, -1).map((pt) => ({ location: pt, stopover: false }));
      return { origin, destination, waypoints };
    },
    [userLocation],
  );

  const openJourneyPanel = useCallback(
    ({ journeyId, journeyTitle, ownerHandle }) => {
      if (!journeyId) {
        setJourneyPanel(null);
        setJourneyPanelSearch('');
        setMemoryGroupSelection(null);
        setFocusBounds(null);
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

  const openLockedMemory = useCallback(
    (memory, pushHistory = false) => {
      if (!memory?.id) return;
      setDetailMemory(null);
      setDetailLoading(false);
      setLockedMemory(memory);
      openLockedMemoryPanel({ memoryId: memory.id, memory }, { pushHistory });
    },
    [openLockedMemoryPanel],
  );

  const isFollowingTarget = useCallback(
    (handle, id = null) => {
      const normalized = normalizeHandle(handle || '');
      if (id && followingIds.has(id)) return true;
      if (normalized && followingMap.has(normalized)) return true;
      return false;
    },
    [followingIds, followingMap],
  );

  const followHandle = useCallback(
    async (handle) => {
      if (!handle) return;
      const normalized = normalizeHandle(handle);
      if (!normalized) return;
      try {
        await api.addFollower(normalized);
        await loadConnections();
        pushToast('Followed');
      } catch (error) {
        pushToast(error.message || 'Unable to follow', 'error');
      }
    },
    [loadConnections, pushToast],
  );

  const unfollowUser = useCallback(
    async ({ userId, handle }) => {
      const normalized = normalizeHandle(handle || '');
      let targetId = userId || (normalized ? followingMap.get(normalized) : null);
      if (!targetId && normalized) {
        try {
          const profile = await api.getUserProfile(normalized);
          targetId = profile?.user?.id || null;
        } catch (error) {
          // ignore, fallback to error below
        }
      }
      if (!targetId) {
        pushToast('Unable to unfollow right now', 'error');
        return;
      }
      try {
        await api.removeFollower(targetId);
        await loadConnections();
        pushToast('Unfollowed');
      } catch (error) {
        pushToast(error.message || 'Unable to unfollow', 'error');
      }
    },
    [followingMap, loadConnections, pushToast],
  );

  const buildFollowProps = useCallback(
    (memory) => {
      if (!memory) {
        return { canFollowOwner: false, isFollowingOwner: false, onToggleFollowOwner: null };
      }
      const ownerHandle = normalizeHandle(memory.ownerHandle || '');
      const ownerId = memory.ownerId;
      const canFollowOwner =
        Boolean(user) && ownerHandle && (!ownerId || ownerId !== user.id);
      const isFollowingOwner = canFollowOwner && isFollowingTarget(ownerHandle, ownerId);
      const onToggleFollowOwner = async () => {
        if (!canFollowOwner) return;
        if (isFollowingTarget(ownerHandle, ownerId)) {
          await unfollowUser({ userId: ownerId, handle: ownerHandle });
        } else {
          await followHandle(ownerHandle);
        }
      };
      return { canFollowOwner, isFollowingOwner, onToggleFollowOwner };
    },
    [user, isFollowingTarget, unfollowUser, followHandle],
  );

  const processMemorySelection = useCallback(
    (memory, options = {}) => {
      if (!memory) return;
      setUnlockError('');
      const pushHistory = Boolean(options.pushHistory);

      const isUnlockFree =
        !memory.unlockRequiresLocation &&
        !memory.unlockRequiresFollowers &&
        !memory.unlockRequiresPasscode;
      const isTimeLocked =
        memory.unlockAvailableFrom &&
        new Date(memory.unlockAvailableFrom).getTime() > Date.now();

      if (isTimeLocked) {
        openLockedMemory(memory, pushHistory);
        return;
      }

      if (isUnlockFree) {
        openMemoryDetails(memory, { pushHistory });
        return;
      }

      if (!user) {
        openLockedMemory(memory, pushHistory);
        return;
      }

      const unlockedEntry =
        foundMemories.find((item) => item.id === memory.id) ||
        placedMemories.find((item) => item.id === memory.id);

      if (unlockedEntry) {
        openMemoryDetails(memory, { pushHistory });
        return;
      }

      openLockedMemory(memory, pushHistory);
    },
    [user, foundMemories, placedMemories, openMemoryDetails, openLockedMemory],
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

  const highlightedJourneyMemoryIds = useMemo(
    () => new Set((journeyPanel?.memories || []).map((memory) => String(memory.id))),
    [journeyPanel?.memories],
  );

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
    if (rightView !== 'lockedMemory') {
      setLockedMemory(null);
      setUnlockPasscode('');
      setUnlockError('');
      setUnlocking(false);
    }
  }, [rightView]);

  useEffect(() => {
    setUnlockPasscode('');
    setUnlockError('');
  }, [lockedMemory]);

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

  const handleOpenExternalMap = useCallback(
    (target) => {
      if (!target) return;
      const baseStops = Array.isArray(target.stops)
        ? target.stops
        : [
            {
              lat: Number(target.latitude),
              lng: Number(target.longitude),
            },
          ];
      const routePlan = buildRoutePlan(baseStops);
      if (!routePlan) return;
      const origin = `${routePlan.origin.lat},${routePlan.origin.lng}`;
      const destination = `${routePlan.destination.lat},${routePlan.destination.lng}`;
      const waypointText = (routePlan.waypoints || [])
        .map((wp) => {
          const pt = wp.location || {};
          return `${pt.lat},${pt.lng}`;
        })
        .join('|');

      const params = new URLSearchParams({
        api: '1',
        origin,
        destination,
        travelmode: 'driving',
      });
      if (waypointText) {
        params.set('waypoints', waypointText);
      }
      const url = `https://www.google.com/maps/dir/?${params.toString()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [buildRoutePlan],
  );

  useEffect(() => {
    if (!isMobile) return;
    if (placingMemory) {
      setJourneyPanel(null);
      setMemoryGroupSelection(null);
      setDetailMemory(null);
    } else if (detailMemory) {
      setJourneyPanel(null);
      setMemoryGroupSelection(null);
    } else if (journeyPanel && memoryGroupSelection) {
      setMemoryGroupSelection(null);
    }
  }, [isMobile, placingMemory, journeyPanel, memoryGroupSelection, detailMemory]);


  const openProfileFromList = useCallback(
    (handleValue, options = {}) => {
      const normalized = normalizeHandle(handleValue?.handle || handleValue);
      if (!normalized) return;
      if (normalized === normalizeHandle(user?.handle || '')) {
        openProfilePanel();
        return;
      }
      const previousMeta = userProfileMeta?.handle === normalized ? userProfileMeta : null;
      const displayName = handleValue?.name || previousMeta?.name || userMemoriesTarget?.name || '';
      const avatarUrl = handleValue?.avatarUrl || previousMeta?.avatarUrl || '';
      setUserMemoriesTarget({ handle: normalized, name: displayName });
      setUserJourneysTarget({ handle: normalized, name: displayName });
      setUserProfileMeta({ handle: normalized, name: displayName, avatarUrl });
      openUserProfilePanel(normalized, options);
    },
    [openProfilePanel, openUserProfilePanel, user?.handle, userProfileMeta, userMemoriesTarget?.name],
  );

  const handleProfileLoaded = useCallback(
    (loaded, fallbackHandle) => {
      if (!loaded) return;
      setUserProfileMeta((prev) => {
        const normalizedHandle = normalizeHandle(
          loaded.handle || fallbackHandle || prev.handle || userMemoriesTarget?.handle || '',
        );
        return {
          handle: normalizedHandle,
          name: loaded.name || userMemoriesTarget?.name || prev.name || '',
          avatarUrl: loaded.avatarUrl || prev.avatarUrl || '',
        };
      });
    },
    [userMemoriesTarget?.handle, userMemoriesTarget?.name],
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
  const currentMemoryId =
    detailMemory?.id ||
    lockedMemory?.id ||
    panels.right?.payload?.memoryId ||
    panels.right?.payload?.memory?.id ||
    null;
  const showMemoryBack =
    (rightView === 'memoryDetails' || rightView === 'lockedMemory') &&
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
        (
          <Button
            variant="primary"
            onClick={() =>
              handleOpenExternalMap({
                stops: journeyStopPoints,
                title: journeyTitle,
              })
            }
          >
            Google Maps
          </Button>
        ),
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
                  return `${memory.title} ${memory.shortDescription || ''}`
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
      const profileTitle = '';
      const profileLeading = (
        <div className="profile-header profile-header--panel">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="profile-header__avatar" />
          ) : (
            <div className="profile-header__avatar profile-header__avatar--fallback">
              {(user?.name || normalizedUserHandle || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="profile-header__meta">
            <div className="profile-header__handle">@{normalizedUserHandle || 'profile'}</div>
            {user?.name && <div className="profile-header__name">{user.name}</div>}
          </div>
        </div>
      );
      return renderPanel(
        profileTitle,
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
            defaultJourneyId={profileJourneyState.id}
            defaultJourneyScroll={profileJourneyState.scrollTop}
            onJourneyViewChange={({ journeyId, scrollTop }) =>
              setProfileJourneyState({ id: journeyId, scrollTop: scrollTop || 0 })
            }
            onOpenJourneyPanel={({ journeyId, journeyTitle, journeyListScroll }) => {
              setProfileJourneyState({
                id: journeyId,
                scrollTop: journeyListScroll || profileJourneyState.scrollTop || 0,
              });
              openJourneyPanel({ journeyId, journeyTitle, ownerHandle: normalizedUserHandle });
            }}
          />
        ),
        profileLeading,
      );
    }

    if (leftView === 'userProfile') {
      const normalizedTargetHandle = normalizeHandle(userProfileHandle || userMemoriesTarget?.handle || '');
      const targetName = userMemoriesTarget?.name || userProfileMeta?.name || '';
      const targetAvatar = userProfileMeta?.avatarUrl || '';
      const canFollowProfile =
        Boolean(user) && normalizedTargetHandle && normalizedTargetHandle !== normalizedUserHandle;
      const isFollowingProfile = canFollowProfile && isFollowingTarget(normalizedTargetHandle, null);
      const toggleFollowProfile = async () => {
        if (!canFollowProfile) return;
        if (isFollowingTarget(normalizedTargetHandle, null)) {
          await unfollowUser({ handle: normalizedTargetHandle });
        } else {
          await followHandle(normalizedTargetHandle);
        }
      };
      const userProfileLeading = (
        <div className="profile-header profile-header--panel">
          {targetAvatar ? (
            <img src={targetAvatar} alt="" className="profile-header__avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="profile-header__avatar profile-header__avatar--fallback">
              {(targetName || normalizedTargetHandle || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="profile-header__meta">
            <div className="profile-header__handle">
              @{normalizedTargetHandle || userProfileHandle || 'profile'}
            </div>
            {(targetName || userProfileMeta?.name) && (
              <div className="profile-header__name">{targetName || userProfileMeta?.name}</div>
            )}
          </div>
        </div>
      );
      return renderPanel(
        '',
        () => goBackFromUserProfile(),
        canFollowProfile ? (
          <Button
            variant={isFollowingProfile ? 'ghost' : 'primary'}
            className="btn-sm"
            onClick={toggleFollowProfile}
          >
            {isFollowingProfile ? 'Unfollow' : 'Follow'}
          </Button>
        ) : null,
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
            defaultJourneyId={userProfileJourneyState.id}
            defaultJourneyScroll={userProfileJourneyState.scrollTop}
            onJourneyViewChange={({ journeyId, scrollTop }) =>
              setUserProfileJourneyState({ id: journeyId, scrollTop: scrollTop || 0 })
            }
            onOpenJourneyPanel={({ journeyId, journeyTitle }) =>
              openJourneyPanel({ journeyId, journeyTitle, ownerHandle: userMemoriesTarget?.handle })
            }
            onClose={() => goBackFromUserProfile()}
            onProfileLoaded={(loaded) => handleProfileLoaded(loaded, normalizedTargetHandle)}
          />
        ),
        userProfileLeading,
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
    handleOpenExternalMap,
    journeyStopPoints,
    journeyMemories,
    journeyVisibilityMap,
    isFollowingTarget,
    unfollowUser,
    followHandle,
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
    userMemoriesTarget?.name,
    user,
    profileJourneyState,
    userProfileJourneyState,
    userProfileMeta,
    handleProfileLoaded,
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
    if (rightView === 'lockedMemory') {
      const locked = lockedMemory || panels.right?.payload?.memory || null;
      const followProps = buildFollowProps(locked);
      return renderPanel(
        locked?.title || 'Locked memory',
        () => {
          setLockedMemory(null);
          resetRightPanel();
        },
        showMemoryBack ? (
          <Button variant="ghost" onClick={goBackRightPanel}>
            Back
          </Button>
        ) : null,
        locked ? (
          <LockedMemoryDetails
            memory={locked}
            canAttemptUnlock={canUnlock}
            isUnlocking={unlocking}
            error={unlockError}
            passcode={unlockPasscode}
            onPasscodeChange={setUnlockPasscode}
            onUnlock={handleUnlock}
            locationStatus={lockedLocationStatus}
            followerStatus={lockedFollowerStatus}
            onRetryLocation={requestLocation}
            onViewProfile={openProfileFromList}
            canFollowOwner={followProps.canFollowOwner}
            isFollowingOwner={followProps.isFollowingOwner}
            onToggleFollowOwner={followProps.onToggleFollowOwner}
          />
        ) : (
          <div className="empty-state">Select a memory.</div>
        ),
      );
    }

    if (rightView === 'memoryDetails') {
      const followProps = buildFollowProps(detailMemory);
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
                onOpenExternal={handleOpenExternalMap}
                onToggleSave={(mem, next) => handleToggleSave(mem, next)}
                canFollowOwner={followProps.canFollowOwner}
                isFollowingOwner={followProps.isFollowingOwner}
                onToggleFollowOwner={followProps.onToggleFollowOwner}
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
    buildFollowProps,
    handleOpenExternalMap,
    clusterGroup,
    processMemorySelection,
    handleToggleSave,
    lockedMemory,
    panels.right,
    canUnlock,
    unlocking,
    unlockError,
    unlockPasscode,
    handleUnlock,
    lockedLocationStatus,
    lockedFollowerStatus,
    requestLocation,
    socialMode,
    openFollowersPanel,
    socialHandle,
    openFollowingPanel,
    memoriesForHandle.placed,
    memoriesForHandle.found,
    activeMemoriesHandle,
    showRightBack,
    showMemoryBack,
    openMemoryDetails,
  ]);

  const mapProps = useMemo(
    () => ({
      userLocation,
      locationError,
      onRetryLocation: handleCenterOnUser,
      memories: filteredMemories,
      onSelectGroup: handleGroupSelection,
      focusBounds,
      journeyPaths: activeJourneyPaths,
      highlightedMemoryIds: highlightedJourneyMemoryIds,
      navigationRequest: null,
      onRouteComputed: undefined,
      isLocating: isRequestingLocation,
    }),
    [
      userLocation,
      locationError,
      handleCenterOnUser,
      filteredMemories,
      handleGroupSelection,
      focusBounds,
      activeJourneyPaths,
      highlightedJourneyMemoryIds,
      isRequestingLocation,
    ],
  );

  const disablePlaceMemory = !canPlaceMemory || !hasUserLocation;

  return (
    <div className="app-shell">
      <div className="app-shell__map">
        <MapView {...mapProps} />
      </div>

      <div className="app-shell__overlay">
        <div className="shell-top-nav">
          <button type="button" className="shell-brand shell-brand--button" aria-label="mempin home">
            <span className="shell-brand__mem">mem</span>
            <span className="shell-brand__pin">pin</span>
          </button>
          <TopRightActions
            filters={filters}
            isFilterOpen={isFilterOpen}
            onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onResetFilters={resetFilters}
            onSelectOwnership={(value) => setFilters((prev) => ({ ...prev, ownership: value }))}
            onSelectJourneyType={(value) => setFilters((prev) => ({ ...prev, journey: value }))}
            onSelectMedia={(value) => setFilters((prev) => ({ ...prev, media: value }))}
            onToggleVisibilityFilter={toggleVisibilityFilter}
            onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            onCenterOnUser={handleCenterOnUser}
            isLocating={isRequestingLocation}
            hasLocation={hasUserLocation}
          />
        </div>

        <div className="shell-panels">
          <div className={`shell-panel-slot shell-panel-slot--left ${leftContent ? 'is-active rounded-xs' : 'is-empty'}`}>
            {leftContent ? <div className="shell-panel shell-panel--left">{leftContent}</div> : null}
          </div>
          <div className={`shell-panel-slot shell-panel-slot--center ${centerContent ? 'is-active rounded-xs' : 'is-empty'}`}>
            {centerContent ? <div className="shell-panel shell-panel--center">{centerContent}</div> : null}
          </div>
          <div className={`shell-panel-slot shell-panel-slot--right ${rightContent ? 'is-active rounded-xs' : 'is-empty'}`}>
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
