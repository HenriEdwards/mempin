const express = require('express');
const {
  listFollowers,
  addFollower,
  removeFollower,
  listSuggestions,
} = require('../controllers/friendController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listFollowers);
router.get('/suggestions', listSuggestions);
router.post('/', addFollower);
router.delete('/:id', removeFollower);

module.exports = router;
