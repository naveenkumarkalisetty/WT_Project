const passport = require('passport');
const {RegisteredBase} = require('../model/RegisteredData'); // Adjust the path as necessary
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/auth/google/callback"
    },
    async function(accessToken, refreshToken, profile, done) { // refreshToken is not used in this case
        const email = profile.emails[0].value;
        const existingUser = await RegisteredBase.findOne({ email });

        if (existingUser) {
            return done(null, existingUser);
        }else {
            return done(null, email);
        }
    },

    passport.serializeUser((user, done) => {
        done(null, user);
    }),
    passport.deserializeUser((user, done) => {
        done(null, user);
    })
))
