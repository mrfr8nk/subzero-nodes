import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MongoStore from "connect-mongo";
import { storage } from "./storage";
import { connectToMongoDB } from "./db";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  const sessionStore = MongoStore.create({
    mongoUrl: process.env.DATABASE_URL!,
    touchAfter: 24 * 3600, // lazy session update
    ttl: sessionTtl / 1000, // TTL in seconds
  });

  return session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || !!process.env.KOYEB_PUBLIC_DOMAIN,
      maxAge: sessionTtl,
      sameSite: (process.env.NODE_ENV === 'production' || !!process.env.KOYEB_PUBLIC_DOMAIN) ? 'none' : 'lax',
    },
  });
}

export async function setupAuth(app: Express) {
  // Ensure MongoDB connection
  await connectToMongoDB();

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Dynamic callback URL based on environment
  let callbackURL = 'http://localhost:5000/api/auth/google/callback';
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    callbackURL = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  } else if (process.env.KOYEB_PUBLIC_DOMAIN) {
    callbackURL = `https://${process.env.KOYEB_PUBLIC_DOMAIN}/api/auth/google/callback`;
  } else if (process.env.NODE_ENV === 'production') {
    // For production deployments, try to detect the domain
    callbackURL = `https://subzero-deploy.koyeb.app/api/auth/google/callback`;
  }

  console.log('Google OAuth callback URL:', callbackURL);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user information from Google profile
      const userData = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        profileImageUrl: profile.photos?.[0]?.value || '',
        authProvider: 'google' as const,
        emailVerified: true,
        coinBalance: 100,
      };

      // Upsert user in database (referral handling is done inside upsertUser)
      const user = await storage.upsertUser(userData);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user._id.toString());
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/');
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect('/');
    });
  });

  // Get current user endpoint
  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};