const express = require('express');
const { listFollowers, addFollower, removeFollower } = require('../controllers/friendController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listFollowers);
router.post('/', addFollower);
router.delete('/:id', removeFollower);

module.exports = router;
