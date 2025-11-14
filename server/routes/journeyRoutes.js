const express = require('express');
const { listJourneys, createJourney } = require('../controllers/journeyController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listJourneys);
router.post('/', createJourney);

module.exports = router;
