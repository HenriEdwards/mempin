import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../services/api.js';

const AuthContext = createContext({
  user: null,
  status: 'loading',
  isGuest: false,
  loginAsGuest: () => {},
  logout: () => {},
  refresh: () => {},
});

const GUEST_KEY = 'mempin_guest_mode';

function loadGuestPreference() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(GUEST_KEY) === '1';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [isGuest, setIsGuest] = useState(loadGuestPreference);

  const fetchProfile = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
      if (data.user) {
        setIsGuest(false);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(GUEST_KEY);
        }
      }
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err.message || 'Unable to load session');
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loginAsGuest = useCallback(() => {
    setIsGuest(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUEST_KEY, '1');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // swallow logout errors for now
    } finally {
      setUser(null);
      setIsGuest(false);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(GUEST_KEY);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isGuest,
      loginAsGuest,
      logout,
      refresh: fetchProfile,
    }),
    [user, status, error, isGuest, loginAsGuest, logout, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
