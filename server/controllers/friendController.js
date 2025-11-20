const asyncHandler = require('../utils/asyncHandler');
const friendsModel = require('../models/friendsModel');

const listFollowers = asyncHandler(async (req, res) => {
  const [following, followers] = await Promise.all([
    friendsModel.getFollowing(req.user.id),
    friendsModel.getFollowers(req.user.id),
  ]);
  res.json({ following, followers });
});

const addFollower = asyncHandler(async (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const follower = await friendsModel.followByEmail(
    req.user.id,
    String(req.body.email).trim().toLowerCase(),
  );
  res.status(201).json({ follower });
});

const removeFollower = asyncHandler(async (req, res) => {
  const followingId = Number(req.params.id);
  if (!followingId) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  await friendsModel.unfollow(req.user.id, followingId);
  res.json({ success: true });
});

module.exports = {
  listFollowers,
  addFollower,
  removeFollower,
};
