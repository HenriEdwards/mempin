const { AUTH_COOKIE_NAME, getAuthCookieOptions, signUser } = require('../utils/jwt');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function handleGoogleCallback(req, res) {
  if (!req.user) {
    return res.redirect(`${CLIENT_URL}?auth=failed`);
  }

  const token = signUser(req.user);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
  return res.redirect(CLIENT_URL);
}

function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
  });
  return res.status(200).json({ success: true });
}

module.exports = {
  handleGoogleCallback,
  logout,
};
