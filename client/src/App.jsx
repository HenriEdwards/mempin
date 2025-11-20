import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MapPage from './pages/MapPage.jsx';
import MemorySharePage from './pages/MemorySharePage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import { useUI } from './context/UIContext.jsx';

function PanelRoute({ panel }) {
  const navigate = useNavigate();
  const { openPanel } = useUI();

  useEffect(() => {
    openPanel(panel);
    navigate('/', { replace: true });
  }, [navigate, openPanel, panel]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/m/:id" element={<MemorySharePage />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MapPage />} />
              <Route path="profile" element={<PanelRoute panel="profile" />} />
              <Route path="followers" element={<PanelRoute panel="followers" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
