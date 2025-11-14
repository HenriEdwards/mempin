import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFriends = () => {
    if (!user) return;
    setLoading(true);
    api
      .getFriends()
      .then((data) => {
        setFriends(data.friends || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Unable to load friends'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchFriends, [user]);

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

  if (!user) {
    return (
      <div className="panel-card">
        <p>Sign in to manage friends.</p>
      </div>
    );
  }

  return (
    <div className="panel-card friends-page">
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
    </div>
  );
}

export default FriendsPage;
