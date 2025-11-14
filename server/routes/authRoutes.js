const express = require('express');
const passport = require('passport');
const { handleGoogleCallback, logout } = require('../controllers/authController');

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${CLIENT_URL}?auth=failed`,
  }),
  handleGoogleCallback,
);

router.post('/logout', logout);

module.exports = router;
