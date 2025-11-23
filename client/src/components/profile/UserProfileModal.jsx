import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

function UserProfileModal({
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

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError('');
    api
      .getUserProfile(handle)
      .then((data) => setProfile(data.user || null))
      .catch((err) => setError(err.message || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleFollowClick = () => {
    if (!handle) return;
    if (isFollowing) {
      onUnfollow?.(profile);
    } else {
      onFollow?.(profile);
    }
  };

  const showFollowButton = Boolean(onFollow || onUnfollow);
  const followLabel = isFollowing ? 'Unfollow' : '';

  return (
    <Modal isOpen={Boolean(handle)} onClose={onClose}>
      <div className="panel-card profile-modal">
        {loading && <p>Loading profile...</p>}
        {error && <p className="error-text">{error}</p>}
        {profile && (
          <>
            <h3>{profile.name || `@${profile.handle}`}</h3>
            <p>{profile.handle ? `@${profile.handle}` : ''}</p>
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
            <div className="profile-actions">
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
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default UserProfileModal;
