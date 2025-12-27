import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import logger from "../utils/logger";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    (accessToken, refreshToken, profile, done) => {
      // Cast profile to any or your User type to bypass the strict check here
      // because your controller will handle the conversion later
      return done(null, profile as any);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
