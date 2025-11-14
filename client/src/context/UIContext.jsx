import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext({
  isMemoriesPanelOpen: false,
  openMemoriesPanel: () => {},
  closeMemoriesPanel: () => {},
});

export function UIProvider({ children }) {
  const [isMemoriesPanelOpen, setMemoriesPanelOpen] = useState(false);

  const openMemoriesPanel = useCallback(() => setMemoriesPanelOpen(true), []);
  const closeMemoriesPanel = useCallback(() => setMemoriesPanelOpen(false), []);

  const value = useMemo(
    () => ({
      isMemoriesPanelOpen,
      openMemoriesPanel,
      closeMemoriesPanel,
    }),
    [isMemoriesPanelOpen, openMemoriesPanel, closeMemoriesPanel],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
