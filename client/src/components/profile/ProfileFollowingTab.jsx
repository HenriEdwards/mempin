import { useCallback, useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import api from '../../services/api.js';
import { getHandleError, normalizeHandle } from '../../utils/handles.js';

function ProfileFollowingTab({ isActive, openProfile, hideSuggestions = false, profileHandle }) {
  const [following, setFollowing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [handle, setHandle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [followActionId, setFollowActionId] = useState(null);

  const formatFollowingData = useCallback(
    (items = []) => items.map((item) => ({ ...item, isFollowing: true })),
    [],
  );

  const fetchFollowers = useCallback(() => {
    if (!isActive) return;
    setLoading(true);
    const fetcher = profileHandle
      ? api.getUserFollowing(profileHandle)
      : api.getFollowers();

    fetcher
      .then((data) => {
        const base = data.following || [];
        const normalized = profileHandle ? base : formatFollowingData(base);
        setFollowing(normalized.map((item) => ({ ...item, isFollowing: Boolean(item.isFollowing) })));
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load followers'))
      .finally(() => setLoading(false));
  }, [formatFollowingData, isActive, profileHandle]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  useEffect(() => {
    if (!isActive) return;
    setSuggestionLoading(true);
    api
      .getFollowerSuggestions()
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionLoading(false));
  }, [isActive]);

  const handleAddFriend = async () => {
    const validationError = getHandleError(handle);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const normalizedHandleValue = normalizeHandle(handle);
      const { follower: addedFollower } = await api.addFollower(normalizedHandleValue);
      const formattedFollower = { ...(addedFollower || {}), isFollowing: true };
      setHandle('');
      setFollowing((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            normalizeHandle(item.handle) === normalizedHandleValue || item.id === formattedFollower.id,
        );
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = { ...copy[existingIndex], ...formattedFollower };
          return copy;
        }
        return [...prev, formattedFollower];
      });
      setSuggestions((prev) => prev.filter((item) => normalizeHandle(item.handle) !== normalizedHandleValue));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleFollow = async (friend) => {
    if (!friend?.id) return;
    const normalizedHandleValue = normalizeHandle(friend.handle);
    if (!friend.isFollowing && !normalizedHandleValue) {
      setError('Handle required to follow this user again.');
      return;
    }
    setFollowActionId(friend.id);
    try {
      if (friend.isFollowing) {
        await api.removeFollower(friend.id);
      } else {
        await api.addFollower(normalizedHandleValue);
      }
      setFollowing((prev) =>
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

  const handleFollowSuggestion = async (suggestedHandle) => {
    try {
      const { follower: addedFollower } = await api.addFollower(suggestedHandle);
      const normalizedHandleValue = normalizeHandle(suggestedHandle);
      const formattedFollower = { ...(addedFollower || {}), isFollowing: true };
      setFollowing((prev) => {
        const exists = prev.find(
          (item) => normalizeHandle(item.handle) === normalizedHandleValue || item.id === formattedFollower.id,
        );
        if (exists) {
          return prev.map((item) =>
            item.id === exists.id
              ? { ...item, ...formattedFollower, isFollowing: true }
              : item,
          );
        }
        return [...prev, formattedFollower];
      });
      setSuggestions((prev) => prev.filter((item) => normalizeHandle(item.handle) !== normalizedHandleValue));
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredFollowing = following.filter((friend) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const handleMatch = (friend.handle || '').toLowerCase().includes(term);
    const nameMatch = (friend.name || '').toLowerCase().includes(term);
    const emailMatch = (friend.email || '').toLowerCase().includes(term);
    return handleMatch || nameMatch || emailMatch;
  });

  return (
    <div className="profile-following">
      <Input
        placeholder="Search following..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      <div className="friends-list">
        {filteredFollowing.map((friend) => (
          <div
            key={friend.id}
            className={`friends-item friends-item--card ${friend.isFollowing ? '' : 'friends-item--inactive'}`}
          >
            <button
              type="button"
              className="friends-item__inner friends-item--clickable"
              onClick={() => openProfile?.(friend.handle, { isFollowing: friend.isFollowing })}
            >
              <div className="friends-item__meta">
                {/* <p className="friends-item__name">
                  {friend.name || friend.handle || friend.email}
                </p> */}
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
        {!filteredFollowing.length && !loading && (
          <div className="empty-state">
            {following.length ? 'No matches for that search.' : 'Not following anyone yet.'}
          </div>
        )}
      </div>

      {!hideSuggestions && (
        <div className="friends-suggestions mt-8">
          <h3>Suggested to follow</h3>
          {suggestionLoading && <p className="muted">Loading suggestions...</p>}
          {!suggestionLoading && suggestions.length === 0 && <p className="muted">No suggestions yet.</p>}
          {!suggestionLoading &&
            suggestions.map((suggestion) => (
              <div
                key={`s-${suggestion.id}`}
                className="friends-item friends-item--clickable"
                onClick={() => openProfile?.(suggestion.handle)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openProfile?.(suggestion.handle);
                }}
              >
                <div className="friends-item__inner">
                  <div className="friends-item__meta">
                    {/* <p className="friends-item__name">
                      {suggestion.name || suggestion.handle || suggestion.email}
                    </p> */}
                    <p className="friends-item__handle">
                      {suggestion.handle ? `@${suggestion.handle}` : suggestion.email}
                      {/* {suggestion.email && suggestion.handle ? ` • ${suggestion.email}` : ''} */}
                      {suggestion.followerCount
                        ? ` • ${suggestion.followerCount} follower${suggestion.followerCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                  <div className="friends-item__stats">
                    <span className="friends-item__pill">
                      {(suggestion.memoryCount ?? 0).toLocaleString()} memories
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFollowSuggestion(suggestion.handle);
                  }}
                >
                  Follow
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ProfileFollowingTab;
