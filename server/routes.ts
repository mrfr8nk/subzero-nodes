import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import cors from "cors";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { adminLogin, requireAdmin, requireSuperAdmin } from "./adminAuth";
import { insertDeploymentSchema, insertTransactionSchema, insertAppSettingsSchema, insertCoinTransferSchema, insertBannedUserSchema } from "@shared/schema";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "./emailService";
import bcrypt from "bcryptjs";
import { WebSocketServer, WebSocket } from 'ws';
import crypto from "crypto";

// Middleware to check if device fingerprint is banned
async function checkDeviceBan(req: any, res: any, next: any) {
  try {
    const deviceFingerprint = req.body?.deviceFingerprint || req.headers['x-device-fingerprint'];
    
    if (deviceFingerprint) {
      const isBanned = await storage.isDeviceFingerprintBanned(deviceFingerprint);
      if (isBanned) {
        return res.status(403).json({ 
          message: 'Access denied: Device is banned from using this service',
          code: 'DEVICE_BANNED'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking device ban:', error);
    next(); // Continue on error to avoid breaking the flow
  }
}

// WebSocket connections for real-time updates
const wsConnections = new Map<string, WebSocket>();
const monitoringDeployments = new Map<string, NodeJS.Timeout>();

// Chat WebSocket connections
interface ChatClient {
  ws: WebSocket;
  userId: string;
  username: string;
  isAdmin: boolean;
  role?: string;
}

const chatClients = new Map<string, ChatClient>();

// Function to broadcast to WebSocket clients
function broadcastToClients(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wsConnections.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      wsConnections.delete(clientId);
    }
  });
}

// Function to broadcast to chat clients
function broadcastToChatClients(type: string, data: any, excludeClientId?: string) {
  const message = JSON.stringify({ type, ...data, timestamp: new Date().toISOString() });
  chatClients.forEach((chatClient, clientId) => {
    if (clientId !== excludeClientId && chatClient.ws.readyState === WebSocket.OPEN) {
      chatClient.ws.send(message);
    } else if (chatClient.ws.readyState !== WebSocket.OPEN) {
      chatClients.delete(clientId);
    }
  });
}

// Function to monitor workflow status for a specific branch
async function monitorWorkflowStatus(branchName: string) {
  try {
    const [githubToken, repoOwner, repoName, workflowFile] = await Promise.all([
      storage.getAppSetting('github_token'),
      storage.getAppSetting('github_repo_owner'),
      storage.getAppSetting('github_repo_name'),
      storage.getAppSetting('github_workflow_file')
    ]);

    if (!githubToken?.value || !repoOwner?.value || !repoName?.value) return;

    const GITHUB_TOKEN = githubToken.value;
    const REPO_OWNER = repoOwner.value;
    const REPO_NAME = repoName.value;
    const WORKFLOW_FILE = workflowFile?.value || 'SUBZERO.yml';

    // Get latest workflow run for this branch
    const runsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${branchName}&per_page=1`;
    const response = await fetch(runsUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const runs = data.workflow_runs || [];
      
      if (runs.length > 0) {
        const latestRun = runs[0];
        broadcastToClients('workflow_status_update', {
          branch: branchName,
          run: {
            id: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            created_at: latestRun.created_at,
            updated_at: latestRun.updated_at,
            html_url: latestRun.html_url
          }
        });

        // If workflow is complete, stop monitoring
        if (latestRun.status === 'completed') {
          const timeoutId = monitoringDeployments.get(branchName);
          if (timeoutId) {
            clearTimeout(timeoutId);
            monitoringDeployments.delete(branchName);
          }
          
          broadcastToClients('workflow_completed', {
            branch: branchName,
            conclusion: latestRun.conclusion,
            completed_at: latestRun.updated_at
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error monitoring workflow for ${branchName}:`, error);
  }
}

