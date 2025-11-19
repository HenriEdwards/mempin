import { useCallback, useEffect, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

function FriendsPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFriends = useCallback(() => {
    if (!user || !isOpen) {
      if (!user) {
        setFriends([]);
      }
      return;
    }
    setLoading(true);
    api
      .getFriends()
      .then((data) => {
        setFriends(data.friends || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load friends'))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleAddFriend = async () => {
    if (!email) return;
    try {
      await api.addFriend(email);
      setEmail('');
      fetchFriends();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (friendId) => {
    try {
      await api.removeFriend(friendId);
      setFriends((prev) => prev.filter((friend) => friend.id !== friendId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Friends" width="420px">
      <div className="panel-card friends-page">
        {!user ? (
          <p>Sign in to manage friends.</p>
        ) : (
          <>
            <h2>Friends</h2>
            <div className="friends-form">
              <Input
                placeholder="Friend email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button onClick={handleAddFriend}>Add friend</Button>
            </div>
            {loading && <p>Loading friends...</p>}
            {error && <p className="error-text">{error}</p>}
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.id} className="friends-item">
                  <div>
                    <p>{friend.name || friend.email}</p>
                    <small>{friend.email}</small>
                  </div>
                  <Button variant="ghost" onClick={() => handleRemove(friend.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              {!friends.length && !loading && <p>No friends yet.</p>}
            </div>
          </>
        )}
      </div>
    </SlidingPanel>
  );
}

export default FriendsPanel;
