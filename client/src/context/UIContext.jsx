import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { normalizeHandle } from '../utils/handles';

const UIContext = createContext({
  activePanel: null,
  isMemoriesPanelOpen: false,
  isProfilePanelOpen: false,
  isFollowersPanelOpen: false,
  isJourneysPanelOpen: false,
  isUserProfilePanelOpen: false,
  userProfileHandle: '',
  userProfileActions: {
    isFollowing: false,
    onFollow: null,
    onUnfollow: null,
  },
  openPanel: () => {},
  closePanel: () => {},
  openMemoriesPanel: () => {},
  closeMemoriesPanel: () => {},
  openProfilePanel: () => {},
  openFollowersPanel: () => {},
  openJourneysPanel: () => {},
  openUserProfilePanel: () => {},
});

export function UIProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);
  const [userProfileHandle, setUserProfileHandle] = useState('');
  const [userProfileActions, setUserProfileActions] = useState({
    isFollowing: false,
    onFollow: null,
    onUnfollow: null,
  });

  const openPanel = useCallback((panel) => setActivePanel(panel), []);
  const closePanel = useCallback(() => {
    setActivePanel(null);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, []);
  const openMemoriesPanel = useCallback(() => openPanel('memories'), [openPanel]);
  const openProfilePanel = useCallback(() => openPanel('profile'), [openPanel]);
  const openFollowersPanel = useCallback(() => openPanel('followers'), [openPanel]);
  const openJourneysPanel = useCallback(() => openPanel('journeys'), [openPanel]);
  const openUserProfilePanel = useCallback(
    (handle, actions = {}) => {
      const normalized = normalizeHandle(handle);
      if (!normalized) return;
      setUserProfileHandle(normalized);
      setUserProfileActions({
        isFollowing: Boolean(actions.isFollowing),
        onFollow: actions.onFollow || null,
        onUnfollow: actions.onUnfollow || null,
      });
      openPanel('userProfile');
    },
    [openPanel],
  );

  const value = useMemo(
    () => ({
      activePanel,
      isMemoriesPanelOpen: activePanel === 'memories',
      isProfilePanelOpen: activePanel === 'profile',
      isFollowersPanelOpen: activePanel === 'followers',
      isJourneysPanelOpen: activePanel === 'journeys',
      isUserProfilePanelOpen: activePanel === 'userProfile',
      userProfileHandle,
      userProfileActions,
      openPanel,
      closePanel,
      openMemoriesPanel,
      closeMemoriesPanel: closePanel,
      openProfilePanel,
      openFollowersPanel,
      openJourneysPanel,
      openUserProfilePanel,
    }),
    [
      activePanel,
      openPanel,
      closePanel,
      openMemoriesPanel,
      openProfilePanel,
      openFollowersPanel,
      openJourneysPanel,
      userProfileHandle,
      userProfileActions,
      openUserProfilePanel,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
