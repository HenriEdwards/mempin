const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'auth_token';
const DEFAULT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const authCookieBase = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.USE_HTTPS === '1',
  maxAge: DEFAULT_COOKIE_MAX_AGE,
  path: '/',
};

function signUser(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      handle: user.handle,
      avatarUrl: user.avatarUrl,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
}

function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

function getAuthCookieOptions() {
  return { ...authCookieBase };
}

module.exports = {
  AUTH_COOKIE_NAME,
  signUser,
  verifyToken,
  getAuthCookieOptions,
};
