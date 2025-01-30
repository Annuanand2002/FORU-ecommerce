const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user-schema');
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      if (user.blocked) {
        console.log('Blocked User');
        return done(null, false, { message: 'You have been blocked. Please contact customer service.' });
      }
      console.log('User Found:', user);
      return done(null, user);
    }

    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      
      user.googleId = profile.id; 
      user.name = profile.displayName; 
      await user.save();
      return done(null, user);
    } else {
  
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        isVerified: true, 
      });

      await newUser.save();
      return done(null, newUser);
    }

  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id); // Store user ID in the session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); 
  } catch (error) {
    done(error);
  }
});

module.exports = passport;

