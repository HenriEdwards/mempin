const db = require('../db/queries');
const userModel = require('./userModel');

async function getFriends(userId) {
  const rows = await db.query(
    `SELECT uf.friend_user_id AS friendId, u.name, u.email, u.avatar_url AS avatarUrl,
            u.created_at AS createdAt
     FROM user_friends uf
     INNER JOIN users u ON u.id = uf.friend_user_id
     WHERE uf.user_id = ?
     ORDER BY u.name ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.friendId,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
  }));
}

async function addFriendByEmail(userId, email) {
  const friend = await userModel.findByEmail(email);
  if (!friend) {
    const error = new Error('User with that email was not found');
    error.status = 404;
    throw error;
  }
  if (friend.id === userId) {
    const error = new Error('You cannot add yourself as a friend');
    error.status = 400;
    throw error;
  }

  await db.query(
    `INSERT INTO user_friends (user_id, friend_user_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId, friend.id],
  );

  return {
    id: friend.id,
    name: friend.name,
    email: friend.email,
    avatarUrl: friend.avatarUrl,
    createdAt: friend.createdAt,
  };
}

async function removeFriend(userId, friendId) {
  await db.query(
    `DELETE FROM user_friends
     WHERE user_id = ? AND friend_user_id = ?
     LIMIT 1`,
    [userId, friendId],
  );
}

async function getFriendOwnerSet(ownerIds = [], currentUserId) {
  if (!currentUserId || !ownerIds.length) {
    return new Set();
  }

  const rows = await db.query(
    `SELECT user_id
     FROM user_friends
     WHERE friend_user_id = ?
       AND user_id IN (${ownerIds.map(() => '?').join(',')})`,
    [currentUserId, ...ownerIds],
  );

  return new Set(rows.map((row) => row.user_id));
}

async function isFriend(ownerId, friendUserId) {
  const rows = await db.query(
    `SELECT 1
     FROM user_friends
     WHERE user_id = ? AND friend_user_id = ?
     LIMIT 1`,
    [ownerId, friendUserId],
  );
  return rows.length > 0;
}

module.exports = {
  getFriends,
  addFriendByEmail,
  removeFriend,
  getFriendOwnerSet,
  isFriend,
};
