import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import MemoryDetailsContent from '../components/memory/MemoryDetailsContent.jsx';
import api from '../services/api.js';

function MemorySharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, status: authStatus } = useAuth();
  const [memory, setMemory] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('idle');

  const attemptUnlock = useCallback(() => {
    if (!user) {
      setError('Please sign in to unlock this memory.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      return;
    }
    setProgress('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProgress('unlocking');
        api
          .unlockMemory(id, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          .then((response) => {
            setMemory(response.memory);
            setError('');
            setProgress('success');
          })
          .catch((err) => {
            setError(err.message || 'Unable to unlock memory');
            setProgress('error');
          });
      },
      (geoError) => {
        setError(geoError.message || 'Unable to get location');
        setProgress('error');
      },
      { enableHighAccuracy: true },
    );
  }, [id, user]);

  useEffect(() => {
    if (authStatus !== 'ready') return;
    attemptUnlock();
  }, [attemptUnlock, authStatus]);

  return (
    <div className="share-page">
      <div className="share-card">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← Back to map
        </Button>
        <h2>Shared memory</h2>
        {!user && (
          <div className="empty-state">
            <p>Sign in to unlock this memory.</p>
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = `${api.API_BASE_URL}/auth/google`;
              }}
            >
              Sign in with Google
            </Button>
          </div>
        )}
        {user && progress === 'unlocking' && <p>Unlocking memory...</p>}
        {memory && <MemoryDetailsContent memory={memory} onGenerateQR={null} />}
        {error && (
          <div className="error-text">
            <p>{error}</p>
            <Button variant="primary" onClick={attemptUnlock}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemorySharePage;
