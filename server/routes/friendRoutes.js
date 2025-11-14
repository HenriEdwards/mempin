const express = require('express');
const { listFriends, addFriend, removeFriend } = require('../controllers/friendController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listFriends);
router.post('/', addFriend);
router.delete('/:id', removeFriend);

module.exports = router;
