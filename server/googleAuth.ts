import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MongoStore from "connect-mongo";
import { storage } from "./storage";
import { connectToMongoDB } from "./db";
import crypto from "crypto";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  const sessionStore = MongoStore.create({
    mongoUrl: process.env.DATABASE_URL!,
    touchAfter: 24 * 3600, // lazy session update
    ttl: sessionTtl / 1000, // TTL in seconds
    collectionName: 'sessions',
    stringify: false,
    autoRemove: 'native', // Use MongoDB TTL for automatic cleanup
    autoRemoveInterval: 10, // Check for expired sessions every 10 minutes
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
    genid: () => {
      return crypto.randomBytes(32).toString('hex');
    }
  });
}

// Function to dynamically detect the callback URL
function getDynamicCallbackURL(): string {
  // Check various environment variables that indicate the hosting platform
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  }
  
  if (process.env.KOYEB_PUBLIC_DOMAIN) {
    return `https://${process.env.KOYEB_PUBLIC_DOMAIN}/api/auth/google/callback`;
  }
  
  // For Render.com - they set RENDER_EXTERNAL_URL
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/api/auth/google/callback`;
  }
  
  // Check for Render's internal hostname patterns
  if (process.env.RENDER_INTERNAL_HOSTNAME && process.env.NODE_ENV === 'production') {
    // Render typically uses .onrender.com domains
    const hostname = process.env.RENDER_INTERNAL_HOSTNAME;
    if (hostname.includes('onrender.com')) {
      return `https://${hostname}/api/auth/google/callback`;
    }
  }
  
  // Check for other common hosting environment variables
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
  }
  
  if (process.env.HEROKU_APP_NAME) {
    return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/api/auth/google/callback`;
  }
  
  // If we have a custom CALLBACK_URL set, use it
  if (process.env.CALLBACK_URL) {
    return process.env.CALLBACK_URL;
  }
  
  // For production without specific platform detection, try to guess from PORT
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    // This is a fallback - you should ideally set CALLBACK_URL for production
    console.warn('Production environment detected but no platform-specific URL found. Please set CALLBACK_URL environment variable.');
    return `https://subzero-deploy.onrender.com/api/auth/google/callback`;
  }
  
  // Development fallback
  return 'http://localhost:5000/api/auth/google/callback';
}

// Function to clean up problematic sessions
async function cleanupSessions() {
  try {
    const db = await connectToMongoDB();
    // Drop the sessions collection to fix duplicate key issues
    await db.collection('sessions').drop().catch(() => {
      // Collection might not exist, ignore the error
    });
    console.log('Sessions collection cleaned up');
  } catch (error) {
    console.log('Session cleanup completed (collection may not have existed)');
  }
}

export async function setupAuth(app: Express) {
  // Ensure MongoDB connection
  await connectToMongoDB();
  
  // Clean up sessions on startup to fix duplicate key issues
  await cleanupSessions();

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Get dynamic callback URL
  const callbackURL = getDynamicCallbackURL();
  console.log('Google OAuth callback URL:', callbackURL);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await storage.getUserByGoogleId(profile.id);
      
      // Extract user information from Google profile
      const userData = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        profileImageUrl: profile.photos?.[0]?.value || '',
        authProvider: 'google' as const,
        emailVerified: true,
        coinBalance: existingUser?.coinBalance ?? 100,
        // Required fields for InsertUser type
        status: 'active' as const,
        role: 'user' as const,
        isAdmin: false,
        restrictions: [],
        ipHistory: [],
        deviceHistory: [],
        // Device and bot limits
        maxAccountsPerDevice: 1,
        deviceAccountCount: 0,
        maxBots: 10,
        currentBotCount: 0,
      };

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
    async (req, res) => {
      try {
        const user = req.user as any;
        if (user) {
          await storage.updateUserActivity(user._id.toString());
        }
      } catch (error) {
        console.error('Error in Google OAuth callback:', error);
      }
      
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