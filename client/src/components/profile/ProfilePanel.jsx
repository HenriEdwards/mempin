import { useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { getHandleError, normalizeHandle } from '../../utils/handles.js';

function ProfilePanel({ isOpen, onClose }) {
  const { user, refresh } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handleValue, setHandleValue] = useState('');
  const [handleStatus, setHandleStatus] = useState('');
  const [handleSaving, setHandleSaving] = useState(false);
  const canEditHandle = !user?.handle;

  useEffect(() => {
    if (!isOpen || !user) {
      if (!user) {
        setStats(null);
      }
      return;
    }
    setLoading(true);
    api
      .getUserStats()
      .then((data) => {
        setStats(data.stats);
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load stats'))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  useEffect(() => {
    setHandleValue(user?.handle || '');
    setHandleStatus('');
  }, [user]);

  const handleHandleSave = async () => {
    if (!canEditHandle) return;
    const validationError = getHandleError(handleValue);
    if (validationError) {
      setHandleStatus(validationError);
      return;
    }
    setHandleSaving(true);
    try {
      await api.updateHandle(normalizeHandle(handleValue));
      await refresh();
      setHandleStatus('Handle saved');
    } catch (err) {
      setHandleStatus(err.message || 'Unable to update handle');
    } finally {
      setHandleSaving(false);
    }
  };

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Profile" width="480px">
      <div className="panel-card profile-page">
        {!user ? (
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = `${api.API_BASE_URL}/auth/google`;
            }}
          >
            Sign in with Google
          </Button>
        ) : (
          <>
            <h2>Profile</h2>
            <p>{user.name}</p>
            <p>{user.email}</p>
            <div className="profile-section">
              <h4>Handle</h4>
              {canEditHandle ? (
                <div className="profile-handle">
                  <Input
                    value={handleValue}
                    onChange={(event) => {
                      setHandleValue(event.target.value);
                      setHandleStatus('');
                    }}
                    placeholder="@yourname"
                  />
                  <Button onClick={handleHandleSave} disabled={handleSaving}>
                    {handleSaving ? 'Saving...' : 'Set handle'}
                  </Button>
                </div>
              ) : (
                <div className="profile-handle">
                  <Input value={`@${user.handle}`} readOnly disabled />
                  <Button variant="ghost" disabled>
                    Locked
                  </Button>
                </div>
              )}
              {handleStatus && <small>{handleStatus}</small>}
            </div>
            {loading && <p>Loading stats...</p>}
            {error && <p className="error-text">{error}</p>}
            {stats && (
              <div className="profile-stats">
                <div>
                  <span>Memories placed</span>
                  <strong>{stats.placedCount}</strong>
                </div>
                <div>
                  <span>Memories found</span>
                  <strong>{stats.foundCount}</strong>
                </div>
                <div>
                  <span>Total views on my memories</span>
                  <strong>{stats.totalViewsOnMyMemories}</strong>
                </div>
                <div>
                  <span>Followers</span>
                  <strong>{stats.followerCount}</strong>
                </div>
              </div>
            )}
            {stats?.latestPlaced && (
              <div className="profile-section">
                <h4>Latest placed memory</h4>
                <p>{stats.latestPlaced.title}</p>
                <small>{stats.latestPlaced.shortDescription}</small>
              </div>
            )}
            {stats?.latestFound && (
              <div className="profile-section">
                <h4>Latest memory you unlocked</h4>
                <p>{stats.latestFound.title}</p>
                <small>
                  {stats.latestFound.shortDescription || 'Unlocked recently'}
                </small>
              </div>
            )}
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default ProfilePanel;
