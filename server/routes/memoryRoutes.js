const express = require('express');
const {
  createMemory,
  getPlacedMemories,
  getAllMemories,
  getUnlockedMemories,
  getNearbyMemories,
  unlockMemory,
  getMemoryDetails,
  updateMemoryVisibility,
  saveMemory,
  removeSavedMemory,
  getSavedMemories,
} = require('../controllers/memoryController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/nearby', optionalAuth, getNearbyMemories);
router.get('/all', optionalAuth, getAllMemories);
router.get('/placed', requireAuth, getPlacedMemories);
router.get('/unlocked', requireAuth, getUnlockedMemories);
router.get('/saved', requireAuth, getSavedMemories);
router.get('/:id', requireAuth, getMemoryDetails);
router.post('/', requireAuth, ...createMemory);
router.post('/:id/unlock', requireAuth, unlockMemory);
router.post('/:id/save', requireAuth, saveMemory);
router.delete('/:id/save', requireAuth, removeSavedMemory);
router.patch('/:id/visibility', requireAuth, updateMemoryVisibility);

module.exports = router;
