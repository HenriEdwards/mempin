const { AUTH_COOKIE_NAME, verifyToken } = require('../utils/jwt');

function readTokenFromRequest(req) {
  return req.cookies?.[AUTH_COOKIE_NAME];
}

function requireAuth(req, res, next) {
  const token = readTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function optionalAuth(req, _res, next) {
  const token = readTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    req.user = verifyToken(token);
  } catch (error) {
    // Ignore invalid tokens but continue as unauthenticated
  }
  return next();
}

module.exports = {
  requireAuth,
  optionalAuth,
};
