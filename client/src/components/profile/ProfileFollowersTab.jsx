import { useCallback, useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import api from '../../services/api.js';
import { normalizeHandle } from '../../utils/handles.js';

function ProfileFollowersTab({ isActive, openProfile, profileHandle, hideSuggestions = true }) {
  const [followers, setFollowers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [followActionId, setFollowActionId] = useState(null);

  const fetchFollowers = useCallback(() => {
    if (!isActive) return;
    setLoading(true);
    const fetcher = profileHandle ? api.getUserFollowers(profileHandle) : api.getFollowers();
    fetcher
      .then((data) => {
        const base = profileHandle ? data.followers || [] : data.followers || [];
        setFollowers(base.map((item) => ({ ...item, isFollowing: Boolean(item.isFollowing) })));
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load followers'))
      .finally(() => setLoading(false));
  }, [isActive, profileHandle]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const handleToggleFollow = async (friend) => {
    if (!friend?.id) return;
    const normalizedHandleValue = normalizeHandle(friend.handle);
    if (!friend.isFollowing && !normalizedHandleValue) {
      setError('Handle required to follow this user.');
      return;
    }
    setFollowActionId(friend.id);
    try {
      if (friend.isFollowing) {
        await api.removeFollower(friend.id);
      } else {
        await api.addFollower(normalizedHandleValue);
      }
      setFollowers((prev) =>
        prev.map((follower) =>
          follower.id === friend.id ? { ...follower, isFollowing: !friend.isFollowing } : follower,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setFollowActionId(null);
    }
  };

  const filteredFollowers = followers.filter((follower) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (follower.handle || '').toLowerCase().includes(term) ||
      (follower.name || '').toLowerCase().includes(term) ||
      (follower.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="profile-following">
      <Input
        placeholder="Search followers..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      <div className="friends-list">
        {filteredFollowers.map((friend) => (
          <div
            key={friend.id}
            className={`friends-item friends-item--card ${friend.isFollowing ? '' : 'friends-item--inactive'}`}
          >
            <button
              type="button"
              className="friends-item__inner friends-item--clickable"
              onClick={() => openProfile?.(friend.handle, { isFollowing: friend.isFollowing })}
            >
              <div className="friends-item__avatar" aria-hidden="true">
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(friend.name || friend.handle || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="friends-item__meta">
                <p className="friends-item__handle">
                  {friend.handle ? `@${friend.handle}` : friend.email}
                </p>
              </div>
              <div className="friends-item__stats">
                <span className="friends-item__pill">
                  {(friend.memoryCount ?? 0).toLocaleString()} memories
                </span>
              </div>
            </button>
            <Button
              variant={friend.isFollowing ? 'ghost' : 'primary'}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleFollow(friend);
              }}
              disabled={followActionId === friend.id}
            >
              {followActionId === friend.id
                ? 'Updating...'
                : friend.isFollowing
                ? 'Unfollow'
                : 'Follow'}
            </Button>
          </div>
        ))}
        {!filteredFollowers.length && !loading && (
          <div className="empty-state">
            {followers.length ? 'No matches for that search.' : 'No followers yet.'}
          </div>
        )}
      </div>
      {!hideSuggestions && null}
    </div>
  );
}

export default ProfileFollowersTab;
