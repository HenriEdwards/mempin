const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');
const db = require('../db/queries');

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
      latestPlaced: latestPlacedRows[0] || null,
      latestFound: latestFoundRows[0] || null,
    },
  });
});

module.exports = {
  getCurrentUser,
  getUserStats,
};
