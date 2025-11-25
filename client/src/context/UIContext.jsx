import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { normalizeHandle } from '../utils/handles';

const UIContext = createContext({
  activePanel: null,
  isMemoriesPanelOpen: false,
  isProfilePanelOpen: false,
  isFollowersPanelOpen: false,
  isJourneysPanelOpen: false,
  isFollowersPanelOpen: false,
  isFollowingPanelOpen: false,
  isUserProfilePanelOpen: false,
  isUserMemoriesPanelOpen: false,
  isUserJourneysPanelOpen: false,
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
  openFollowingPanel: () => {},
  openJourneysPanel: () => {},
  openUserProfilePanel: () => {},
  openUserMemoriesPanel: () => {},
  openUserJourneysPanel: () => {},
});

export function UIProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);
  const [previousPanel, setPreviousPanel] = useState(null);
  const [userProfileHandle, setUserProfileHandle] = useState('');
  const [userProfileActions, setUserProfileActions] = useState({
    isFollowing: false,
    onFollow: null,
    onUnfollow: null,
  });

  const openPanel = useCallback((panel) => {
    setActivePanel((current) => {
      if (panel === current) return current;
      setPreviousPanel(current);
      return panel;
    });
  }, []);
  const closePanel = useCallback(() => {
    setActivePanel(null);
    setPreviousPanel(null);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, []);
  const goBackFromUserProfile = useCallback(() => {
    setActivePanel((current) => {
      if (current === 'userProfile' && previousPanel) {
        return previousPanel;
      }
      return null;
    });
    setPreviousPanel(null);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, [previousPanel]);
  const openMemoriesPanel = useCallback(() => openPanel('memories'), [openPanel]);
  const openProfilePanel = useCallback(() => openPanel('profile'), [openPanel]);
  const openFollowersPanel = useCallback(() => {
    setActivePanel((current) => (current === 'followersList' ? null : 'followersList'));
  }, []);
  const openFollowingPanel = useCallback(() => {
    setActivePanel((current) => (current === 'followingList' ? null : 'followingList'));
  }, []);
  const openJourneysPanel = useCallback(() => openPanel('journeys'), [openPanel]);
  const openUserMemoriesPanel = useCallback(() => openPanel('userMemories'), [openPanel]);
  const openUserJourneysPanel = useCallback(() => openPanel('userJourneys'), [openPanel]);
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
      isFollowersPanelOpen: activePanel === 'followersList',
      isFollowingPanelOpen: activePanel === 'followingList',
      isUserProfilePanelOpen: activePanel === 'userProfile',
      isUserMemoriesPanelOpen: activePanel === 'userMemories',
      isUserJourneysPanelOpen: activePanel === 'userJourneys',
      userProfileHandle,
      userProfileActions,
      openPanel,
      closePanel,
      goBackFromUserProfile,
      openMemoriesPanel,
      closeMemoriesPanel: closePanel,
      openProfilePanel,
      openFollowersPanel,
      openFollowingPanel,
      openFollowersPanel,
      openJourneysPanel,
      openUserProfilePanel,
      openUserMemoriesPanel,
      openUserJourneysPanel,
    }),
    [
      activePanel,
      openPanel,
      closePanel,
      goBackFromUserProfile,
      openMemoriesPanel,
      openProfilePanel,
      openFollowersPanel,
      openJourneysPanel,
      openFollowersPanel,
      openFollowingPanel,
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
