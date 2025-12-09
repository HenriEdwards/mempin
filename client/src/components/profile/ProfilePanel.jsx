import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import ProfileTabsContent from './ProfileTabsContent.jsx';

function ProfilePanel({
  isOpen,
  onClose,
  placedMemories = [],
  foundMemories = [],
  savedMemories = [],
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

  const profileHandle = user?.handle || '';
  const profilePageClassName = user
    ? 'profile-page profile-page--public'
    : 'profile-page profile-page--public profile-page--guest';

  if (!isOpen) {
    return null;
  }

  return (
    <div className={profilePageClassName}>
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
          <ProfileTabsContent
            isOpen={isOpen}
            profileHandle={profileHandle}
            stats={stats || {}}
            placedMemories={placedMemories}
            foundMemories={foundMemories}
            savedMemories={savedMemories}
            journeys={journeys}
            journeyMemories={journeyMemories}
            journeyVisibilityMap={journeyVisibilityMap}
            onSelectMemory={onSelectMemory}
            onOpenProfile={onOpenProfile}
            onOpenJourneyPanel={onOpenJourneyPanel}
            avatarUrl={user?.avatarUrl || ''}
            displayName={user?.name || ''}
            showProfileHeader={false}
            defaultJourneyId={defaultJourneyId}
            defaultJourneyScroll={defaultJourneyScroll}
            onJourneyViewChange={onJourneyViewChange}
          />
          {loading && <p>Loading stats...</p>}
          {error && <p className="error-text">{error}</p>}
        </>
      )}
    </div>
  );
}

export default ProfilePanel;
