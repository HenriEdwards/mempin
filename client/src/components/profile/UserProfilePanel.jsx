import { useEffect, useState } from 'react';
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
  defaultJourneyId = null,
  defaultJourneyScroll = 0,
  onJourneyViewChange,
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="profile-page profile-page--public">
      {loading && <p>Loading profile...</p>}
      {error && <p className="error-text">{error}</p>}
      {profile && (
        <>
          <ProfileTabsContent
            isOpen={isOpen}
            profileHandle={profile?.handle || ''}
            stats={profile?.stats || {}}
            placedMemories={placedMemories}
            foundMemories={foundMemories}
            journeys={journeys}
            journeyMemories={journeyMemories}
            onSelectMemory={onSelectMemory}
            onOpenProfile={onOpenProfile}
            onOpenJourneyPanel={onOpenJourneyPanel}
            followingTabProps={{ hideSuggestions: true, profileHandle: profile?.handle || '' }}
            showSaved={false}
            avatarUrl={profile?.avatarUrl || ''}
            displayName={profile?.name || ''}
            showProfileHeader={false}
            defaultJourneyId={defaultJourneyId}
            defaultJourneyScroll={defaultJourneyScroll}
            onJourneyViewChange={onJourneyViewChange}
          />
        </>
      )}
    </div>
  );
}

export default UserProfilePanel;
