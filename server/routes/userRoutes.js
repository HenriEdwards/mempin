const express = require('express');
const { getCurrentUser, getUserStats } = require('../controllers/userController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', optionalAuth, getCurrentUser);
router.get('/me/stats', requireAuth, getUserStats);

module.exports = router;
