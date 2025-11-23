const db = require('../db/queries');
const userModel = require('./userModel');

async function getFollowing(userId) {
  const rows = await db.query(
    `SELECT uf.following_id AS followingId, u.name, u.email, u.handle, u.avatar_url AS avatarUrl,
            u.created_at AS createdAt, COALESCE(mem_counts.memory_count, 0) AS memoryCount
     FROM user_followers uf
     INNER JOIN users u ON u.id = uf.following_id
     LEFT JOIN (
       SELECT owner_id, COUNT(*) AS memory_count
       FROM memories
       GROUP BY owner_id
     ) mem_counts ON mem_counts.owner_id = u.id
     WHERE uf.follower_id = ?
     ORDER BY u.name ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.followingId,
    name: row.name,
    email: row.email,
    handle: row.handle,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    memoryCount: row.memoryCount,
  }));
}

async function getFollowers(userId) {
  const rows = await db.query(
    `SELECT uf.follower_id AS followerId, u.name, u.email, u.handle, u.avatar_url AS avatarUrl,
            u.created_at AS createdAt, COALESCE(mem_counts.memory_count, 0) AS memoryCount
     FROM user_followers uf
     INNER JOIN users u ON u.id = uf.follower_id
     LEFT JOIN (
       SELECT owner_id, COUNT(*) AS memory_count
       FROM memories
       GROUP BY owner_id
     ) mem_counts ON mem_counts.owner_id = u.id
     WHERE uf.following_id = ?
     ORDER BY u.name ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.followerId,
    name: row.name,
    email: row.email,
    handle: row.handle,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    memoryCount: row.memoryCount,
  }));
}

async function followByHandle(userId, handle) {
  const target = await userModel.findByHandle(handle);
  if (!target) {
    const error = new Error('User with that handle was not found');
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

  const memoryCounts = await db.query(
    'SELECT COUNT(*) AS memoryCount FROM memories WHERE owner_id = ?',
    [target.id],
  );
  const memoryCount = memoryCounts?.[0]?.memoryCount || 0;

  return {
    id: target.id,
    name: target.name,
    email: target.email,
    handle: target.handle,
    avatarUrl: target.avatarUrl,
    createdAt: target.createdAt,
    memoryCount,
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

async function getFollowSuggestions(userId, limit = 10) {
  const rows = await db.query(
    `SELECT u.id, u.name, u.email, u.handle, u.avatar_url AS avatarUrl, u.created_at AS createdAt,
            COALESCE(follower_counts.count_followers, 0) AS followerCount
     FROM users u
     LEFT JOIN (
       SELECT following_id, COUNT(*) AS count_followers
       FROM user_followers
       GROUP BY following_id
     ) follower_counts ON follower_counts.following_id = u.id
     WHERE u.id != ?
       AND u.id NOT IN (
         SELECT following_id
         FROM user_followers
         WHERE follower_id = ?
       )
       AND u.handle IS NOT NULL
     ORDER BY followerCount DESC, u.created_at DESC
     LIMIT ?`,
    [userId, userId, limit],
  );

  return rows;
}

module.exports = {
  getFollowing,
  getFollowers,
  followByHandle,
  unfollow,
  getFollowingOwnerSet,
  isFollowing,
  getFollowSuggestions,
};
