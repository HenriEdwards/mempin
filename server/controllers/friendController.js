const asyncHandler = require('../utils/asyncHandler');
const friendsModel = require('../models/friendsModel');

const listFriends = asyncHandler(async (req, res) => {
  const friends = await friendsModel.getFriends(req.user.id);
  res.json({ friends });
});

const addFriend = asyncHandler(async (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const friend = await friendsModel.addFriendByEmail(
    req.user.id,
    String(req.body.email).trim().toLowerCase(),
  );
  res.status(201).json({ friend });
});

const removeFriend = asyncHandler(async (req, res) => {
  const friendId = Number(req.params.id);
  if (!friendId) {
    return res.status(400).json({ error: 'Invalid friend id' });
  }
  await friendsModel.removeFriend(req.user.id, friendId);
  res.json({ success: true });
});

module.exports = {
  listFriends,
  addFriend,
  removeFriend,
};
