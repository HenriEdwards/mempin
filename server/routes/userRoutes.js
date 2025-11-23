const express = require('express');
const {
  getCurrentUser,
  getUserStats,
  updateHandle,
  getUserPublicProfile,
  getUserFollowingPublic,
  getUserFollowersPublic,
} = require('../controllers/userController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', optionalAuth, getCurrentUser);
router.get('/me/stats', requireAuth, getUserStats);
router.patch('/me/handle', requireAuth, updateHandle);
router.get('/handle/:handle', optionalAuth, getUserPublicProfile);
router.get('/handle/:handle/following', optionalAuth, getUserFollowingPublic);
router.get('/handle/:handle/followers', optionalAuth, getUserFollowersPublic);

module.exports = router;
