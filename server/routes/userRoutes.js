const express = require('express');
const {
  getCurrentUser,
  getUserStats,
  updateHandle,
  getUserPublicProfile,
} = require('../controllers/userController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', optionalAuth, getCurrentUser);
router.get('/me/stats', requireAuth, getUserStats);
router.patch('/me/handle', requireAuth, updateHandle);
router.get('/handle/:handle', optionalAuth, getUserPublicProfile);

module.exports = router;
