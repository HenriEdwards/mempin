import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { normalizeHandle } from '../utils/handles.js';

const panelTemplate = {
  left: { view: null, payload: null },
  center: { view: null, payload: null },
  right: { view: null, payload: null },
};

function createDefaultPanels() {
  return {
    left: { ...panelTemplate.left },
    center: { ...panelTemplate.center },
    right: { ...panelTemplate.right },
  };
}

const UIContext = createContext({
  panels: panelTemplate,
  leftView: null,
  centerView: null,
  rightView: null,
  rightHistory: [],
  userProfileHandle: '',
  userProfileActions: {
    isFollowing: false,
    onFollow: null,
    onUnfollow: null,
  },
  openPanel: () => {},
  closePanel: () => {},
  openProfilePanel: () => {},
  openUserProfilePanel: () => {},
  goBackFromUserProfile: () => {},
  openMemoriesPanel: () => {},
  openFollowersPanel: () => {},
  openFollowingPanel: () => {},
  openSocialPanel: () => {},
  openMemoryDetailsPanel: () => {},
  openLockedMemoryPanel: () => {},
  openClusterPanel: () => {},
  openCreateMemoryPanel: () => {},
  openPricingPanel: () => {},
  resetRightPanel: () => {},
  goBackRightPanel: () => {},
  closeLeftPanel: () => {},
  closeCenterPanel: () => {},
});

export function UIProvider({ children }) {
  const [panels, setPanels] = useState(() => createDefaultPanels());
  const [rightHistory, setRightHistory] = useState([]);
  const [leftHistory, setLeftHistory] = useState(null);
  const [userProfileHandle, setUserProfileHandle] = useState('');
  const [userProfileActions, setUserProfileActions] = useState({
    isFollowing: false,
    onFollow: null,
    onUnfollow: null,
  });

  const closeLeftPanel = useCallback(() => {
    setPanels((prev) => ({ ...prev, left: panelTemplate.left }));
    setLeftHistory(null);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, []);

  const closeCenterPanel = useCallback(() => {
    setPanels((prev) => ({ ...prev, center: panelTemplate.center }));
  }, []);

  const resetRightPanel = useCallback(() => {
    setRightHistory([]);
    setPanels((prev) => ({ ...prev, right: panelTemplate.right }));
  }, []);

  const goBackRightPanel = useCallback(() => {
    setRightHistory((history) => {
      if (!history.length) {
        setPanels((prev) => ({ ...prev, right: panelTemplate.right }));
        return [];
      }
      const nextHistory = [...history];
      const previous = nextHistory.pop();
      setPanels((prev) => ({ ...prev, right: previous || panelTemplate.right }));
      return nextHistory;
    });
  }, []);

  const openProfilePanel = useCallback(() => {
    setLeftHistory(null);
    setPanels((prev) => ({ ...prev, left: { view: 'profile', payload: null } }));
  }, []);

  const openUserProfilePanel = useCallback((handle, actions = {}) => {
    const normalized = normalizeHandle(handle);
    if (!normalized) return;
    setPanels((prev) => {
      setLeftHistory(null);
      return {
        ...prev,
        left: { view: 'userProfile', payload: { handle: normalized } },
      };
    });
    setUserProfileHandle(normalized);
    setUserProfileActions({
      isFollowing: Boolean(actions.isFollowing),
      onFollow: actions.onFollow || null,
      onUnfollow: actions.onUnfollow || null,
    });
  }, []);

  const goBackFromUserProfile = useCallback(() => {
    setPanels((prev) => ({ ...prev, left: panelTemplate.left }));
    setLeftHistory(null);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, []);

  const openMemoriesPanel = useCallback(
    (payload = null) => {
      setRightHistory([]);
      setPanels((prev) => ({ ...prev, right: { view: 'memories', payload } }));
    },
    [],
  );

  const openSocialPanel = useCallback(
    (mode = 'followers', handle = '') => {
      setRightHistory([]);
      setPanels((prev) => ({
        ...prev,
        right: { view: 'social', payload: { mode, handle: normalizeHandle(handle) || null } },
      }));
    },
    [],
  );

  const openFollowersPanel = useCallback((handle) => openSocialPanel('followers', handle), [openSocialPanel]);
  const openFollowingPanel = useCallback((handle) => openSocialPanel('following', handle), [openSocialPanel]);

  const openClusterPanel = useCallback((group) => {
    setRightHistory([]);
    setPanels((prev) => ({ ...prev, right: { view: 'cluster', payload: group || null } }));
  }, []);

  const openMemoryDetailsPanel = useCallback((payload, options = {}) => {
    setPanels((prev) => {
      if (options.pushHistory) {
        setRightHistory((history) => [...history, prev.right]);
      }
      return {
        ...prev,
        right: { view: 'memoryDetails', payload },
      };
    });
  }, []);

  const openLockedMemoryPanel = useCallback((payload, options = {}) => {
    setPanels((prev) => {
      if (options.pushHistory) {
        setRightHistory((history) => [...history, prev.right]);
      }
      return {
        ...prev,
        right: { view: 'lockedMemory', payload },
      };
    });
  }, []);

  const openCreateMemoryPanel = useCallback(() => {
    setPanels((prev) => ({ ...prev, center: { view: 'newMemory', payload: null } }));
  }, []);

  const openPricingPanel = useCallback(() => {
    setPanels((prev) => ({ ...prev, center: { view: 'pricing', payload: null } }));
  }, []);

  const openPanel = useCallback(
    (panel) => {
      switch (panel) {
        case 'profile':
          openProfilePanel();
          break;
        case 'followers':
        case 'followersList':
          openFollowersPanel();
          break;
        case 'following':
        case 'followingList':
          openFollowingPanel();
          break;
        case 'memories':
          openMemoriesPanel();
          break;
        case 'pricing':
          openPricingPanel();
          break;
        case 'newMemory':
          openCreateMemoryPanel();
          break;
        default:
          break;
      }
    },
    [openProfilePanel, openFollowersPanel, openFollowingPanel, openMemoriesPanel, openPricingPanel, openCreateMemoryPanel],
  );

  const closePanel = useCallback(() => {
    setPanels(createDefaultPanels());
    setLeftHistory(null);
    setRightHistory([]);
    setUserProfileHandle('');
    setUserProfileActions({
      isFollowing: false,
      onFollow: null,
      onUnfollow: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      panels,
      leftView: panels.left.view,
      centerView: panels.center.view,
      rightView: panels.right.view,
      rightHistory,
      userProfileHandle,
      userProfileActions,
      openPanel,
      closePanel,
      openProfilePanel,
      openUserProfilePanel,
      goBackFromUserProfile,
      openMemoriesPanel,
      openFollowersPanel,
      openFollowingPanel,
      openSocialPanel,
      openMemoryDetailsPanel,
      openLockedMemoryPanel,
      openClusterPanel,
      openCreateMemoryPanel,
      openPricingPanel,
      resetRightPanel,
      goBackRightPanel,
      closeLeftPanel,
      closeCenterPanel,
    }),
    [
      panels,
      rightHistory,
      userProfileHandle,
      userProfileActions,
      openPanel,
      closePanel,
      openProfilePanel,
      openUserProfilePanel,
      goBackFromUserProfile,
      openMemoriesPanel,
      openFollowersPanel,
      openFollowingPanel,
      openSocialPanel,
      openMemoryDetailsPanel,
      openLockedMemoryPanel,
      openClusterPanel,
      openCreateMemoryPanel,
      openPricingPanel,
      resetRightPanel,
      goBackRightPanel,
      closeLeftPanel,
      closeCenterPanel,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
