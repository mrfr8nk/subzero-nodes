import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDeploymentSchema, insertTransactionSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import passport from "passport";
import { sendVerificationEmail, sendWelcomeEmail } from "./emailService";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const deploymentStats = await storage.getDeploymentStats(userId);
      const referralStats = await storage.getReferralStats(userId);
      
      res.json({
        coinBalance: user?.coinBalance || 0,
        ...deploymentStats,
        ...referralStats,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent activity
  app.get('/api/dashboard/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId, 10);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Deployments
  app.get('/api/deployments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deployments = await storage.getUserDeployments(userId);
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.post('/api/deployments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const deploymentData = insertDeploymentSchema.parse({
        ...req.body,
        userId,
      });

      // Check if user has enough coins
      const userBalance = user.coinBalance || 0;
      const cost = deploymentData.cost || 25;
      if (userBalance < cost) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      const deployment = await storage.createDeployment(deploymentData);
      res.json(deployment);
    } catch (error) {
      console.error("Error creating deployment:", error);
      res.status(400).json({ message: "Failed to create deployment" });
    }
  });

  app.patch('/api/deployments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      const { status } = req.body;
      
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment || deployment.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      await storage.updateDeploymentStatus(deploymentId, status);
      res.json({ message: "Deployment status updated" });
    } catch (error) {
      console.error("Error updating deployment status:", error);
      res.status(500).json({ message: "Failed to update deployment status" });
    }
  });

  // Wallet
  app.get('/api/wallet/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/claim-daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Award daily reward (simplified - in production, check if already claimed today)
      await storage.updateUserBalance(userId, 10);
      await storage.createTransaction({
        userId,
        type: "daily_reward",
        amount: 10,
        description: "Daily login bonus",
        relatedId: null,
      });

      res.json({ message: "Daily reward claimed", amount: 10 });
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      res.status(500).json({ message: "Failed to claim daily reward" });
    }
  });

  // Referrals
  app.get('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/referrals/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const stats = await storage.getReferralStats(userId);
      
      res.json({
        ...stats,
        referralCode: user?.referralCode,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Public route for referral validation
  app.get('/api/referral/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const user = await storage.getUserByReferralCode(code);
      
      if (user) {
        res.json({ valid: true, referrerId: user.id });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Email verification routes
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      const user = await storage.verifyEmail(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Send welcome email
      await sendWelcomeEmail(user.email!, user.firstName || undefined);
      
      res.json({ message: "Email verified successfully", verified: true });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });
  
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Generate new verification token
      const verificationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.setEmailVerificationToken(user.id, verificationToken, expiresAt);
      
      // Send verification email
      const baseUrl = `https://${req.hostname}`;
      const emailSent = await sendVerificationEmail(user.email!, verificationToken, baseUrl);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }
      
      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Local authentication routes
  app.post('/api/auth/local/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName, referralCode } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Validate referral code if provided
      let referrerId: string | undefined;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          referrerId = referrer.id;
        }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user (not verified yet)
      const user = await storage.createLocalUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        referredById: referrerId,
      });
      
      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.setEmailVerificationToken(user.id, verificationToken, expiresAt);
      
      // Send verification email
      const baseUrl = `https://${req.hostname}`;
      const emailSent = await sendVerificationEmail(email, verificationToken, baseUrl);
      
      if (!emailSent) {
        console.error('Failed to send verification email to:', email);
        // Don't fail the signup, but log the error
      }
      
      res.json({ 
        message: "Account created successfully. Please check your email to verify your account.",
        requiresVerification: true
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  app.post('/api/auth/local/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Check if email is verified for local auth users
      if (user.authProvider === 'local' && !user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in",
          requiresVerification: true,
          email: user.email
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Login successful" });
      });
    })(req, res, next);
  });

  const httpServer = createServer(app);
  return httpServer;
}
