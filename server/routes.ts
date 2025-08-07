import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { insertDeploymentSchema, insertTransactionSchema } from "@shared/schema";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "./emailService";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Auth status route
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Local email signup route
  app.post('/api/auth/local/signup', async (req, res) => {
    try {
      const { firstName, lastName, email, password, referralCode } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with unverified status
      const newUser = await storage.createLocalUser({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpiry,
        isVerified: false,
        referralCode: referralCode || undefined,
      });

      // Send verification email with dynamic URL from request
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host') || req.headers['x-forwarded-host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      const emailSent = await sendVerificationEmail(email, verificationToken, baseUrl);
      
      if (!emailSent) {
        console.error('Failed to send verification email');
        // Continue anyway, user can request resend
      }

      res.status(201).json({ 
        message: 'Account created successfully. Please check your email to verify your account.',
        userId: newUser.insertedId,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  // Email verification route
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      const user = await storage.getUserByVerificationToken(token as string);
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
        return res.status(400).json({ message: 'Verification token has expired' });
      }

      // Verify the user
      await storage.verifyUser(user._id.toString());

      // Send welcome email with dynamic URL
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host') || req.headers['x-forwarded-host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      await sendWelcomeEmail(user.email, user.firstName, baseUrl);

      res.json({ message: 'Email verified successfully. You can now sign in.' });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Email verification failed' });
    }
  });

  // Local email login route
  app.post('/api/auth/local/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email before signing in' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Log the user in using passport session
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ message: 'Login successful', user: { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Forgot password route
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Return success even if user not found for security reasons
        return res.json({ message: 'If an account with that email exists, we have sent password reset instructions.' });
      }

      if (user.authProvider !== 'local') {
        return res.status(400).json({ message: 'Password reset is only available for email/password accounts. Please sign in with Google instead.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await storage.setPasswordResetToken(email, resetToken, resetExpiry);

      // Send password reset email
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host') || req.headers['x-forwarded-host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      const emailSent = await sendPasswordResetEmail(email, resetToken, baseUrl);
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
        return res.status(500).json({ message: 'Failed to send password reset email. Please try again.' });
      }

      res.json({ message: 'If an account with that email exists, we have sent password reset instructions.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Reset password route
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Reset token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      if (user.resetPasswordExpiry && new Date() > user.resetPasswordExpiry) {
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await storage.resetPassword(user._id.toString(), hashedPassword);

      res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Resend verification email route
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: 'No account found with this email address' });
      }

      if (user.authProvider !== 'local') {
        return res.status(400).json({ message: 'Email verification is only required for email/password accounts' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'This email address is already verified' });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update verification token in database
      await storage.updateVerificationToken(email, verificationToken, verificationTokenExpiry);

      // Send verification email
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host') || req.headers['x-forwarded-host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      const emailSent = await sendVerificationEmail(email, verificationToken, baseUrl);
      
      if (!emailSent) {
        console.error('Failed to resend verification email');
        return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
      }

      res.json({ message: 'Verification email has been sent. Please check your inbox and spam folder.' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Failed to resend verification email' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
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
      const userId = req.user._id.toString();
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
      const userId = req.user._id.toString();
      const deployments = await storage.getUserDeployments(userId);
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.post('/api/deployments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
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
      const deploymentId = req.params.id;
      const { status } = req.body;
      const userId = req.user._id.toString();
      
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment || deployment.userId.toString() !== userId) {
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
      const userId = req.user._id.toString();
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/claim-daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      
      // Award daily reward (simplified - in production, check if already claimed today)
      await storage.updateUserBalance(userId, 10);
      await storage.createTransaction({
        userId,
        type: "daily_reward",
        amount: 10,
        description: "Daily login bonus",
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
      const userId = req.user._id.toString();
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/referrals/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
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
        res.json({ valid: true, referrerId: user._id.toString() });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
