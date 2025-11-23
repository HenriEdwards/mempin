import { useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

function UserProfilePanel({
  isOpen,
  handle,
  isFollowing = false,
  onFollow,
  onUnfollow,
  onViewMemories,
  onViewJourneys,
  onClose,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  useEffect(() => {
    setLocalFollowing(isFollowing);
  }, [isFollowing]);

  useEffect(() => {
    if (!isOpen || !handle) return;
    setLoading(true);
    setError('');
    api
      .getUserProfile(handle)
      .then((data) => setProfile(data.user || null))
      .catch((err) => setError(err.message || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, [handle, isOpen]);

  const showFollowButton = Boolean(onFollow || onUnfollow);
  const followLabel = localFollowing ? 'Unfollow' : 'Follow';

  const handleFollowClick = async () => {
    if (!handle) return;
    if (localFollowing) {
      await onUnfollow?.(profile);
      setLocalFollowing(false);
    } else {
      await onFollow?.(profile);
      setLocalFollowing(true);
    }
  };

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Profile" width="480px">
      <div className="panel-card profile-page profile-page--public">
        {loading && <p>Loading profile...</p>}
        {error && <p className="error-text">{error}</p>}
        {profile && (
          <>
            <h2>{profile.name || `@${profile.handle}`}</h2>
            <p className="muted">{profile.handle ? `@${profile.handle}` : ''}</p>
            {profile.email && <p className="muted-text">{profile.email}</p>}
            <div className="profile-stats">
              <div>
                <span>Followers</span>
                <strong>{profile.stats?.followerCount ?? 0}</strong>
              </div>
              <div>
                <span>Following</span>
                <strong>{profile.stats?.followingCount ?? 0}</strong>
              </div>
              <div>
                <span>Memories placed</span>
                <strong>{profile.stats?.placedCount ?? 0}</strong>
              </div>
            </div>
            <div className="profile-actions profile-actions--inline">
              {showFollowButton && (
                <Button variant="primary" onClick={handleFollowClick}>
                  {followLabel}
                </Button>
              )}
              <Button variant="outline" onClick={() => onViewMemories?.(profile)}>
                View memories
              </Button>
              <Button variant="outline" onClick={() => onViewJourneys?.(profile)}>
                View journeys
              </Button>
            </div>
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default UserProfilePanel;
