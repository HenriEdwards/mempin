import { useCallback, useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

function FriendsPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('following');

  const fetchFollowers = useCallback(() => {
    if (!user || !isOpen) {
      if (!user) {
        setFollowing([]);
        setFollowers([]);
      }
      return;
    }
    setLoading(true);
    api
      .getFollowers()
      .then((data) => {
        setFollowing(data.following || []);
        setFollowers(data.followers || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load followers'))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const handleAddFriend = async () => {
    if (!email) return;
    try {
      await api.addFollower(email);
      setEmail('');
      fetchFollowers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (friendId) => {
    try {
      await api.removeFollower(friendId);
      setFollowing((prev) => prev.filter((follower) => follower.id !== friendId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Following" width="420px">
      <div className="panel-card friends-page">
        {!user ? (
          <p>Sign in to manage connections.</p>
        ) : (
          <>
            <h2>Following</h2>
            <div className="tabs tabs--segmented">
              <button
                type="button"
                className={`tab-button ${tab === 'following' ? 'active' : ''}`}
                onClick={() => setTab('following')}
              >
                Following
              </button>
              <button
                type="button"
                className={`tab-button ${tab === 'followers' ? 'active' : ''}`}
                onClick={() => setTab('followers')}
              >
                Followers
              </button>
            </div>
            {tab === 'following' && (
              <div className="friends-form">
                <Input
                  placeholder="User email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button onClick={handleAddFriend}>Follow</Button>
              </div>
            )}
            {loading && <p>Loading...</p>}
            {error && <p className="error-text">{error}</p>}
            <div className="friends-list">
              {tab === 'following'
                ? following.map((followingUser) => (
                    <div key={followingUser.id} className="friends-item">
                      <div>
                        <p>{followingUser.name || followingUser.email}</p>
                        <small>{followingUser.email}</small>
                      </div>
                      <Button variant="ghost" onClick={() => handleRemove(followingUser.id)}>
                        Unfollow
                      </Button>
                    </div>
                  ))
                : followers.map((follower) => (
                    <div key={`f-${follower.id}`} className="friends-item">
                      <div>
                        <p>{follower.name || follower.email}</p>
                        <small>{follower.email}</small>
                      </div>
                    </div>
                  ))}
              {!((tab === 'following' ? following : followers).length) && !loading && (
                <p>{tab === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</p>
              )}
            </div>
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default FriendsPanel;