// Function to start monitoring a deployment
function startWorkflowMonitoring(branchName: string) {
  // Clear existing monitoring if any
  const existingTimeout = monitoringDeployments.get(branchName);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Monitor every 30 seconds for up to 30 minutes
  let attempts = 0;
  const maxAttempts = 60; // 30 minutes
  
  const monitor = () => {
    if (attempts >= maxAttempts) {
      monitoringDeployments.delete(branchName);
      broadcastToClients('monitoring_timeout', { branch: branchName });
      return;
    }
    
    monitorWorkflowStatus(branchName);
    attempts++;
    
    const timeoutId = setTimeout(monitor, 30000); // 30 seconds
    monitoringDeployments.set(branchName, timeoutId);
  };

  // Start monitoring immediately
  monitor();
}

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



  // User status check middleware - auto logout banned users
  const userStatusMiddleware = async (req: any, res: any, next: any) => {
    // Skip for non-authenticated endpoints and admin endpoints
    const url = req.originalUrl || req.url;
    if (!req.user || 
        url.startsWith('/api/auth') || 
        url.startsWith('/api/admin') ||
        url.startsWith('/favicon.ico') ||
        url.includes('vite') ||
        url.includes('@')) {
      return next();
    }

    try {
      // Check if user is banned or has restricted status
      const currentUser = await storage.getUser(req.user._id.toString());
      if (currentUser && (currentUser.status === 'banned' || currentUser.status === 'restricted')) {
        // Destroy session and force logout
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        
        // For API requests, return JSON response
        if (url.startsWith('/api/')) {
          return res.status(403).json({ 
            error: 'Account Banned', 
            message: 'Your account has been banned. Please contact support.',
            forceLogout: true
          });
        }
        
        // For regular requests, redirect to login
        return res.redirect('/login?error=account_banned');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
    
    next();
  };

  app.use(userStatusMiddleware);

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
      
      // Track user device fingerprint for login/registration
      try {
        const deviceFingerprint = (req.session as any)?.deviceFingerprint;
        if (deviceFingerprint && req.user) {
          await storage.updateUserDeviceFingerprint(req.user._id.toString(), deviceFingerprint);
        }
      } catch (error) {
        console.error('Error tracking user device fingerprint:', error);
      }
      
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Maintenance mode routes (available to all)
  app.get('/api/maintenance/info', async (req, res) => {
    try {
      const [maintenanceMessage, estimatedTime, endTime] = await Promise.all([
        storage.getAppSetting('maintenance_message'),
        storage.getAppSetting('maintenance_estimated_time'),
        storage.getAppSetting('maintenance_end_time')
      ]);

      res.json({
        message: maintenanceMessage?.value,
        estimatedTime: estimatedTime?.value,
        endTime: endTime?.value
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

  // Currency settings for users (public endpoint for authenticated users)
  app.get('/api/currency', isAuthenticated, async (req, res) => {
    try {
      const [currency, rate, symbol] = await Promise.all([
        storage.getAppSetting('currency'),
        storage.getAppSetting('currency_rate'),
        storage.getAppSetting('currency_symbol')
      ]);

      res.json({
        currency: currency?.value || 'USD',
        rate: rate?.value || 0.1,
        symbol: symbol?.value || '$'
      });
    } catch (error) {
      console.error('Error getting currency settings:', error);
      res.status(500).json({ error: 'Failed to get currency settings' });
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

  // User account deletion route
  app.delete('/api/user/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admins from deleting their own accounts through this endpoint
      if (user.isAdmin) {
        return res.status(403).json({ 
          message: 'Admin accounts cannot be self-deleted. Please contact another admin for account removal.' 
        });
      }

      // Delete the user and all associated data
      await storage.deleteUser(userId, userId); // User deletes themselves

      // Clear the session
      req.logout((err: any) => {
        if (err) {
          console.error('Error clearing session after account deletion:', err);
        }
      });

      res.json({ 
        success: true, 
        message: 'Your account has been permanently deleted along with all associated data.' 
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      res.status(500).json({ 
        message: 'Failed to delete account. Please try again.' 
      });
    }
  });

  // User profile routes
  app.get('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        bio: user.bio,
        isAdmin: user.isAdmin,
        role: user.role,
        status: user.status,
        coinBalance: user.coinBalance,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
        preferences: user.preferences || {}
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const { firstName, lastName, username, bio } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First name and last name are required' });
      }

      await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        username: username || '',
        bio: bio || ''
      });

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const preferences = req.body;

      await storage.updateUserPreferences(userId, preferences);
      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  // User password change endpoint
  app.post('/api/user/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id.toString();

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      await storage.changeUserPassword(userId, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.message.includes('not available for this account type')) {
        return res.status(400).json({ message: 'Password change is not available for Google OAuth accounts' });
      }
      if (error.message.includes('Current password is incorrect')) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      res.status(500).json({ message: 'Failed to change password' });
    }
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

      // Get device fingerprint for registration tracking and duplicate account prevention
      const { deviceFingerprint } = req.body;
      
      // Check for existing accounts from same device fingerprint
      if (deviceFingerprint) {
        const existingAccountsFromDevice = await storage.getUsersByDeviceFingerprint(deviceFingerprint);
        
        // Get configurable max accounts per device from admin settings (default to 1)
        const maxAccountsSetting = await storage.getAppSetting('max_accounts_per_device');
        const maxAccountsPerDevice = maxAccountsSetting?.value || 1;
        
        const activeAccounts = existingAccountsFromDevice.filter(user => 
          user.status !== 'banned' && user.status !== 'restricted'
        );
        
        if (activeAccounts.length >= maxAccountsPerDevice) {
          return res.status(400).json({ 
            message: `Multiple accounts detected from this device. Only ${maxAccountsPerDevice} account(s) allowed per device. Contact support if you believe this is an error.`
          });
        }
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
        deviceFingerprint: deviceFingerprint,
        deviceHistory: deviceFingerprint ? [deviceFingerprint] : [],
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
        
        // Track user device fingerprint for login
        try {
          const { deviceFingerprint } = req.body;
          if (deviceFingerprint) {
            await storage.updateUserDeviceFingerprint(user._id.toString(), deviceFingerprint);
          }
        } catch (error) {
          console.error('Error tracking user device fingerprint:', error);
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

  // User deployment branch checking - MUST come before /api/deployments/:id
  app.get('/api/deployments/check-branch', isAuthenticated, async (req, res) => {
    try {
      const { branchName } = req.query;
      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured by admin. Please contact administrator.' });
      }

      const generateBranchName = () => {
        const prefix = 'user-';
        const randomChars = Math.random().toString(36).substring(2, 8);
        return prefix + randomChars;
      };

      const sanitizeBranchName = (name: string) => {
        // Remove invalid characters and ensure it follows GitHub branch naming rules
        return name
          .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with dash
          .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
          .replace(/\.\.+/g, '.') // Replace multiple dots with single dot
          .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
          .replace(/--+/g, '-') // Replace multiple dashes with single dash
          .substring(0, 250); // Limit length
      };

      if (!branchName || branchName.toString().trim() === '') {
        const generatedName = generateBranchName();
        return res.json({ 
          available: true, 
          suggested: generatedName,
          message: `Try this available name: ${generatedName}`
        });
      }

      // Sanitize the branch name
      const originalName = branchName.toString().trim();
      const sanitizedName = sanitizeBranchName(originalName);
      
      if (!sanitizedName) {
        const generatedName = generateBranchName();
        return res.json({ 
          available: false, 
          suggested: generatedName,
          message: `Invalid name. Try: ${generatedName}`
        });
      }

      // Use sanitized name for checking
      const nameToCheck = sanitizedName;

      // Check if branch exists using sanitized name
      const url = `https://api.github.com/repos/${repoOwner.value}/${repoName.value}/git/ref/heads/${nameToCheck}`;
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `token ${githubToken.value}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (response.status === 404) {
          return res.json({ 
            available: true,
            sanitized: originalName !== sanitizedName ? sanitizedName : undefined,
            message: originalName !== sanitizedName ? 
              `Name available! (Auto-corrected to: ${sanitizedName})` : 
              'Name available!'
          });
        } else if (response.ok) {
          // Generate better suggestions when name is taken
          const generateSuggestions = async (baseName: string) => {
            const suggestions = [
              `${baseName}-2`,
              `${baseName}-new`,
              `${baseName}-v2`,
              `${baseName}-${new Date().getFullYear()}`,
              `${baseName}-${Math.floor(Math.random() * 100)}`
            ];
            
            // Check which suggestions are available
            for (const suggestion of suggestions) {
              try {
                const checkUrl = `https://api.github.com/repos/${repoOwner.value}/${repoName.value}/git/ref/heads/${suggestion}`;
                const checkResponse = await fetch(checkUrl, {
                  headers: {
                    'Authorization': `token ${githubToken.value}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                });
                if (checkResponse.status === 404) {
                  return suggestion; // This name is available
                }
              } catch (error) {
                return suggestion; // Assume available if check fails
              }
            }
            // Fallback if all suggestions are taken
            return `${baseName}-${Date.now().toString().slice(-6)}`;
          };
          
          const suggestedName = await generateSuggestions(sanitizedName);
          return res.json({ 
            available: false, 
            suggested: suggestedName,
            sanitized: originalName !== sanitizedName ? sanitizedName : undefined,
            message: `Name '${sanitizedName}' is already taken. Try: ${suggestedName}`
          });
        } else {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Branch check error:', error);
        res.status(500).json({ message: 'Failed to check branch availability' });
      }
    } catch (error) {
      console.error('Error checking branch:', error);
      res.status(500).json({ message: 'Failed to check branch' });
    }
  });

  // Get single deployment by ID
  app.get('/api/deployments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      // Ensure user owns the deployment (unless admin)
      if (deployment.userId.toString() !== userId && !req.user.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(deployment);
    } catch (error) {
      console.error("Error fetching deployment:", error);
      res.status(500).json({ message: "Failed to fetch deployment" });
    }
  });

  app.post('/api/deployments', checkDeviceBan, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const nextChargeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      // Get deployment number for user
      const deploymentNumber = await storage.getNextDeploymentNumber(userId);
      
      const deploymentData = insertDeploymentSchema.parse({
        ...req.body,
        userId,
        deploymentNumber,
        lastChargeDate: now,
        nextChargeDate: nextChargeDate,
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

  // User GitHub deployment - uses admin GitHub settings
  app.post('/api/deployments/github', checkDeviceBan, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { branchName, sessionId, ownerNumber, prefix } = req.body;
      
      if (!branchName || !sessionId || !ownerNumber || !prefix) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Get deployment cost setting
      const deploymentCostSetting = await storage.getAppSetting('deployment_cost');
      const cost = deploymentCostSetting?.value || 25;

      // Check if user has enough coins
      const userBalance = user.coinBalance || 0;
      if (userBalance < cost) {
        return res.status(400).json({ 
          message: `Insufficient coins. You need ${cost} coins to deploy this bot. You currently have ${userBalance} coins.` 
        });
      }

      // Get deployment number for user
      const deploymentNumber = await storage.getNextDeploymentNumber(userId);

      // Get the best available GitHub account
      const githubAccount = await storage.getBestGitHubAccount();
      
      if (!githubAccount) {
        return res.status(400).json({ message: 'No GitHub accounts configured by admin. Please contact administrator.' });
      }

      const GITHUB_TOKEN = githubAccount.token;
      const REPO_OWNER = githubAccount.owner;
      const REPO_NAME = githubAccount.repo;
      const MAIN_BRANCH = 'main';
      const WORKFLOW_FILE = githubAccount.workflowFile;

      // Validate GitHub repository access before proceeding
      try {
        const testUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
        const testResponse = await fetch(testUrl, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!testResponse.ok) {
          console.error('GitHub repository validation failed:', {
            url: testUrl,
            status: testResponse.status,
            statusText: testResponse.statusText
          });
          
          if (testResponse.status === 404) {
            return res.status(400).json({ 
              message: 'GitHub repository not found. Please contact administrator to verify repository settings.' 
            });
          } else if (testResponse.status === 401) {
            return res.status(400).json({ 
              message: 'GitHub access denied. Please contact administrator to verify token permissions.' 
            });
          } else {
            return res.status(400).json({ 
              message: 'GitHub repository access failed. Please contact administrator.' 
            });
          }
        }
      } catch (error) {
        console.error('GitHub repository validation error:', error);
        return res.status(500).json({ 
          message: 'Failed to validate GitHub repository access. Please try again later.' 
        });
      }

      // Sanitize branch name
      const sanitizeBranchName = (name: string) => {
        return name
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/^\.+|\.+$/g, '')
          .replace(/\.\.+/g, '.')
          .replace(/^-+|-+$/g, '')
          .replace(/--+/g, '-')
          .substring(0, 250);
      };

      let sanitizedBranchName = sanitizeBranchName(branchName.trim());
      if (!sanitizedBranchName) {
        return res.status(400).json({ message: 'Invalid branch name. Please provide a valid app name.' });
      }
      
      // Use the exact sanitized name without modifications
      // The frontend should have already validated availability

      // Deduct coins first
      await storage.updateUserBalance(userId, -cost);

      // GitHub API helper
      const makeGitHubRequest = async (method: string, endpoint: string, data: any = null) => {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`;
        const config: any = {
          method,
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SUBZERO-Deployment-Bot'
          }
        };
        if (data) {
          config.body = JSON.stringify(data);
          config.headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, config);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`GitHub API Error Details:`, {
            url,
            status: response.status,
            statusText: response.statusText,
            errorText,
            method: config.method || 'GET'
          });
          throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        if (response.status === 204) {
          return {};
        }
        
        return await response.json();
      };

      try {
        // Check if branch already exists - if it does, reject the deployment
        try {
          await makeGitHubRequest('GET', `git/refs/heads/${sanitizedBranchName}`);
          // Branch exists, return error
          return res.status(400).json({ message: `Branch name '${sanitizedBranchName}' is already taken. Please choose a different name.` });
        } catch (error) {
          // Branch doesn't exist, which is what we want - continue with deployment
        }
        
        // Create branch from main
        const mainBranchData = await makeGitHubRequest('GET', `git/refs/heads/${MAIN_BRANCH}`);
        const mainSha = mainBranchData.object.sha;
        
        await makeGitHubRequest('POST', 'git/refs', {
          ref: `refs/heads/${sanitizedBranchName}`,
          sha: mainSha
        });

        // 2. Update settings.js (exact same as admin deployment)
        const fileData = await makeGitHubRequest('GET', `contents/settings.js?ref=${sanitizedBranchName}`);
        const newContent = `module.exports = {
  SESSION_ID: "${sessionId}",
  OWNER_NUMBER: "${ownerNumber}", 
  PREFIX: "${prefix}"
};`;
        
        await makeGitHubRequest('PUT', 'contents/settings.js', {
          message: `Update settings.js for ${sanitizedBranchName}`,
          content: Buffer.from(newContent).toString('base64'),
          sha: fileData.sha,
          branch: sanitizedBranchName
        });
        
        // 3. Update workflow file (exact same as admin deployment)
        const workflowContent = `name: SUBZERO-MD-X-MR-FRANK

on:
  workflow_dispatch:

jobs:
  loop-task:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm install

      - name: Run Bot (loop & auto-restart if crash)
        run: |
          echo "Running SUBZERO-MD in auto-restart mode..."
          timeout 18000 bash -c 'while true; do npm start || echo "Bot crashed, restarting..."; sleep 2; done'

      - name: Re-Trigger Workflow
        if: always()
        run: |
          echo "Re-running workflow..."
          curl -X POST \\
            -H "Authorization: Bearer \\$\{{ secrets.SUBZERO }}" \\
            -H "Accept: application/vnd.github.v3+json" \\
            https://api.github.com/repos/\\$\{{ github.repository }}/actions/workflows/${WORKFLOW_FILE}/dispatches \\
            -d '{"ref":"${sanitizedBranchName}"}'`;

        try {
          const existingFile = await makeGitHubRequest('GET', `contents/.github/workflows/${WORKFLOW_FILE}?ref=${sanitizedBranchName}`);
          
          // Update existing file
          await makeGitHubRequest('PUT', `contents/.github/workflows/${WORKFLOW_FILE}`, {
            message: `Update workflow to use ${sanitizedBranchName} branch`,
            content: Buffer.from(workflowContent).toString('base64'),
            sha: existingFile.sha,
            branch: sanitizedBranchName
          });
        } catch (error) {
          // Create new file if it doesn't exist
          await makeGitHubRequest('PUT', `contents/.github/workflows/${WORKFLOW_FILE}`, {
            message: `Create workflow for ${sanitizedBranchName} branch`,
            content: Buffer.from(workflowContent).toString('base64'),
            branch: sanitizedBranchName
          });
        }
        
        // 4. Trigger workflow (exact same as admin deployment)
        await makeGitHubRequest('POST', `actions/workflows/${WORKFLOW_FILE}/dispatches`, {
          ref: sanitizedBranchName
        });

        // Create deployment record
        const now = new Date();
        const nextChargeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const deploymentData = insertDeploymentSchema.parse({
          userId,
          name: sanitizedBranchName,
          branchName: sanitizedBranchName,
          deploymentNumber,
          status: "deploying",
          configuration: `GitHub: ${sanitizedBranchName}`,
          cost,
          lastChargeDate: now,
          nextChargeDate: nextChargeDate,
        });

        const deployment = await storage.createDeployment(deploymentData);

        res.json({ 
          success: true, 
          message: 'Deployment started successfully!', 
          branch: sanitizedBranchName,
          deployment 
        });

      } catch (githubError) {
        // Refund coins if GitHub deployment fails
        await storage.updateUserBalance(userId, cost);
        throw githubError;
      }

    } catch (error) {
      console.error("Error creating GitHub deployment:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
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

  // Coin claiming routes
  app.get('/api/coins/claim-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date();
      const lastClaim = user.lastClaimDate;
      const canClaim = !lastClaim || (now.getTime() - lastClaim.getTime()) >= 24 * 60 * 60 * 1000; // 24 hours
      
      let timeUntilNextClaim = 0;
      if (!canClaim && lastClaim) {
        const nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
        timeUntilNextClaim = Math.max(0, nextClaimTime.getTime() - now.getTime());
      }

      // Get admin-configured claim amount
      const claimAmountSetting = await storage.getAppSetting('daily_claim_amount');
      const claimAmount = claimAmountSetting?.value || 50; // Default 50 coins

      res.json({
        canClaim,
        timeUntilNextClaim,
        claimAmount,
        lastClaimDate: lastClaim
      });
    } catch (error) {
      console.error('Error getting claim status:', error);
      res.status(500).json({ message: 'Failed to get claim status' });
    }
  });

  app.post('/api/coins/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date();
      const lastClaim = user.lastClaimDate;
      
      // Check if 24 hours have passed
      if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
        const nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
        return res.status(400).json({ 
          message: 'Daily claim not available yet',
          nextClaimTime
        });
      }

      // Get admin-configured claim amount
      const claimAmountSetting = await storage.getAppSetting('daily_claim_amount');
      const claimAmount = claimAmountSetting?.value || 50;

      // Update user's last claim date and coin balance
      await storage.updateUserClaimDate(userId, now);
      await storage.updateUserBalance(userId, claimAmount);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'daily_claim',
        amount: claimAmount,
        description: 'Daily coin claim reward'
      });

      // Get updated user balance
      const updatedUser = await storage.getUser(userId);
      const newBalance = updatedUser?.coinBalance || (user.coinBalance + claimAmount);

      res.json({
        message: 'Coins claimed successfully',
        amount: claimAmount,
        newBalance: newBalance
      });
    } catch (error) {
      console.error('Error claiming coins:', error);
      res.status(500).json({ message: 'Failed to claim coins' });
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
      const search = req.query.search as string;
      
      let users;
      if (search) {
        users = await storage.searchUsers(search, limit);
      } else {
        users = await storage.getAllUsers(limit, offset);
      }
      
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

  // Demote admin to user (super admin only)
  app.patch('/api/admin/users/:userId/demote', requireSuperAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = (req.user as any)?._id?.toString();

    try {
      // Prevent super admin from demoting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: 'Cannot demote yourself' });
      }

      await storage.demoteFromAdmin(userId, adminId);
      res.json({ message: 'Admin demoted to user successfully' });
    } catch (error) {
      console.error('Error demoting admin:', error);
      res.status(500).json({ message: 'Failed to demote admin' });
    }
  });

  // Delete admin (super admin only)
  app.delete('/api/admin/users/:userId/admin', requireSuperAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = (req.user as any)?._id?.toString();

    try {
      // Prevent super admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
      }

      // Check if target user is actually an admin
      const targetUser = await storage.getUser(userId);
      if (!targetUser || !targetUser.isAdmin) {
        return res.status(400).json({ message: 'User is not an admin' });
      }

      await storage.deleteAdmin(userId, adminId);
      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json({ message: 'Failed to delete admin' });
    }
  });

  // Get users by device fingerprint
  app.get('/api/admin/users/by-device/:fingerprint', requireAdmin, async (req, res) => {
    const { fingerprint } = req.params;
    
    try {
      const users = await storage.getUsersByDeviceFingerprint(fingerprint);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users by device fingerprint:', error);
      res.status(500).json({ message: 'Failed to fetch users by device fingerprint' });
    }
  });

  // Delete user (super admin only)
  app.delete('/api/admin/users/:userId', requireSuperAdmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = (req.user as any)?._id?.toString();

    try {
      await storage.deleteUser(userId, adminId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Device fingerprint banning endpoints
  app.post('/api/admin/device/ban', requireAdmin, async (req, res) => {
    const { deviceFingerprint, reason } = req.body;
    const adminId = (req.user as any)?._id?.toString();
    
    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    try {
      await storage.banDeviceFingerprint(deviceFingerprint, reason, adminId);
      res.json({ message: 'Device fingerprint banned successfully' });
    } catch (error) {
      console.error('Error banning device fingerprint:', error);
      res.status(500).json({ message: 'Failed to ban device fingerprint' });
    }
  });

  app.post('/api/admin/device/unban', requireAdmin, async (req, res) => {
    const { deviceFingerprint } = req.body;
    
    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    try {
      await storage.unbanDeviceFingerprint(deviceFingerprint);
      res.json({ message: 'Device fingerprint unbanned successfully' });
    } catch (error) {
      console.error('Error unbanning device fingerprint:', error);
      res.status(500).json({ message: 'Failed to unban device fingerprint' });
    }
  });

  app.get('/api/admin/device/banned', requireAdmin, async (req, res) => {
    try {
      const bannedDevices = await storage.getBannedDeviceFingerprints();
      res.json(bannedDevices);
    } catch (error) {
      console.error('Error fetching banned device fingerprints:', error);
      res.status(500).json({ message: 'Failed to fetch banned device fingerprints' });
    }
  });

  // Set device fingerprint in session before OAuth
  app.post('/api/auth/set-device-fingerprint', async (req, res) => {
    try {
      const { deviceFingerprint } = req.body;
      
      if (!deviceFingerprint) {
        return res.status(400).json({ message: 'Device fingerprint is required' });
      }
      
      // Store device fingerprint in session for OAuth callback
      (req as any).session.deviceFingerprint = deviceFingerprint;
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting device fingerprint:', error);
      res.status(500).json({ message: 'Failed to set device fingerprint' });
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

  // Admin deployments - get all deployments
  app.get('/api/admin/deployments', requireAdmin, async (req, res) => {
    try {
      const deployments = await storage.getAllDeployments();
      res.json(deployments);
    } catch (error) {
      console.error('Error fetching all deployments:', error);
      res.status(500).json({ message: 'Failed to fetch deployments' });
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

  // Admin delete deployment
  app.delete('/api/admin/deployments/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
      const deployment = await storage.getDeployment(id);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }

      await storage.deleteDeployment(id);
      
      // Log admin action
      await storage.createAdminNotification({
        type: 'admin_action',
        title: 'Deployment Deleted',
        message: `Admin deleted deployment: ${deployment.name}`,
        read: false,
        data: { deploymentId: id, deploymentName: deployment.name }
      });
      
      res.json({ message: 'Deployment deleted successfully' });
    } catch (error) {
      console.error('Error deleting deployment:', error);
      res.status(500).json({ message: 'Failed to delete deployment' });
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

  // Initialize default IP restriction setting if it doesn't exist
  app.post('/api/admin/settings/init-ip-restriction', requireAdmin, async (req, res) => {
    try {
      const existingSetting = await storage.getAppSetting('max_accounts_per_ip');
      
      if (!existingSetting) {
        const adminId = (req.user as any)?._id?.toString();
        const settingData = insertAppSettingsSchema.parse({
          key: 'max_accounts_per_ip',
          value: 1,
          description: 'Maximum number of accounts allowed per IP address',
          updatedBy: adminId
        });
        
        const setting = await storage.setAppSetting(settingData);
        res.json({ message: 'IP restriction setting initialized', setting });
      } else {
        res.json({ message: 'IP restriction setting already exists', setting: existingSetting });
      }
    } catch (error) {
      console.error('Error initializing IP restriction setting:', error);
      res.status(500).json({ message: 'Failed to initialize IP restriction setting' });
    }
  });

  // GitHub deployment settings
  // GitHub Account Management Routes
  
  // Get all GitHub accounts
  app.get('/api/admin/github/accounts', requireAdmin, async (req, res) => {
    try {
      const accounts = await storage.getAllGitHubAccounts();
      res.json(accounts.map(account => ({
        ...account,
        _id: account._id.toString(),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        lastUsed: account.lastUsed?.toISOString()
      })));
    } catch (error) {
      console.error('Error fetching GitHub accounts:', error);
      res.status(500).json({ message: 'Failed to fetch GitHub accounts' });
    }
  });

  // Create GitHub account
  app.post('/api/admin/github/accounts', requireAdmin, async (req, res) => {
    try {
      const { name, token, owner, repo, workflowFile } = req.body;
      
      if (!name || !token || !owner || !repo || !workflowFile) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const account = await storage.createGitHubAccount({
        name,
        token,
        owner,
        repo,
        workflowFile
      });

      res.status(201).json({
        ...account,
        _id: account._id.toString(),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString()
      });
    } catch (error) {
      console.error('Error creating GitHub account:', error);
      res.status(500).json({ message: 'Failed to create GitHub account' });
    }
  });

  // Update GitHub account
  app.patch('/api/admin/github/accounts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await storage.updateGitHubAccount(id, updates);
      res.json({ message: 'GitHub account updated successfully' });
    } catch (error) {
      console.error('Error updating GitHub account:', error);
      res.status(500).json({ message: 'Failed to update GitHub account' });
    }
  });

  // Delete GitHub account
  app.delete('/api/admin/github/accounts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGitHubAccount(id);
      res.json({ message: 'GitHub account deleted successfully' });
    } catch (error) {
      console.error('Error deleting GitHub account:', error);
      res.status(500).json({ message: 'Failed to delete GitHub account' });
    }
  });

  app.get('/api/admin/github/settings', requireAdmin, async (req, res) => {
    try {
      const [githubToken, repoOwner, repoName, mainBranch, workflowFile] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name'),
        storage.getAppSetting('github_main_branch'),
        storage.getAppSetting('github_workflow_file')
      ]);

      res.json({
        githubToken: githubToken?.value || '',
        repoOwner: repoOwner?.value || '',
        repoName: repoName?.value || '',
        mainBranch: mainBranch?.value || 'main',
        workflowFile: workflowFile?.value || 'SUBZERO.yml'
      });
    } catch (error) {
      console.error('Error fetching GitHub settings:', error);
      res.status(500).json({ message: 'Failed to fetch GitHub settings' });
    }
  });

  app.put('/api/admin/github/settings', requireAdmin, async (req, res) => {
    try {
      const { githubToken, repoOwner, repoName, mainBranch, workflowFile } = req.body;
      const adminId = (req.user as any)?._id?.toString();

      // Update all GitHub settings
      const settings = [
        { key: 'github_token', value: githubToken, description: 'GitHub Personal Access Token for deployments' },
        { key: 'github_repo_owner', value: repoOwner, description: 'GitHub repository owner/organization' },
        { key: 'github_repo_name', value: repoName, description: 'GitHub repository name' },
        { key: 'github_main_branch', value: mainBranch || 'main', description: 'Main branch name' },
        { key: 'github_workflow_file', value: workflowFile || 'SUBZERO.yml', description: 'GitHub Actions workflow file name' }
      ];

      for (const setting of settings) {
        const settingData = insertAppSettingsSchema.parse({
          ...setting,
          updatedBy: adminId
        });
        await storage.setAppSetting(settingData);
      }

      res.json({ message: 'GitHub settings updated successfully' });
    } catch (error) {
      console.error('Error updating GitHub settings:', error);
      res.status(500).json({ message: 'Failed to update GitHub settings' });
    }
  });

  // GitHub account management endpoints
  app.get('/api/admin/github/accounts', requireAdmin, async (req, res) => {
    try {
      const accounts = await storage.getAllGitHubAccounts();
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching GitHub accounts:', error);
      res.status(500).json({ error: 'Failed to fetch GitHub accounts' });
    }
  });

  app.post('/api/admin/github/accounts/test/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.testGitHubAccountToken(id);
      res.json(result);
    } catch (error) {
      console.error('Error testing GitHub token:', error);
      res.status(500).json({ error: 'Failed to test GitHub token' });
    }
  });

  app.post('/api/admin/github/accounts', requireAdmin, async (req, res) => {
    try {
      const { name, token, owner, repo, workflowFile } = req.body;
      
      if (!name || !token || !owner || !repo) {
        return res.status(400).json({ error: 'All fields (name, token, owner, repo) are required' });
      }

      const account = await storage.createGitHubAccount({
        name,
        token,
        owner,
        repo,
        workflowFile: workflowFile || 'SUBZERO.yml'
      });

      res.json(account);
    } catch (error) {
      console.error('Error creating GitHub account:', error);
      res.status(500).json({ error: 'Failed to create GitHub account' });
    }
  });

  app.put('/api/admin/github/accounts/:id/active', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      await storage.setGitHubAccountActive(id, active);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating GitHub account status:', error);
      res.status(500).json({ error: 'Failed to update GitHub account status' });
    }
  });

  app.delete('/api/admin/github/accounts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGitHubAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting GitHub account:', error);
      res.status(500).json({ error: 'Failed to delete GitHub account' });
    }
  });

  // User deployment logs endpoints - only access own deployments
  app.get('/api/deployments/:deploymentId/logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const { deploymentId } = req.params;
      
      // Get deployment and verify ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (!deployment.branchName) {
        return res.status(400).json({ message: 'No branch name associated with this deployment' });
      }
      
      const [githubToken, repoOwner, repoName, workflowFile] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name'),
        storage.getAppSetting('github_workflow_file')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const GITHUB_TOKEN = githubToken.value;
      const REPO_OWNER = repoOwner.value;
      const REPO_NAME = repoName.value;
      const WORKFLOW_FILE = workflowFile?.value || 'SUBZERO.yml';

      // Get workflow runs for the specific branch
      const runsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${deployment.branchName}&per_page=10`;
      const runsResponse = await fetch(runsUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!runsResponse.ok) {
        throw new Error(`GitHub API error: ${runsResponse.statusText}`);
      }

      const runsData = await runsResponse.json();
      
      // If no runs found, try to get the latest runs regardless of branch
      let workflowRuns = runsData.workflow_runs || [];
      if (workflowRuns.length === 0) {
        // Try to get any runs for this workflow
        const allRunsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`;
        const allRunsResponse = await fetch(allRunsUrl, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (allRunsResponse.ok) {
          const allRunsData = await allRunsResponse.json();
          // Filter runs that might be related to this deployment
          workflowRuns = (allRunsData.workflow_runs || []).filter((run: any) => 
            run.head_branch === deployment.branchName || 
            run.display_title?.includes(deployment.branchName) ||
            run.display_title?.includes(deployment.name)
          );
        }
      }
      
      // Get detailed logs for the most recent run
      let detailedLogs = [];
      if (workflowRuns.length > 0) {
        const latestRun = workflowRuns[0];
        try {
          // Get jobs for the latest run
          const jobsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${latestRun.id}/jobs`;
          const jobsResponse = await fetch(jobsUrl, {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            const jobs = jobsData.jobs || [];
            
            // Get logs for each job
            for (const job of jobs) {
              const logsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/jobs/${job.id}/logs`;
              const logsResponse = await fetch(logsUrl, {
                headers: {
                  'Authorization': `token ${GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              });

              if (logsResponse.ok) {
                const logs = await logsResponse.text();
                detailedLogs.push({
                  jobName: job.name,
                  status: job.status,
                  conclusion: job.conclusion,
                  logs: logs || 'No logs available'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching detailed logs:', error);
        }
      }

      res.json({
        deployment,
        workflowRuns,
        detailedLogs
      });
    } catch (error) {
      console.error('Error fetching deployment logs:', error);
      res.status(500).json({ message: 'Failed to fetch deployment logs' });
    }
  });

  // User endpoint to get specific workflow run logs  
  app.get('/api/deployments/:deploymentId/runs/:runId/logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const { deploymentId, runId } = req.params;
      
      // Get deployment and verify ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const GITHUB_TOKEN = githubToken.value;
      const REPO_OWNER = repoOwner.value;
      const REPO_NAME = repoName.value;

      // Get jobs for the workflow run
      const jobsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`;
      const jobsResponse = await fetch(jobsUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!jobsResponse.ok) {
        throw new Error(`GitHub API error: ${jobsResponse.statusText}`);
      }

      const jobsData = await jobsResponse.json();
      
      // Get logs for each job
      const logsPromises = jobsData.jobs.map(async (job: any) => {
        try {
          const logsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/jobs/${job.id}/logs`;
          const logsResponse = await fetch(logsUrl, {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (logsResponse.ok) {
            const logs = await logsResponse.text();
            return { jobId: job.id, jobName: job.name, logs };
          }
          return { jobId: job.id, jobName: job.name, logs: 'No logs available' };
        } catch (error) {
          return { jobId: job.id, jobName: job.name, logs: 'Error fetching logs' };
        }
      });

      const allLogs = await Promise.all(logsPromises);
      res.json({ 
        deployment,
        jobs: jobsData.jobs, 
        logs: allLogs 
      });
    } catch (error) {
      console.error('Error fetching specific workflow logs:', error);
      res.status(500).json({ message: 'Failed to fetch workflow logs' });
    }
  });

  // Deployment endpoints using admin-configured GitHub settings
  app.get('/api/admin/deployment/check-branch', requireAdmin, async (req, res) => {
    try {
      const { branchName } = req.query;
      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured. Please configure GitHub settings first.' });
      }

      const generateBranchName = () => {
        const prefix = 'subzero-';
        const randomChars = Math.random().toString(36).substring(2, 8);
        return prefix + randomChars;
      };

      const sanitizeBranchName = (name: string) => {
        // Remove invalid characters and ensure it follows GitHub branch naming rules
        return name
          .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with dash
          .replace(/^\\.+|\\.+$/g, '') // Remove leading/trailing dots
          .replace(/\\.\\.+/g, '.') // Replace multiple dots with single dot
          .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
          .replace(/--+/g, '-') // Replace multiple dashes with single dash
          .substring(0, 250); // Limit length
      };

      if (!branchName || branchName.toString().trim() === '') {
        const generatedName = generateBranchName();
        return res.json({ 
          available: true, 
          suggested: generatedName,
          message: `Try this available name: ${generatedName}`
        });
      }

      // Sanitize the branch name
      const originalName = branchName.toString().trim();
      const sanitizedName = sanitizeBranchName(originalName);
      
      if (!sanitizedName) {
        const generatedName = generateBranchName();
        return res.json({ 
          available: false, 
          suggested: generatedName,
          message: `Invalid name. Try: ${generatedName}`
        });
      }

      // Use sanitized name for checking
      const nameToCheck = sanitizedName;

      // Check if branch exists using sanitized name
      const url = `https://api.github.com/repos/${repoOwner.value}/${repoName.value}/git/ref/heads/${nameToCheck}`;
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `token ${githubToken.value}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (response.status === 404) {
          return res.json({ 
            available: true,
            sanitized: originalName !== sanitizedName ? sanitizedName : undefined,
            message: originalName !== sanitizedName ? 
              `Name available! (Auto-corrected to: ${sanitizedName})` : 
              'Name available!'
          });
        } else if (response.ok) {
          const suggestedName = `${sanitizedName}-${Math.floor(Math.random() * 1000)}`;
          return res.json({ 
            available: false, 
            suggested: suggestedName,
            sanitized: originalName !== sanitizedName ? sanitizedName : undefined,
            message: `Name taken. Try: ${suggestedName}`
          });
        } else {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Branch check error:', error);
        res.status(500).json({ message: 'Failed to check branch availability' });
      }
    } catch (error) {
      console.error('Error checking branch:', error);
      res.status(500).json({ message: 'Failed to check branch' });
    }
  });

  // Delete deployment
  app.delete('/api/deployments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      
      // Get deployment to verify ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      // Check if user owns this deployment or is admin
      const user = await storage.getUser(userId);
      if (deployment.userId.toString() !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this deployment" });
      }
      
      // Delete GitHub branch if it exists
      if (deployment.branchName) {
        try {
          const [githubToken, repoOwner, repoName] = await Promise.all([
            storage.getAppSetting('github_token'),
            storage.getAppSetting('github_repo_owner'),
            storage.getAppSetting('github_repo_name')
          ]);

          if (githubToken?.value && repoOwner?.value && repoName?.value) {
            const deleteUrl = `https://api.github.com/repos/${repoOwner.value}/${repoName.value}/git/refs/heads/${deployment.branchName}`;
            const deleteResponse = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `token ${githubToken.value}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SUBZERO-Deployment-Bot'
              }
            });

            if (deleteResponse.ok || deleteResponse.status === 404) {
              console.log(`Successfully deleted GitHub branch: ${deployment.branchName}`);
            } else {
              console.warn(`Failed to delete GitHub branch ${deployment.branchName}: ${deleteResponse.status} ${deleteResponse.statusText}`);
            }
          }
        } catch (branchDeleteError) {
          console.warn(`Error deleting GitHub branch ${deployment.branchName}:`, branchDeleteError);
          // Continue with deployment deletion even if branch deletion fails
        }
      }
      
      await storage.deleteDeployment(deploymentId);
      res.json({ message: "Deployment deleted successfully" });
    } catch (error) {
      console.error("Error deleting deployment:", error);
      res.status(500).json({ message: "Failed to delete deployment" });
    }
  });

  // Deployment Variables Management

  // Get all variables for a deployment
  app.get('/api/deployments/:id/variables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      
      // Verify deployment ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const variables = await storage.getDeploymentVariables(deploymentId);
      res.json(variables);
    } catch (error) {
      console.error("Error fetching deployment variables:", error);
      res.status(500).json({ message: "Failed to fetch variables" });
    }
  });

  // Create or update a deployment variable
  app.post('/api/deployments/:id/variables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      const { key, value, description, isRequired } = req.body;
      
      // Verify deployment ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const variable = await storage.upsertDeploymentVariable(
        deploymentId, 
        key, 
        value, 
        description, 
        isRequired
      );
      
      res.json(variable);
    } catch (error) {
      console.error("Error creating/updating deployment variable:", error);
      res.status(500).json({ message: "Failed to save variable" });
    }
  });

  // Update a specific deployment variable
  app.put('/api/deployments/:id/variables/:variableId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      const variableId = req.params.variableId;
      const { value } = req.body;
      
      // Verify deployment ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.updateDeploymentVariable(variableId, value);
      res.json({ message: "Variable updated successfully" });
    } catch (error) {
      console.error("Error updating deployment variable:", error);
      res.status(500).json({ message: "Failed to update variable" });
    }
  });

  // Delete a deployment variable
  app.delete('/api/deployments/:id/variables/:variableId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      const variableId = req.params.variableId;
      
      // Verify deployment ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteDeploymentVariable(variableId);
      res.json({ message: "Variable deleted successfully" });
    } catch (error) {
      console.error("Error deleting deployment variable:", error);
      res.status(500).json({ message: "Failed to delete variable" });
    }
  });

  // Redeploy with updated variables
  app.post('/api/deployments/:id/redeploy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const deploymentId = req.params.id;
      
      // Verify deployment ownership
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      
      if (deployment.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      if (!deployment.branchName) {
        return res.status(400).json({ message: "No branch associated with this deployment" });
      }
      
      // Get deployment variables
      const variables = await storage.getDeploymentVariables(deploymentId);
      
      // Get GitHub settings
      const [githubToken, repoOwner, repoName, mainBranch] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name'),
        storage.getAppSetting('github_main_branch')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ 
          message: 'GitHub integration not configured. Administrator needs to set up GitHub token and repository settings.',
          details: 'Contact support to configure GitHub integration for deployment management.',
          missingSettings: {
            token: !githubToken?.value,
            owner: !repoOwner?.value,  
            repo: !repoName?.value
          }
        });
      }

      const GITHUB_TOKEN = githubToken.value;
      const REPO_OWNER = repoOwner.value;
      const REPO_NAME = repoName.value;
      const MAIN_BRANCH = mainBranch?.value || 'main';

      // Helper function for GitHub API requests
      const makeGitHubRequest = async (method: string, endpoint: string, data?: any) => {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`;
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
      };

      // Update settings.js with new variables - create a proper content map
      const variableMap = new Map<string, string>();
      
      // Add deployment variables first
      variables.forEach(v => {
        variableMap.set(v.key.toUpperCase(), v.value);
      });
      
      // Add default variables if not overridden
      const defaultVariables = {
        'SESSION_ID': 'default_session',
        'OWNER_NUMBER': '1234567890',
        'PREFIX': '.'
      };
      
      Object.entries(defaultVariables).forEach(([key, value]) => {
        if (!variableMap.has(key)) {
          variableMap.set(key, value);
        }
      });

      const settingsContent = `module.exports = {
${Array.from(variableMap.entries()).map(([key, value]) => `  ${key}: "${value}",`).join('\n')}
};`;

      // Update settings.js in the branch
      try {
        // Get current file to get its SHA
        const currentFile = await makeGitHubRequest('GET', `contents/settings.js?ref=${deployment.branchName}`);
        
        // Update the file
        await makeGitHubRequest('PUT', 'contents/settings.js', {
          message: `Update settings.js with new variables for ${deployment.name}`,
          content: Buffer.from(settingsContent).toString('base64'),
          sha: currentFile.sha,
          branch: deployment.branchName
        });

        // Trigger workflow to redeploy
        const workflowFile = await storage.getAppSetting('github_workflow_file');
        const WORKFLOW_FILE = workflowFile?.value || 'main.yml';
        await makeGitHubRequest('POST', `actions/workflows/${WORKFLOW_FILE}/dispatches`, {
          ref: deployment.branchName
        });

        res.json({ 
          success: true, 
          message: 'Deployment restarted with updated variables!',
          deployment
        });
      } catch (error) {
        console.error('Redeploy error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Bad credentials') || errorMessage.includes('Unauthorized')) {
          res.status(400).json({ 
            message: 'GitHub authentication failed. Please contact administrator to update GitHub token.',
            details: 'The GitHub token may be expired or invalid.'
          });
        } else {
          res.status(500).json({ 
            message: 'Failed to redeploy with updated variables',
            details: errorMessage
          });
        }
      }
    } catch (error) {
      console.error("Error redeploying:", error);
      res.status(500).json({ message: "Failed to redeploy" });
    }
  });

  app.post('/api/admin/deployment/deploy', requireAdmin, async (req, res) => {
    try {
      let { branchName, sessionId, ownerNumber, prefix } = req.body;
      
      // Get the best available GitHub account
      const githubAccount = await storage.getBestGitHubAccount();
      
      if (!githubAccount) {
        return res.status(400).json({ message: 'No GitHub accounts configured. Please add GitHub accounts first.' });
      }

      const GITHUB_TOKEN = githubAccount.token;
      const REPO_OWNER = githubAccount.owner;
      const REPO_NAME = githubAccount.repo;
      const MAIN_BRANCH = 'main';
      const WORKFLOW_FILE = githubAccount.workflowFile;

      // Validate and sanitize branch name
      const sanitizeBranchName = (name: string) => {
        // Remove invalid characters and ensure it follows GitHub branch naming rules
        return name
          .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with dash
          .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
          .replace(/\.\.+/g, '.') // Replace multiple dots with single dot
          .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
          .replace(/--+/g, '-') // Replace multiple dashes with single dash
          .substring(0, 250); // Limit length
      };
      
      if (!branchName || branchName.trim() === '') {
        const prefix = 'subzero-';
        const randomChars = Math.random().toString(36).substring(2, 8);
        branchName = prefix + randomChars;
      } else {
        branchName = sanitizeBranchName(branchName.trim());
        
        // If sanitization resulted in empty string, generate a name
        if (!branchName) {
          const prefix = 'subzero-';
          const randomChars = Math.random().toString(36).substring(2, 8);
          branchName = prefix + randomChars;
        }
      }

      if (!sessionId || !ownerNumber || !prefix) {
        throw new Error('All fields are required');
      }

      const makeGitHubRequest = async (method: string, endpoint: string, data: any = null) => {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`;
        const config: any = {
          method,
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        };
        
        if (data) {
          config.headers['Content-Type'] = 'application/json';
          config.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, config);
        if (!response.ok) {
          let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
          try {
            const responseText = await response.text();
            if (responseText) {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData?.message || errorMessage;
            }
          } catch (parseError) {
            // If we can't parse the error response, use the status text
            console.error('Failed to parse GitHub error response:', parseError);
          }
          throw new Error(errorMessage);
        }
        
        const responseText = await response.text();
        if (!responseText) {
          return {}; // Return empty object for empty responses
        }
        
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse GitHub response:', parseError);
          throw new Error('Invalid JSON response from GitHub API');
        }
      };

      // 1. Create branch
      const mainRef = await makeGitHubRequest('GET', `git/ref/heads/${MAIN_BRANCH}`);
      await makeGitHubRequest('POST', 'git/refs', {
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha
      });
      
      // 2. Update settings.js
      const fileData = await makeGitHubRequest('GET', `contents/settings.js?ref=${branchName}`);
      const newContent = `module.exports = {
  SESSION_ID: "${sessionId}",
  OWNER_NUMBER: "${ownerNumber}", 
  PREFIX: "${prefix}"
};`;
      
      await makeGitHubRequest('PUT', 'contents/settings.js', {
        message: `Update settings.js for ${branchName}`,
        content: Buffer.from(newContent).toString('base64'),
        sha: fileData.sha,
        branch: branchName
      });
      
      // 3. Update workflow file
      const workflowContent = `name: SUBZERO-MD-X-MR-FRANK

on:
  workflow_dispatch:

jobs:
  loop-task:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm install

      - name: Run Bot (loop & auto-restart if crash)
        run: |
          echo "Running SUBZERO-MD in auto-restart mode..."
          timeout 18000 bash -c 'while true; do npm start || echo "Bot crashed, restarting..."; sleep 2; done'

      - name: Re-Trigger Workflow
        if: always()
        run: |
          echo "Re-running workflow..."
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.SUBZERO }}" \\
            -H "Accept: application/vnd.github.v3+json" \\
            https://api.github.com/repos/\${{ github.repository }}/actions/workflows/${WORKFLOW_FILE}/dispatches \\
            -d '{"ref":"${branchName}"}'`;

      try {
        const existingFile = await makeGitHubRequest('GET', `contents/.github/workflows/${WORKFLOW_FILE}?ref=${branchName}`);
        
        // Update existing file
        await makeGitHubRequest('PUT', `contents/.github/workflows/${WORKFLOW_FILE}`, {
          message: `Update workflow to use ${branchName} branch`,
          content: Buffer.from(workflowContent).toString('base64'),
          sha: existingFile.sha,
          branch: branchName
        });
      } catch (error) {
        // Create new file if it doesn't exist
        await makeGitHubRequest('PUT', `contents/.github/workflows/${WORKFLOW_FILE}`, {
          message: `Create workflow for ${branchName} branch`,
          content: Buffer.from(workflowContent).toString('base64'),
          branch: branchName
        });
      }
      
      // 4. Trigger workflow
      await makeGitHubRequest('POST', `actions/workflows/${WORKFLOW_FILE}/dispatches`, {
        ref: branchName
      });
      
      // Broadcast deployment creation to WebSocket clients
      broadcastToClients('deployment_created', {
        branch: branchName,
        sessionId,
        ownerNumber,
        prefix,
        timestamp: new Date().toISOString()
      });
      
      // Create deployment record with active status
      const deploymentData = {
        userId: (req.user as any)._id.toString(),
        name: branchName,
        branchName: branchName,
        status: 'active', // Set to active immediately when workflow is triggered
        cost: 25, // Default cost
        configuration: JSON.stringify({ sessionId, ownerNumber, prefix }), // Required field
        lastChargeDate: new Date(),
        nextChargeDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };

      await storage.createDeployment(deploymentData);

      // Start monitoring this deployment after a short delay to allow GitHub to process
      setTimeout(() => {
        startWorkflowMonitoring(branchName);
      }, 10000); // 10 second delay
      
      res.json({ 
        success: true, 
        message: 'Deployment successful!',
        branch: branchName,
        workflowUpdated: true
      });
    } catch (error) {
      console.error('Deployment error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: null
      });
    }
  });

  // Get workflow runs for a specific branch
  app.get('/api/admin/deployment/:branchName/logs', requireAdmin, async (req, res) => {
    try {
      const { branchName } = req.params;
      const [githubToken, repoOwner, repoName, workflowFile] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name'),
        storage.getAppSetting('github_workflow_file')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const GITHUB_TOKEN = githubToken.value;
      const REPO_OWNER = repoOwner.value;
      const REPO_NAME = repoName.value;
      const WORKFLOW_FILE = workflowFile?.value || 'SUBZERO.yml';

      // Get workflow runs for the specific branch
      const runsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${branchName}&per_page=10`;
      const runsResponse = await fetch(runsUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!runsResponse.ok) {
        throw new Error(`GitHub API error: ${runsResponse.statusText}`);
      }

      const runsData = await runsResponse.json();
      res.json(runsData.workflow_runs || []);
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      res.status(500).json({ message: 'Failed to fetch workflow logs' });
    }
  });

  // Get specific workflow run logs
  app.get('/api/admin/deployment/run/:runId/logs', requireAdmin, async (req, res) => {
    try {
      const { runId } = req.params;
      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const GITHUB_TOKEN = githubToken.value;
      const REPO_OWNER = repoOwner.value;
      const REPO_NAME = repoName.value;

      // Get jobs for the workflow run
      const jobsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`;
      const jobsResponse = await fetch(jobsUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!jobsResponse.ok) {
        throw new Error(`GitHub API error: ${jobsResponse.statusText}`);
      }

      const jobsData = await jobsResponse.json();
      
      // Get logs for each job
      const logsPromises = jobsData.jobs.map(async (job: any) => {
        try {
          const logsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/jobs/${job.id}/logs`;
          const logsResponse = await fetch(logsUrl, {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (logsResponse.ok) {
            const logs = await logsResponse.text();
            return { jobId: job.id, jobName: job.name, logs };
          }
          return { jobId: job.id, jobName: job.name, logs: 'No logs available' };
        } catch (error) {
          return { jobId: job.id, jobName: job.name, logs: 'Error fetching logs' };
        }
      });

      const allLogs = await Promise.all(logsPromises);
      res.json({ jobs: jobsData.jobs, logs: allLogs });
    } catch (error) {
      console.error('Error fetching specific workflow logs:', error);
      res.status(500).json({ message: 'Failed to fetch workflow logs' });
    }
  });

  // GitHub API test endpoints for branches and workflows
  app.get('/api/admin/github/branches', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const response = await fetch(`https://api.github.com/repos/${repoOwner.value}/${repoName.value}/branches`, {
        headers: {
          'Authorization': `token ${githubToken.value}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const branches = await response.json();
      res.json(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ message: 'Failed to fetch branches' });
    }
  });

  app.get('/api/admin/github/workflows', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const [githubToken, repoOwner, repoName, workflowFile] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name'),
        storage.getAppSetting('github_workflow_file')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const WORKFLOW_FILE = workflowFile?.value || 'main.yml';
      const response = await fetch(`https://api.github.com/repos/${repoOwner.value}/${repoName.value}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=20`, {
        headers: {
          'Authorization': `token ${githubToken.value}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data.workflow_runs || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({ message: 'Failed to fetch workflows' });
    }
  });

  app.delete('/api/admin/github/branches', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { branches } = req.body;
      if (!Array.isArray(branches) || branches.length === 0) {
        return res.status(400).json({ message: 'Invalid branches array' });
      }

      const [githubToken, repoOwner, repoName] = await Promise.all([
        storage.getAppSetting('github_token'),
        storage.getAppSetting('github_repo_owner'),
        storage.getAppSetting('github_repo_name')
      ]);

      if (!githubToken?.value || !repoOwner?.value || !repoName?.value) {
        return res.status(400).json({ message: 'GitHub settings not configured' });
      }

      const results = [];
      for (const branchName of branches) {
        // Don't allow deletion of main/master branches
        if (branchName === 'main' || branchName === 'master') {
          results.push({ branch: branchName, status: 'skipped', reason: 'Protected branch' });
          continue;
        }

        try {
          const response = await fetch(`https://api.github.com/repos/${repoOwner.value}/${repoName.value}/git/refs/heads/${branchName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `token ${githubToken.value}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (response.ok) {
            results.push({ branch: branchName, status: 'deleted' });
          } else {
            results.push({ branch: branchName, status: 'failed', reason: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.push({ branch: branchName, status: 'failed', reason: 'Network error' });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error deleting branches:', error);
      res.status(500).json({ message: 'Failed to delete branches' });
    }
  });

  // Admin maintenance mode routes
  app.get('/api/admin/maintenance/status', requireAdmin, async (req, res) => {
    try {
      const isEnabled = await storage.isMaintenanceModeEnabled();
      const [message, estimatedTime, endTime] = await Promise.all([
        storage.getAppSetting('maintenance_message'),
        storage.getAppSetting('maintenance_estimated_time'),
        storage.getAppSetting('maintenance_end_time')
      ]);

      res.json({
        enabled: isEnabled,
        message: message?.value || '',
        estimatedTime: estimatedTime?.value || '',
        endTime: endTime?.value || null
      });
    } catch (error) {
      console.error('Error getting maintenance status:', error);
      res.status(500).json({ error: 'Failed to get maintenance status' });
    }
  });

  app.post('/api/admin/maintenance/toggle', requireAdmin, async (req, res) => {
    try {
      const { enabled, message, estimatedTime, endTime } = req.body;
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

      // Set maintenance end time for countdown
      if (enabled && endTime) {
        await storage.setAppSetting({
          key: 'maintenance_end_time',
          value: endTime,
          description: 'Maintenance mode automatic end time',
          updatedBy: adminId
        });
      } else if (!enabled) {
        // Clear end time when maintenance is disabled
        await storage.deleteAppSetting('maintenance_end_time');
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

  // Admin coin claim configuration
  app.get('/api/admin/coins/claim-config', requireAdmin, async (req, res) => {
    try {
      const claimAmountSetting = await storage.getAppSetting('daily_claim_amount');
      const claimAmount = claimAmountSetting?.value || 50;
      
      res.json({
        dailyClaimAmount: claimAmount
      });
    } catch (error) {
      console.error('Error getting coin claim config:', error);
      res.status(500).json({ error: 'Failed to get coin claim config' });
    }
  });

  app.post('/api/admin/coins/claim-config', requireAdmin, async (req, res) => {
    try {
      const { dailyClaimAmount } = req.body;
      const adminId = (req.user as any)?._id?.toString();
      
      if (!dailyClaimAmount || dailyClaimAmount < 1 || dailyClaimAmount > 1000) {
        return res.status(400).json({ error: 'Daily claim amount must be between 1 and 1000 coins' });
      }

      await storage.setAppSetting({
        key: 'daily_claim_amount',
        value: parseInt(dailyClaimAmount),
        description: 'Daily coin claim reward amount',
        updatedBy: adminId
      });

      res.json({
        message: 'Daily claim amount updated successfully',
        dailyClaimAmount: parseInt(dailyClaimAmount)
      });
    } catch (error) {
      console.error('Error updating coin claim config:', error);
      res.status(500).json({ error: 'Failed to update coin claim config' });
    }
  });

  // Get deployment fee configuration
  app.get('/api/admin/coins/deployment-fee', requireAdmin, async (req, res) => {
    try {
      const setting = await storage.getAppSetting('deployment_fee');
      const deploymentFee = setting?.value || 5;
      res.json({ deploymentFee });
    } catch (error) {
      console.error('Error fetching deployment fee:', error);
      res.status(500).json({ message: 'Failed to fetch deployment fee' });
    }
  });

  // Update deployment fee
  app.post('/api/admin/coins/deployment-fee', requireAdmin, async (req, res) => {
    try {
      const { deploymentFee } = req.body;
      const adminId = (req.user as any)?._id?.toString();
      
      if (typeof deploymentFee !== 'number' || deploymentFee < 0) {
        return res.status(400).json({ message: 'Valid deployment fee required' });
      }

      await storage.setAppSetting({
        key: 'deployment_fee',
        value: deploymentFee,
        description: 'Fee charged for creating new deployments',
        updatedBy: adminId
      });

      res.json({ message: 'Deployment fee updated successfully' });
    } catch (error) {
      console.error('Error updating deployment fee:', error);
      res.status(500).json({ message: 'Failed to update deployment fee' });
    }
  });

  // Get daily charge configuration
  app.get('/api/admin/coins/daily-charge', requireAdmin, async (req, res) => {
    try {
      const setting = await storage.getAppSetting('daily_charge');
      const dailyCharge = setting?.value || 2;
      res.json({ dailyCharge });
    } catch (error) {
      console.error('Error fetching daily charge:', error);
      res.status(500).json({ message: 'Failed to fetch daily charge' });
    }
  });

  // Update daily charge
  app.post('/api/admin/coins/daily-charge', requireAdmin, async (req, res) => {
    try {
      const { dailyCharge } = req.body;
      const adminId = (req.user as any)?._id?.toString();
      
      if (typeof dailyCharge !== 'number' || dailyCharge < 0) {
        return res.status(400).json({ message: 'Valid daily charge required' });
      }

      await storage.setAppSetting({
        key: 'daily_charge',
        value: dailyCharge,
        description: 'Daily maintenance charge for active deployments',
        updatedBy: adminId
      });

      res.json({ message: 'Daily charge updated successfully' });
    } catch (error) {
      console.error('Error updating daily charge:', error);
      res.status(500).json({ message: 'Failed to update daily charge' });
    }
  });

  // Admin currency management routes
  app.get('/api/admin/currency', requireAdmin, async (req, res) => {
    try {
      const [currency, rate, symbol] = await Promise.all([
        storage.getAppSetting('currency'),
        storage.getAppSetting('currency_rate'),
        storage.getAppSetting('currency_symbol')
      ]);

      res.json({
        currency: currency?.value || 'USD',
        rate: rate?.value || 0.1,
        symbol: symbol?.value || '$'
      });
    } catch (error) {
      console.error('Error getting currency settings:', error);
      res.status(500).json({ error: 'Failed to get currency settings' });
    }
  });

  app.put('/api/admin/currency', requireAdmin, async (req, res) => {
    try {
      const { currency, rate, symbol } = req.body;
      const adminId = (req.user as any)?._id?.toString();

      if (!currency || !rate || !symbol) {
        return res.status(400).json({ error: 'Currency, rate, and symbol are required' });
      }

      // Save currency settings
      await Promise.all([
        storage.setAppSetting({
          key: 'currency',
          value: currency,
          description: 'Selected currency for display',
          updatedBy: adminId
        }),
        storage.setAppSetting({
          key: 'currency_rate',
          value: parseFloat(rate),
          description: 'Exchange rate per coin',
          updatedBy: adminId
        }),
        storage.setAppSetting({
          key: 'currency_symbol',
          value: symbol,
          description: 'Currency symbol for display',
          updatedBy: adminId
        })
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating currency settings:', error);
      res.status(500).json({ error: 'Failed to update currency settings' });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = crypto.randomUUID();
    wsConnections.set(clientId, ws);
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Send connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected', 
      data: { clientId },
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle deployment monitoring requests
        if (data.type === 'monitor_deployment' && data.branch) {
          startWorkflowMonitoring(data.branch);
          ws.send(JSON.stringify({
            type: 'monitoring_started',
            data: { branch: data.branch },
            timestamp: new Date().toISOString()
          }));
        }
        // Handle chat functionality
        else if (data.type === 'join_chat') {
          // Check if device fingerprint is banned
          if (data.deviceFingerprint) {
            const isBanned = await storage.isDeviceFingerprintBanned(data.deviceFingerprint);
            if (isBanned) {
              ws.send(JSON.stringify({
                type: 'error',
                code: 'DEVICE_BANNED',
                message: 'Access denied: Your device is banned from using the chat service'
              }));
              ws.close();
              return;
            }
          }
          
          const chatClient: ChatClient = {
            ws,
            userId: data.userId,
            username: data.username,
            isAdmin: data.isAdmin,
            role: data.role
          };
          
          chatClients.set(clientId, chatClient);
          
          // Send chat history to the new client
          try {
            const messages = await storage.getChatMessages(50);
            ws.send(JSON.stringify({
              type: 'chat_history',
              messages: messages.map(msg => ({
                ...msg,
                _id: msg._id.toString(),
                userId: msg.userId.toString(),
                createdAt: msg.createdAt.toISOString()
              }))
            }));
            
            // Send current users list
            const users = Array.from(chatClients.values()).map(client => ({
              userId: client.userId,
              username: client.username,
              isAdmin: client.isAdmin,
              role: client.role,
              isRestricted: false
            }));
            
            ws.send(JSON.stringify({
              type: 'users_list',
              users
            }));
            
            // Broadcast user joined to other clients
            broadcastToChatClients('user_joined', {
              user: {
                userId: data.userId,
                username: data.username,
                isAdmin: data.isAdmin,
                role: data.role,
                isRestricted: false
              }
            }, clientId);
            
          } catch (error) {
            console.error('Error handling chat join:', error);
          }
        }
        else if (data.type === 'send_message') {
          const chatClient = chatClients.get(clientId);
          if (chatClient) {
            try {
              // Check if user is restricted
              const isRestricted = await storage.isChatRestricted(chatClient.userId);
              if (isRestricted) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'You are restricted from sending messages'
                }));
                return;
              }
              
              // Create and broadcast message
              const messageData: any = {
                userId: chatClient.userId,
                username: chatClient.username,
                message: data.message,
                isAdmin: chatClient.isAdmin,
                role: chatClient.role
              };

              // Add reply data if this is a reply
              if (data.replyTo) {
                messageData.replyTo = data.replyTo;
                messageData.replyToMessage = data.replyToMessage;
                messageData.replyToUsername = data.replyToUsername;
              }

              const chatMessage = await storage.createChatMessage(messageData);
              
              broadcastToChatClients('chat_message', {
                message: {
                  ...chatMessage,
                  _id: chatMessage._id.toString(),
                  userId: chatMessage.userId.toString(),
                  createdAt: chatMessage.createdAt.toISOString()
                }
              });
              
            } catch (error) {
              console.error('Error sending chat message:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to send message'
              }));
            }
          }
        }
        else if (data.type === 'restrict_user') {
          const chatClient = chatClients.get(clientId);
          if (chatClient && chatClient.isAdmin) {
            try {
              await storage.restrictUserFromChat(data.userId, chatClient.userId, data.reason);
              
              broadcastToChatClients('user_restricted', {
                userId: data.userId,
                restrictedBy: chatClient.userId,
                reason: data.reason
              });
              
            } catch (error) {
              console.error('Error restricting user:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to restrict user'
              }));
            }
          }
        }
        else if (data.type === 'unrestrict_user') {
          const chatClient = chatClients.get(clientId);
          if (chatClient && chatClient.isAdmin) {
            try {
              await storage.unrestrictUserFromChat(data.userId);
              
              broadcastToChatClients('user_unrestricted', {
                userId: data.userId,
                unrestrictedBy: chatClient.userId
              });
              
            } catch (error) {
              console.error('Error unrestricting user:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to unrestrict user'
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      wsConnections.delete(clientId);
      const chatClient = chatClients.get(clientId);
      if (chatClient) {
        chatClients.delete(clientId);
        // Broadcast user left to other clients
        broadcastToChatClients('user_left', {
          userId: chatClient.userId
        }, clientId);
      }
      console.log(`WebSocket client disconnected: ${clientId}`);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(clientId);
      chatClients.delete(clientId);
    });
  });
  
  // Chat API routes for message management
  app.patch('/api/chat/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user._id.toString();

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      await storage.updateChatMessage(id, content.trim(), userId);
      res.json({ message: 'Message updated successfully' });
    } catch (error) {
      console.error('Error updating chat message:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update message' });
    }
  });

  app.delete('/api/chat/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id.toString();
      const isAdmin = !!req.user.isAdmin;

      await storage.deleteChatMessage(id, userId, isAdmin);
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting chat message:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete message' });
    }
  });

  app.get('/api/chat/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const message = await storage.getChatMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.json(message);
    } catch (error) {
      console.error('Error fetching chat message:', error);
      res.status(500).json({ message: 'Failed to fetch message' });
    }
  });

  // User settings API routes
  app.get('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user profile with preferences
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        bio: user.bio,
        isAdmin: user.isAdmin,
        role: user.role,
        status: user.status,
        coinBalance: user.coinBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        preferences: user.preferences || {
          emailNotifications: true,
          darkMode: false,
          language: 'en',
          timezone: 'UTC'
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const { firstName, lastName, username, bio } = req.body;

      if (!firstName?.trim()) {
        return res.status(400).json({ message: 'First name is required' });
      }

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }

      await storage.updateUserProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName?.trim() || '',
        username: username?.trim() || '',
        bio: bio?.trim() || ''
      });

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const preferences = req.body;

      await storage.updateUserPreferences(userId, preferences);
      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  // Deployment monitoring endpoints
  app.post('/api/deployments/:id/logs', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { logs } = req.body;
      
      if (!Array.isArray(logs)) {
        return res.status(400).json({ message: 'Logs must be an array' });
      }

      await storage.addDeploymentLogs(id, logs);
      
      // Analyze logs to determine deployment status
      const analysis = await storage.analyzeDeploymentStatus(id);
      if (analysis.status !== 'deploying') {
        await storage.updateDeploymentStatus(id, analysis.status);
      }

      res.json({ message: 'Logs added successfully', analysis });
    } catch (error) {
      console.error('Error adding deployment logs:', error);
      res.status(500).json({ message: 'Failed to add logs' });
    }
  });

  app.get('/api/deployments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.analyzeDeploymentStatus(id);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing deployment status:', error);
      res.status(500).json({ message: 'Failed to analyze status' });
    }
  });

  // Coin transfer routes
  app.post('/api/coins/transfer', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user._id.toString();
      const { toEmailOrUsername, amount, message } = req.body;

      if (!toEmailOrUsername || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid recipient and positive amount required' });
      }

      // Find recipient
      const recipient = await storage.getUserByUsernameOrEmail(toEmailOrUsername);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      // Check if trying to send to self
      if (senderId === recipient._id.toString()) {
        return res.status(400).json({ message: 'Cannot send coins to yourself' });
      }

      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ message: 'Sender not found' });
      }

      // Check balance
      if (sender.coinBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Create transfer
      const transfer = await storage.createCoinTransfer({
        fromUserId: senderId,
        toUserId: recipient._id.toString(),
        fromEmail: sender.email,
        toEmailOrUsername,
        amount,
        message: message || '',
        status: 'pending'
      });

      // Process transfer immediately
      await storage.processCoinTransfer(transfer._id.toString());

      res.json({
        message: 'Coins transferred successfully',
        amount,
        recipient: toEmailOrUsername,
        transferId: transfer._id
      });
    } catch (error) {
      console.error('Error transferring coins:', error);
      res.status(500).json({ message: (error as Error).message || 'Failed to transfer coins' });
    }
  });

  // Get user's coin transfers
  app.get('/api/coins/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user._id.toString();
      const transfers = await storage.getCoinTransfers(userId);
      res.json(transfers);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      res.status(500).json({ message: 'Failed to fetch transfers' });
    }
  });

  // Admin: Get all deployments with numbers
  app.get('/api/admin/deployments/all', requireAdmin, async (req, res) => {
    try {
      const deployments = await storage.getAllDeployments();
      
      // Add deployment numbers for each user
      const deploymentsWithNumbers = await Promise.all(
        deployments.map(async (deployment) => {
          const totalDeployments = await storage.getUserTotalDeployments(deployment.userId.toString());
          const deploymentNumber = await storage.getNextDeploymentNumber(deployment.userId.toString()) - 1;
          
          return {
            ...deployment,
            deploymentNumber,
            totalDeployments
          };
        })
      );
      
      res.json(deploymentsWithNumbers);
    } catch (error) {
      console.error('Error fetching all deployments:', error);
      res.status(500).json({ message: 'Failed to fetch deployments' });
    }
  });

  // Admin: Get users with country information
  app.get('/api/admin/users/countries', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const search = req.query.search as string;
      
      let users = await storage.getAllUsersWithCountryInfo(limit);
      
      // Apply search filter if provided
      if (search) {
        users = users.filter(user => 
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          user.username?.toLowerCase().includes(search.toLowerCase()) ||
          user.country?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Auto-detect country for users without country info
      const usersWithCountry = await Promise.all(
        users.map(async (user) => {
          if (!user.country && (user.registrationIp || user.lastLoginIp)) {
            const ip = user.lastLoginIp || user.registrationIp;
            try {
              // Use IP-API.com for country detection (free, no API key needed)
              const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`);
              if (response.ok) {
                const geoData = await response.json();
                if (geoData.country) {
                  await storage.updateUserCountry(user._id.toString(), geoData.country);
                  return { ...user, country: geoData.country };
                }
              }
            } catch (error) {
              console.error(`Failed to get country for IP ${ip}:`, error);
            }
          }
          return user;
        })
      );

      res.json(usersWithCountry);
    } catch (error) {
      console.error('Error fetching users with countries:', error);
      res.status(500).json({ message: 'Failed to fetch user countries' });
    }
  });

  // Admin: Banned users list
  app.get('/api/admin/banned-users', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const bannedUsers = await storage.getBannedUsers(limit);
      res.json(bannedUsers);
    } catch (error) {
      console.error('Error fetching banned users:', error);
      res.status(500).json({ message: 'Failed to fetch banned users' });
    }
  });

  // Admin: Add user to banned list
  app.post('/api/admin/banned-users', requireAdmin, async (req: any, res) => {
    try {
      const { userId, reason } = req.body;
      const adminId = req.user._id.toString();

      if (!userId || !reason) {
        return res.status(400).json({ message: 'User ID and reason are required' });
      }

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create banned user record
      const bannedUser = await storage.createBannedUser({
        userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        reason,
        bannedBy: adminId,
        country: user.country,
        deviceFingerprints: user.deviceHistory || [],
        isActive: true
      });

      // Update user status to banned
      await storage.updateUserStatus(userId, 'banned', ['account_banned']);

      res.json({
        message: 'User added to banned list successfully',
        bannedUser
      });
    } catch (error) {
      console.error('Error adding user to banned list:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  // Admin: Remove user from banned list
  app.delete('/api/admin/banned-users/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      await storage.removeBannedUser(userId);
      await storage.updateUserStatus(userId, 'active', []);

      res.json({ message: 'User removed from banned list successfully' });
    } catch (error) {
      console.error('Error removing user from banned list:', error);
      res.status(500).json({ message: 'Failed to unban user' });
    }
  });

  // Auto-check deployment status periodically - Fixed workflow rerun
  let deploymentCheckInterval: NodeJS.Timeout | null = null;
  
  const startDeploymentMonitoring = () => {
    if (deploymentCheckInterval) {
      clearInterval(deploymentCheckInterval);
    }
    
    deploymentCheckInterval = setInterval(async () => {
      try {
        const deployments = await storage.getDeployments();
        const deployingDeployments = deployments.filter(d => d.status === 'deploying');
        
        for (const deployment of deployingDeployments) {
          const analysis = await storage.analyzeDeploymentStatus(deployment._id.toString());
          if (analysis.status !== 'deploying') {
            await storage.updateDeploymentStatus(deployment._id.toString(), analysis.status);
            console.log(`Updated deployment ${deployment._id} status to: ${analysis.status}`);
          }
        }
      } catch (error) {
        console.error('Error in deployment status check:', error);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
  };

  // Start deployment monitoring
  startDeploymentMonitoring();

  return httpServer;
}

// Export storage for use in other modules
export { storage };
