const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');
const db = require('../db/queries');
const { normalizeHandle, isValidHandle } = require('../utils/handles');
const friendsModel = require('../models/friendsModel');

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.json({ user: null });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      handle: user.handle,
      avatarUrl: user.avatarUrl,
    },
  });
});

const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const placedRows = await db.query(
    'SELECT COUNT(*) AS count FROM memories WHERE owner_id = ?',
    [userId],
  );
  const foundRows = await db.query(
    'SELECT COUNT(*) AS count FROM memory_unlocks WHERE user_id = ?',
    [userId],
  );
  const viewsRows = await db.query(
    `SELECT COALESCE(SUM(mu.count_unlocks), 0) AS totalViews
     FROM memories m
     LEFT JOIN (
       SELECT memory_id, COUNT(*) AS count_unlocks
       FROM memory_unlocks
       GROUP BY memory_id
     ) mu ON mu.memory_id = m.id
     WHERE m.owner_id = ?`,
    [userId],
  );
  const followerRows = await db.query(
    `SELECT COUNT(*) AS count
     FROM user_followers
     WHERE following_id = ?`,
    [userId],
  );
  const followingRows = await db.query(
    `SELECT COUNT(*) AS count
     FROM user_followers
     WHERE follower_id = ?`,
    [userId],
  );
  const latestPlacedRows = await db.query(
    `SELECT id, title, short_description AS shortDescription, created_at AS createdAt
     FROM memories
     WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  const latestFoundRows = await db.query(
    `SELECT m.id, m.title, m.short_description AS shortDescription, mu.unlocked_at AS unlockedAt
     FROM memory_unlocks mu
     INNER JOIN memories m ON m.id = mu.memory_id
     WHERE mu.user_id = ?
     ORDER BY mu.unlocked_at DESC
     LIMIT 1`,
    [userId],
  );

  res.json({
    stats: {
      placedCount: placedRows[0]?.count || 0,
      foundCount: foundRows[0]?.count || 0,
      totalViewsOnMyMemories: viewsRows[0]?.totalViews || 0,
      followerCount: followerRows[0]?.count || 0,
      followingCount: followingRows[0]?.count || 0,
      latestPlaced: latestPlacedRows[0] || null,
      latestFound: latestFoundRows[0] || null,
    },
  });
});

const updateHandle = asyncHandler(async (req, res) => {
  const current = await userModel.findById(req.user.id);
  if (current?.handle) {
    return res.status(400).json({ error: 'Handle is already set and cannot be changed' });
  }

  const normalizedHandle = normalizeHandle(req.body.handle);
  if (!normalizedHandle) {
    return res.status(400).json({ error: 'Handle is required' });
  }
  if (!isValidHandle(normalizedHandle)) {
    return res.status(400).json({ error: 'Handle must be 3-20 characters of letters, numbers, or _' });
  }

  const existing = await userModel.findByHandle(normalizedHandle);
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ error: 'Handle is already taken' });
  }

  const updated = await userModel.updateHandle(req.user.id, normalizedHandle);
  return res.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      handle: updated.handle,
      avatarUrl: updated.avatarUrl,
    },
  });
});

const getUserPublicProfile = asyncHandler(async (req, res) => {
  const handle = normalizeHandle(req.params.handle);
  if (!handle) {
    return res.status(400).json({ error: 'Invalid handle' });
  }

  const user = await userModel.findByHandle(handle);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const [placedRows, followerRows, followingRows] = await Promise.all([
    db.query('SELECT COUNT(*) AS count FROM memories WHERE owner_id = ?', [user.id]),
    db.query('SELECT COUNT(*) AS count FROM user_followers WHERE following_id = ?', [user.id]),
    db.query('SELECT COUNT(*) AS count FROM user_followers WHERE follower_id = ?', [user.id]),
  ]);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      avatarUrl: user.avatarUrl,
      stats: {
        placedCount: placedRows[0]?.count || 0,
        followerCount: followerRows[0]?.count || 0,
        followingCount: followingRows[0]?.count || 0,
      },
    },
  });
});

const getUserFollowingPublic = asyncHandler(async (req, res) => {
  const handle = normalizeHandle(req.params.handle);
  if (!handle) {
    return res.status(400).json({ error: 'Invalid handle' });
  }

  const user = await userModel.findByHandle(handle);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const viewerId = req.user?.id || null;
  const following = await friendsModel.getFollowingForUser(user.id, viewerId);
  res.json({ following });
});

const getUserFollowersPublic = asyncHandler(async (req, res) => {
  const handle = normalizeHandle(req.params.handle);
  if (!handle) {
    return res.status(400).json({ error: 'Invalid handle' });
  }

  const user = await userModel.findByHandle(handle);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const viewerId = req.user?.id || null;
  const followers = await friendsModel.getFollowersForUser(user.id, viewerId);
  res.json({ followers });
});

module.exports = {
  getCurrentUser,
  getUserStats,
  updateHandle,
  getUserPublicProfile,
  getUserFollowingPublic,
  getUserFollowersPublic,
};
