import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { displayName, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const avatar = photos?.[0]?.value;

        if (!email) {
          return done(new Error("No email provided from Google"), null);
        }

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // If not found, create new user
        if (!user) {
          user = await prisma.user.create({
            data: {
              username: email.split("@")[0],
              email,
              password: "",
              avatar,
              status: "active",
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
