import { useCallback, useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { getHandleError, normalizeHandle } from '../../utils/handles.js';
import { useUI } from '../../context/UIContext.jsx';

function FriendsPanel({ isOpen, onClose, onViewMemories }) {
  const { user } = useAuth();
  const { openUserProfilePanel } = useUI();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('following');
  const [followersSearch, setFollowersSearch] = useState('');
  const [followActionId, setFollowActionId] = useState(null);

  const formatFollowingData = useCallback(
    (items = []) => items.map((item) => ({ ...item, isFollowing: true })),
    [],
  );

  const fetchFollowers = useCallback(() => {
    if (!user || !isOpen) {
      if (!user) {
        setFollowing([]);
        setFollowers([]);
        setSuggestions([]);
      }
      return;
    }
    setLoading(true);
    api
      .getFollowers()
      .then((data) => {
        setFollowing(formatFollowingData(data.following || []));
        setFollowers(data.followers || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load followers'))
      .finally(() => setLoading(false));
  }, [formatFollowingData, isOpen, user]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  useEffect(() => {
    if (!user || !isOpen || tab !== 'following') {
      return;
    }
    setSuggestionLoading(true);
    api
      .getFollowerSuggestions()
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionLoading(false));
  }, [user, isOpen, tab]);

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

  const isHandleFollowing = (lookupHandle) =>
    following.some(
      (item) => item.isFollowing && normalizeHandle(item.handle) === normalizeHandle(lookupHandle),
    );

  const openProfile = (userHandle, options = {}) => {
    if (!userHandle) return;
    openUserProfilePanel(userHandle, options);
  };

  const filteredFollowers = followers.filter((follower) => {
    if (!followersSearch) return true;
    const normalizedSearch = normalizeHandle(followersSearch);
    return normalizeHandle(follower.handle).includes(normalizedSearch);
  });

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Following" width="480px">
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
              <>
                <div className="friends-form">
                  <Input
                    placeholder="Handle (e.g. @mempinner)"
                    value={handle}
                    onChange={(event) => {
                      setHandle(event.target.value);
                      setError('');
                    }}
                  />
                  <Button onClick={handleAddFriend}>Follow</Button>
                </div>
                <p className="muted">Tap a profile to view, or toggle follow without losing it until reload.</p>
              </>
            )}
            {tab === 'followers' && (
              <div className="friends-search">
                <Input
                  placeholder="Search followers by handle"
                  value={followersSearch}
                  onChange={(event) => setFollowersSearch(event.target.value)}
                />
              </div>
            )}
            {loading && <p>Loading...</p>}
            {error && <p className="error-text">{error}</p>}
            <div className="friends-list">
              {tab === 'following'
                ? following.map((followingUser) => (
                    <div
                      key={followingUser.id}
                      className={`friends-item friends-item--card ${
                        followingUser.isFollowing ? '' : 'friends-item--inactive'
                      }`}
                    >
                      <button
                        type="button"
                        className="friends-item__inner friends-item--clickable"
                        onClick={() =>
                          openProfile(followingUser.handle, {
                            isFollowing: followingUser.isFollowing,
                            onFollow: () => handleToggleFollow(followingUser),
                            onUnfollow: () => handleToggleFollow(followingUser),
                          })
                        }
                      >
                        <div className="friends-item__meta">
                          <p className="friends-item__name">
                            {followingUser.name || followingUser.handle || followingUser.email}
                          </p>
                          <small className="friends-item__handle">
                            {followingUser.handle ? `@${followingUser.handle}` : followingUser.email}
                          </small>
                        </div>
                        <div className="friends-item__stats">
                          <span className="friends-item__pill">
                            {(followingUser.memoryCount ?? 0).toLocaleString()} memories
                          </span>
                        </div>
                      </button>
                      <Button
                        variant={followingUser.isFollowing ? 'ghost' : 'primary'}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleFollow(followingUser);
                        }}
                        disabled={followActionId === followingUser.id}
                      >
                        {followActionId === followingUser.id
                          ? 'Updating...'
                          : followingUser.isFollowing
                          ? 'Unfollow'
                          : 'Follow'}
                      </Button>
                    </div>
                  ))
                : filteredFollowers.map((follower) => (
                    <div key={`f-${follower.id}`} className="friends-item friends-item--card">
                      <button
                        type="button"
                        className="friends-item__inner friends-item--clickable"
                        onClick={() =>
                          openProfile(follower.handle, {
                            isFollowing: isHandleFollowing(follower.handle),
                          })
                        }
                      >
                        <div className="friends-item__meta">
                          <p className="friends-item__name">
                            {follower.name || follower.handle || follower.email}
                          </p>
                          <small className="friends-item__handle">
                            {follower.handle ? `@${follower.handle}` : follower.email}
                          </small>
                        </div>
                        <div className="friends-item__stats">
                          <span className="friends-item__pill">
                            {(follower.memoryCount ?? 0).toLocaleString()} memories
                          </span>
                        </div>
                      </button>
                    </div>
                  ))}
              {!((tab === 'following' ? following : filteredFollowers).length) && !loading && (
                <p>{tab === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</p>
              )}
              {tab === 'followers' && followersSearch && !filteredFollowers.length && !loading && (
                <p className="muted">No followers match that handle.</p>
              )}
            </div>
            {tab === 'following' && (
              <div className="friends-suggestions">
                <h3>Suggested to follow</h3>
                {suggestionLoading && <p>Loading suggestions...</p>}
                {!suggestionLoading && suggestions.length === 0 && <p>No suggestions yet.</p>}
                {!suggestionLoading &&
                  suggestions.map((suggestion) => (
                    <div
                      key={`s-${suggestion.id}`}
                      className="friends-item friends-item--clickable"
                      onClick={() => openProfile(suggestion.handle)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') openProfile(suggestion.handle);
                      }}
                    >
                      <div>
                        <p>{suggestion.name || suggestion.handle || suggestion.email}</p>
                        <small>
                          {suggestion.handle ? `@${suggestion.handle}` : suggestion.email}
                          {suggestion.email && suggestion.handle ? ` • ${suggestion.email}` : ''}
                          {suggestion.followerCount
                            ? ` • ${suggestion.followerCount} follower${
                                suggestion.followerCount === 1 ? '' : 's'
                              }`
                            : ''}
                        </small>
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
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default FriendsPanel;
