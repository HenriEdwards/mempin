const express = require('express');
const {
  createMemory,
  getPlacedMemories,
  getUnlockedMemories,
  getNearbyMemories,
  unlockMemory,
  getMemoryDetails,
} = require('../controllers/memoryController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/nearby', optionalAuth, getNearbyMemories);
router.get('/placed', requireAuth, getPlacedMemories);
router.get('/unlocked', requireAuth, getUnlockedMemories);
router.get('/:id', requireAuth, getMemoryDetails);
router.post('/', requireAuth, ...createMemory);
router.post('/:id/unlock', requireAuth, unlockMemory);

module.exports = router;
