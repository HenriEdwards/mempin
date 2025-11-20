import { useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';

function ProfilePanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Profile" width="420px">
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
