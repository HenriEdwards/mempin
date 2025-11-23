const asyncHandler = require('../utils/asyncHandler');
const friendsModel = require('../models/friendsModel');
const { normalizeHandle, isValidHandle } = require('../utils/handles');

const listFollowers = asyncHandler(async (req, res) => {
  const [following, followers] = await Promise.all([
    friendsModel.getFollowing(req.user.id),
    friendsModel.getFollowers(req.user.id),
  ]);
  res.json({ following, followers });
});

const addFollower = asyncHandler(async (req, res) => {
  const normalizedHandle = normalizeHandle(req.body.handle);
  if (!normalizedHandle) {
    return res.status(400).json({ error: 'Handle is required' });
  }
  if (!isValidHandle(normalizedHandle)) {
    return res.status(400).json({ error: 'Handle must be 3-20 letters, numbers or _' });
  }
  const follower = await friendsModel.followByHandle(req.user.id, normalizedHandle);
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

const listSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await friendsModel.getFollowSuggestions(req.user.id, 10);
  res.json({ suggestions });
});

module.exports = {
  listFollowers,
  addFollower,
  removeFollower,
  listSuggestions,
};
