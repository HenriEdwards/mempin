import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext({
  activePanel: null,
  isMemoriesPanelOpen: false,
  isProfilePanelOpen: false,
  isFriendsPanelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  openMemoriesPanel: () => {},
  closeMemoriesPanel: () => {},
  openProfilePanel: () => {},
  openFriendsPanel: () => {},
});

export function UIProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = useCallback((panel) => setActivePanel(panel), []);
  const closePanel = useCallback(() => setActivePanel(null), []);
  const openMemoriesPanel = useCallback(() => openPanel('memories'), [openPanel]);
  const openProfilePanel = useCallback(() => openPanel('profile'), [openPanel]);
  const openFriendsPanel = useCallback(() => openPanel('friends'), [openPanel]);

  const value = useMemo(
    () => ({
      activePanel,
      isMemoriesPanelOpen: activePanel === 'memories',
      isProfilePanelOpen: activePanel === 'profile',
      isFriendsPanelOpen: activePanel === 'friends',
      openPanel,
      closePanel,
      openMemoriesPanel,
      closeMemoriesPanel: closePanel,
      openProfilePanel,
      openFriendsPanel,
    }),
    [
      activePanel,
      openPanel,
      closePanel,
      openMemoriesPanel,
      openProfilePanel,
      openFriendsPanel,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
