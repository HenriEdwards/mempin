const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const userModel = require('../models/userModel');

function configurePassport(passportInstance) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth environment variables are not configured');
  }

  passportInstance.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_REDIRECT_URI ||
          'http://localhost:4000/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google account does not expose email'));
          }

          const user = await userModel.upsertGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName || profile.name?.givenName || 'User',
            avatarUrl: profile.photos?.[0]?.value || null,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

module.exports = configurePassport;
