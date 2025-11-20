import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext({
  activePanel: null,
  isMemoriesPanelOpen: false,
  isProfilePanelOpen: false,
  isFollowersPanelOpen: false,
  isJourneysPanelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  openMemoriesPanel: () => {},
  closeMemoriesPanel: () => {},
  openProfilePanel: () => {},
  openFollowersPanel: () => {},
  openJourneysPanel: () => {},
});

export function UIProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = useCallback((panel) => setActivePanel(panel), []);
  const closePanel = useCallback(() => setActivePanel(null), []);
  const openMemoriesPanel = useCallback(() => openPanel('memories'), [openPanel]);
  const openProfilePanel = useCallback(() => openPanel('profile'), [openPanel]);
  const openFollowersPanel = useCallback(() => openPanel('followers'), [openPanel]);
  const openJourneysPanel = useCallback(() => openPanel('journeys'), [openPanel]);

  const value = useMemo(
    () => ({
      activePanel,
      isMemoriesPanelOpen: activePanel === 'memories',
      isProfilePanelOpen: activePanel === 'profile',
      isFollowersPanelOpen: activePanel === 'followers',
      isJourneysPanelOpen: activePanel === 'journeys',
      openPanel,
      closePanel,
      openMemoriesPanel,
      closeMemoriesPanel: closePanel,
      openProfilePanel,
      openFollowersPanel,
      openJourneysPanel,
    }),
    [
      activePanel,
      openPanel,
      closePanel,
      openMemoriesPanel,
      openProfilePanel,
      openFollowersPanel,
      openJourneysPanel,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
