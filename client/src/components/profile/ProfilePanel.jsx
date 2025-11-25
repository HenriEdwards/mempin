import { useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import ProfileTabsContent from './ProfileTabsContent.jsx';

function ProfilePanel({
  isOpen,
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

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="" hideHeader width="480px">
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
              journeys={journeys}
              journeyMemories={journeyMemories}
              journeyVisibilityMap={journeyVisibilityMap}
              onSelectMemory={onSelectMemory}
              onOpenProfile={onOpenProfile}
              onOpenJourneyPanel={onOpenJourneyPanel}
            />
            {loading && <p>Loading stats...</p>}
            {error && <p className="error-text">{error}</p>}
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default ProfilePanel;
