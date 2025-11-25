import { useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';
import ProfileTabsContent from './ProfileTabsContent.jsx';

function UserProfilePanel({
  isOpen,
  handle,
  isFollowing = false,
  onFollow,
  onUnfollow,
  onViewMemories,
  onViewJourneys,
  onClose,
  placedMemories = [],
  foundMemories = [],
  journeys = [],
  onSelectMemory,
  onOpenProfile,
  journeyMemories = {},
  journeyVisibilityMap = {},
  onOpenJourneyPanel,
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
  const placedCount = profile?.stats?.placedCount ?? 0;
  const foundCount = profile?.stats?.foundCount ?? 0;
  const followerCount = profile?.stats?.followerCount ?? 0;

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
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="" hideHeader width="480px">
      <div className="profile-page profile-page--public">
        {loading && <p>Loading profile...</p>}
        {error && <p className="error-text">{error}</p>}
        {profile && (
          <>
            {/* <h2>{profile.name || `@${profile.handle}`}</h2> */}
            <ProfileTabsContent
              isOpen={isOpen}
              profileHandle={profile?.handle || ''}
              stats={profile?.stats || {}}
              placedMemories={placedMemories}
              foundMemories={foundMemories}
              journeys={journeys}
              journeyMemories={journeyMemories}
              journeyVisibilityMap={journeyVisibilityMap}
              onSelectMemory={onSelectMemory}
              onOpenProfile={onOpenProfile}
              onOpenJourneyPanel={onOpenJourneyPanel}
              followingTabProps={{ hideSuggestions: true, profileHandle: profile?.handle || '' }}
            />
          </>
        )}
      </div>
      <button
        type="button"
        className="profile-back-button"
        onClick={onClose}
        aria-label="Back to map"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
          <path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z" />
        </svg>
      </button>
    </SlidingPanel>
  );
}

export default UserProfilePanel;
