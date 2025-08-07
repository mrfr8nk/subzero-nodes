import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import cors from "cors";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { adminLogin, requireAdmin, requireSuperAdmin } from "./adminAuth";
import { insertDeploymentSchema, insertTransactionSchema, insertAppSettingsSchema } from "@shared/schema";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "./emailService";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration for production domains
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://subzero-deploy.koyeb.app',
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  ].filter((origin): origin is string => origin !== null);
  
  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  };
  
  app.use(cors(corsOptions));
  
  // Auth middleware
  await setupAuth(app);

  // Maintenance mode middleware - check before all routes except maintenance and admin
  const maintenanceMiddleware = async (req: any, res: any, next: any) => {
    const url = req.originalUrl || req.url;
    
    // Skip maintenance check for maintenance info, admin routes, and auth routes
    if (url.startsWith('/api/maintenance') || 
        url.startsWith('/api/admin') || 
        url.startsWith('/api/auth') || 
        url.startsWith('/favicon.ico') ||
        url.includes('vite') ||
        url.includes('@')) {
      return next();
    }

    // Check if user is admin - admins can bypass maintenance mode
    const isAdmin = req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'super_admin');
    if (isAdmin) {
      return next();
    }

    try {
      const maintenanceMode = await storage.isMaintenanceModeEnabled();
      if (maintenanceMode) {
        // For API requests, return JSON response
        if (url.startsWith('/api/')) {
          return res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Site is currently under maintenance. Please try again later.' 
          });
        }
        // For regular requests, this will be handled by the frontend router
        return next();
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
    
    next();
  };

  app.use(maintenanceMiddleware);

  // Google OAuth routes
  app.get('/api/auth/google', (req, res, next) => {
    // Store referral code in session if provided
    if (req.query.ref) {
      (req.session as any).referralCode = req.query.ref;
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
    async (req: any, res) => {
      try {
        // Handle referral code if stored in session
        if ((req.session as any).referralCode && req.user) {
          const referrer = await storage.getUserByReferralCode((req.session as any).referralCode);
          if (referrer && req.user._id.toString() !== referrer._id.toString()) {
            // Check if referral already exists to avoid duplicates
            const existingReferrals = await storage.getUserReferrals(referrer._id.toString());
            const alreadyReferred = existingReferrals.some(ref => 
              ref.referredId.toString() === req.user._id.toString()
            );
            
            if (!alreadyReferred) {
              await storage.createReferral({
                referrerId: referrer._id.toString(),
                referredId: req.user._id.toString(),
                rewardClaimed: false,
                rewardAmount: 50,
              });
              
              // Award referral bonus
              await storage.updateUserBalance(referrer._id.toString(), 50);
              await storage.createTransaction({
                userId: referrer._id.toString(),
                type: "referral",
                amount: 50,
                description: "Referral bonus for new user signup",
              });
            }
          }
          // Clear referral code from session
          delete (req.session as any).referralCode;
        }
      } catch (error) {
        console.error('Error processing Google OAuth referral:', error);
      }
      
      // Track user IP for login/registration
      try {
        const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        if (userIp && req.user) {
          await storage.updateUserIp(req.user._id.toString(), userIp);
        }
      } catch (error) {
        console.error('Error tracking user IP:', error);
      }
      
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Maintenance mode routes (available to all)
  app.get('/api/maintenance/info', async (req, res) => {
    try {
      const [maintenanceMessage, estimatedTime] = await Promise.all([
        storage.getAppSetting('maintenance_message'),
        storage.getAppSetting('maintenance_estimated_time')
      ]);

      res.json({
        message: maintenanceMessage?.value,
        estimatedTime: estimatedTime?.value
      });
    } catch (error) {
      console.error('Error getting maintenance info:', error);
      res.status(500).json({ error: 'Failed to get maintenance info' });
    }
  });

  // Check if site is in maintenance mode
  app.get('/api/maintenance/status', async (req, res) => {
    try {
      const isMaintenanceMode = await storage.isMaintenanceModeEnabled();
      const isAdmin = req.user && ((req.user as any).isAdmin || (req.user as any).role === 'admin' || (req.user as any).role === 'super_admin');
      
      res.json({ 
        maintenanceMode: isMaintenanceMode,
        canBypass: isAdmin 
      });
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      res.status(500).json({ error: 'Failed to check maintenance status' });
    }
  });

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

      // Get user IP for registration tracking
      const registrationIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      
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
        registrationIp,
        lastLoginIp: registrationIp,
        ipHistory: registrationIp ? [registrationIp] : [],
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
      req.login(user, async (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: 'Login failed' });
        }
        
        // Track user IP for login
        try {
          const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
          if (userIp) {
            await storage.updateUserIp(user._id.toString(), userIp);
          }
        } catch (error) {
          console.error('Error tracking user IP:', error);
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

  // Admin authentication routes
  app.post('/api/admin/login', adminLogin);

  // Admin dashboard stats
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // User management routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = await storage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Update user status (ban/unban/restrict)
  app.patch('/api/admin/users/:userId/status', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { status, restrictions } = req.body;
    
    if (!status || !['active', 'banned', 'restricted'].includes(status)) {
      return res.status(400).json({ message: 'Valid status required: active, banned, or restricted' });
    }

    try {
      await storage.updateUserStatus(userId, status, restrictions);
      
      // Create notification
      await storage.createAdminNotification({
        type: 'user_status_change',
        title: 'User Status Changed',
        message: `User status changed to ${status}`,
        data: { userId, status, restrictions },
        read: false
      });
      
      res.json({ message: 'User status updated successfully' });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  // Update user coins
  app.patch('/api/admin/users/:userId/coins', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adminId = (req.user as any)?._id?.toString();
    
    if (typeof amount !== 'number') {
      return res.status(400).json({ message: 'Amount must be a number' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    try {
      await storage.updateUserCoins(userId, amount, reason, adminId);
      res.json({ message: 'User coins updated successfully' });
    } catch (error) {
      console.error('Error updating user coins:', error);
      res.status(500).json({ message: 'Failed to update user coins' });
    }
  });

  // Promote user to admin (super admin only)
  app.patch('/api/admin/users/:userId/promote', requireSuperAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = (req.user as any)?._id?.toString();

    try {
      await storage.promoteToAdmin(userId, adminId);
      res.json({ message: 'User promoted to admin successfully' });
    } catch (error) {
      console.error('Error promoting user:', error);
      res.status(500).json({ message: 'Failed to promote user' });
    }
  });

  // Get users by IP
  app.get('/api/admin/users/by-ip/:ip', requireAdmin, async (req, res) => {
    const { ip } = req.params;
    
    try {
      const users = await storage.getUsersByIp(ip);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users by IP:', error);
      res.status(500).json({ message: 'Failed to fetch users by IP' });
    }
  });

  // Admin notifications
  app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.patch('/api/admin/notifications/:id/read', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
      await storage.markNotificationRead(id);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // App settings management
  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllAppSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching app settings:', error);
      res.status(500).json({ message: 'Failed to fetch app settings' });
    }
  });

  // Get specific setting
  app.get('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    const { key } = req.params;
    
    try {
      const setting = await storage.getAppSetting(key);
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Error fetching app setting:', error);
      res.status(500).json({ message: 'Failed to fetch app setting' });
    }
  });

  // Update app setting
  app.put('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    const { key } = req.params;
    const { value, description } = req.body;
    const adminId = (req.user as any)?._id?.toString();
    
    try {
      const settingData = insertAppSettingsSchema.parse({
        key,
        value,
        description,
        updatedBy: adminId
      });
      
      const setting = await storage.setAppSetting(settingData);
      res.json(setting);
    } catch (error) {
      console.error('Error updating app setting:', error);
      res.status(500).json({ message: 'Failed to update app setting' });
    }
  });

  // Admin maintenance mode routes
  app.get('/api/admin/maintenance/status', requireAdmin, async (req, res) => {
    try {
      const isEnabled = await storage.isMaintenanceModeEnabled();
      const [message, estimatedTime] = await Promise.all([
        storage.getAppSetting('maintenance_message'),
        storage.getAppSetting('maintenance_estimated_time')
      ]);

      res.json({
        enabled: isEnabled,
        message: message?.value || '',
        estimatedTime: estimatedTime?.value || ''
      });
    } catch (error) {
      console.error('Error getting maintenance status:', error);
      res.status(500).json({ error: 'Failed to get maintenance status' });
    }
  });

  app.post('/api/admin/maintenance/toggle', requireAdmin, async (req, res) => {
    try {
      const { enabled, message, estimatedTime } = req.body;
      const adminId = (req.user as any)?._id?.toString();

      await storage.setMaintenanceMode(enabled, adminId, message);
      
      if (estimatedTime) {
        await storage.setAppSetting({
          key: 'maintenance_estimated_time',
          value: estimatedTime,
          description: 'Estimated maintenance completion time',
          updatedBy: adminId
        });
      }

      res.json({ 
        message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
        enabled 
      });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      res.status(500).json({ error: 'Failed to toggle maintenance mode' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
