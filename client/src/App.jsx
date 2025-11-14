import { Routes, Route, Navigate } from 'react-router-dom';
import MapPage from './pages/MapPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import MemorySharePage from './pages/MemorySharePage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import MainLayout from './components/layout/MainLayout.jsx';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/m/:id" element={<MemorySharePage />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MapPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="friends" element={<FriendsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
