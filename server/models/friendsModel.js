const db = require('../db/queries');
const userModel = require('./userModel');

async function getFollowing(userId) {
  const rows = await db.query(
    `SELECT uf.following_id AS followingId, u.name, u.email, u.avatar_url AS avatarUrl,
            u.created_at AS createdAt
     FROM user_followers uf
     INNER JOIN users u ON u.id = uf.following_id
     WHERE uf.follower_id = ?
     ORDER BY u.name ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.followingId,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
  }));
}

async function getFollowers(userId) {
  const rows = await db.query(
    `SELECT uf.follower_id AS followerId, u.name, u.email, u.avatar_url AS avatarUrl,
            u.created_at AS createdAt
     FROM user_followers uf
     INNER JOIN users u ON u.id = uf.follower_id
     WHERE uf.following_id = ?
     ORDER BY u.name ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.followerId,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
  }));
}

async function followByEmail(userId, email) {
  const target = await userModel.findByEmail(email);
  if (!target) {
    const error = new Error('User with that email was not found');
    error.status = 404;
    throw error;
  }
  if (target.id === userId) {
    const error = new Error('You cannot follow yourself');
    error.status = 400;
    throw error;
  }

  await db.query(
    `INSERT INTO user_followers (follower_id, following_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE follower_id = follower_id`,
    [userId, target.id],
  );

  return {
    id: target.id,
    name: target.name,
    email: target.email,
    avatarUrl: target.avatarUrl,
    createdAt: target.createdAt,
  };
}

async function unfollow(userId, followingId) {
  await db.query(
    `DELETE FROM user_followers
     WHERE follower_id = ? AND following_id = ?
     LIMIT 1`,
    [userId, followingId],
  );
}

async function getFollowingOwnerSet(ownerIds = [], currentUserId) {
  if (!currentUserId || !ownerIds.length) {
    return new Set();
  }

  const rows = await db.query(
    `SELECT following_id
     FROM user_followers
     WHERE follower_id = ?
       AND following_id IN (${ownerIds.map(() => '?').join(',')})`,
    [currentUserId, ...ownerIds],
  );

  return new Set(rows.map((row) => row.following_id));
}

async function isFollowing(followerId, followingId) {
  const rows = await db.query(
    `SELECT 1
     FROM user_followers
     WHERE follower_id = ? AND following_id = ?
     LIMIT 1`,
    [followerId, followingId],
  );
  return rows.length > 0;
}

module.exports = {
  getFollowing,
  getFollowers,
  followByEmail,
  unfollow,
  getFollowingOwnerSet,
  isFollowing,
};
