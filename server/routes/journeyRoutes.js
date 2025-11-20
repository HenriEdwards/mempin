const express = require('express');
const {
  listJourneys,
  createJourney,
  getJourneyMemories,
  updateJourneyVisibility,
} = require('../controllers/journeyController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listJourneys);
router.post('/', createJourney);
router.get('/:id/memories', getJourneyMemories);
router.patch('/:id/visibility', updateJourneyVisibility);

module.exports = router;
