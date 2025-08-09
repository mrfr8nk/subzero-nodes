import {
  User,
  Deployment,
  Transaction,
  Referral,
  AdminNotification,
  AppSettings,
  DeploymentVariable,
  ChatMessage,
  ChatRestriction,
  GitHubAccount,
  InsertUser,
  InsertDeployment,
  InsertTransaction,
  InsertReferral,
  InsertAdminNotification,
  InsertAppSettings,
  InsertDeploymentVariable,
} from "@shared/schema";
import { getDb } from "./db";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createLocalUser(userData: any): Promise<any>;
  verifyUser(userId: string): Promise<void>;
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void>;
  resetPassword(userId: string, newPassword: string): Promise<void>;
  updateVerificationToken(email: string, token: string, expiry: Date): Promise<void>;
  upsertUser(user: InsertUser, registrationIp?: string): Promise<User>;
  
  // Deployment operations
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  deleteDeployment(id: string): Promise<void>;
  getUserDeployments(userId: string): Promise<Deployment[]>;
  getAllDeployments(): Promise<Deployment[]>;
  getDeployment(id: string): Promise<Deployment | undefined>;
  updateDeploymentStatus(id: string, status: string): Promise<void>;
  getDeploymentStats(userId: string): Promise<{
    total: number;
    active: number;
    stopped: number;
    thisMonth: number;
  }>;
  updateDeploymentChargeDate(id: string, lastChargeDate: Date, nextChargeDate: Date): Promise<void>;
  getActiveDeploymentsForBilling(): Promise<Deployment[]>;
  
  // Deployment variable operations
  createDeploymentVariable(variable: InsertDeploymentVariable): Promise<DeploymentVariable>;
  getDeploymentVariables(deploymentId: string): Promise<DeploymentVariable[]>;
  updateDeploymentVariable(id: string, value: string): Promise<void>;
  deleteDeploymentVariable(id: string): Promise<void>;
  upsertDeploymentVariable(deploymentId: string, key: string, value: string, description?: string, isRequired?: boolean): Promise<DeploymentVariable>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  updateUserBalance(userId: string, amount: number): Promise<void>;
  
  // Referral operations
  generateReferralCode(): Promise<string>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    referralEarnings: number;
    monthlyReferrals: number;
  }>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  
  // Admin operations
  getAdminStats(): Promise<{
    totalUsers: number;
    totalDeployments: number;
    totalRevenue: number;
    newUsersThisMonth: number;
    activeUsers: number;
    bannedUsers: number;
  }>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  updateUserStatus(userId: string, status: string, restrictions?: string[]): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<void>;
  updateUserCoins(userId: string, amount: number, reason: string, adminId: string): Promise<void>;
  updateUserClaimDate(userId: string, claimDate: Date): Promise<void>;
  promoteToAdmin(userId: string, adminId: string): Promise<void>;
  demoteFromAdmin(userId: string, adminId: string): Promise<void>;
  deleteAdmin(userId: string, adminId: string): Promise<void>;
  getUsersByIp(ip: string): Promise<User[]>;
  updateUserIp(userId: string, ip: string): Promise<void>;
  
  // Admin notification operations
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(limit?: number): Promise<AdminNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  
  // App settings operations
  getAppSetting(key: string): Promise<AppSettings | undefined>;
  setAppSetting(setting: InsertAppSettings): Promise<AppSettings>;
  getAllAppSettings(): Promise<AppSettings[]>;
  
  // Maintenance mode operations
  isMaintenanceModeEnabled(): Promise<boolean>;
  setMaintenanceMode(enabled: boolean, adminId: string, message?: string): Promise<void>;
  
  // User deletion and IP management
  deleteUser(userId: string, adminId: string): Promise<void>;
  banUserIp(ip: string, adminId: string, reason?: string): Promise<void>;
  unbanUserIp(ip: string, adminId: string): Promise<void>;
  getBannedIps(): Promise<string[]>;
  isIpBanned(ip: string): Promise<boolean>;
  
  // Daily billing operations
  processDeploymentDailyCharges(): Promise<void>;
  
  // Chat operations
  createChatMessage(message: {
    userId: string;
    username: string;
    message: string;
    isAdmin: boolean;
    role?: string;
  }): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  restrictUserFromChat(userId: string, restrictedBy: string, reason?: string): Promise<void>;
  unrestrictUserFromChat(userId: string): Promise<void>;
  isChatRestricted(userId: string): Promise<boolean>;
  
  // GitHub account management
  createGitHubAccount(account: {
    name: string;
    token: string;
    owner: string;
    repo: string;
    workflowFile: string;
    priority: number;
    maxQueueLength: number;
  }): Promise<GitHubAccount>;
  getAllGitHubAccounts(): Promise<GitHubAccount[]>;
  getActiveGitHubAccounts(): Promise<GitHubAccount[]>;
  updateGitHubAccount(id: string, updates: Partial<GitHubAccount>): Promise<void>;
  deleteGitHubAccount(id: string): Promise<void>;
  getAvailableGitHubAccount(): Promise<GitHubAccount | null>;
  updateGitHubAccountQueue(id: string, queueLength: number): Promise<void>;
  setGitHubAccountActive(id: string, active: boolean): Promise<void>;
}

export class MongoStorage implements IStorage {
  private get usersCollection() {
    return getDb().collection<User>("users");
  }

  private get deploymentsCollection() {
    return getDb().collection<Deployment>("deployments");
  }

  private get transactionsCollection() {
    return getDb().collection<Transaction>("transactions");
  }

  private get referralsCollection() {
    return getDb().collection<Referral>("referrals");
  }

  private get adminNotificationsCollection() {
    return getDb().collection<AdminNotification>("adminNotifications");
  }

  private get appSettingsCollection() {
    return getDb().collection<AppSettings>("appSettings");
  }

  private get chatMessagesCollection() {
    return getDb().collection<ChatMessage>("chatMessages");
  }

  private get chatRestrictionsCollection() {
    return getDb().collection<ChatRestriction>("chatRestrictions");
  }

  private get githubAccountsCollection() {
    return getDb().collection<GitHubAccount>("githubAccounts");
  }

  private get deploymentVariablesCollection() {
    return getDb().collection<DeploymentVariable>("deploymentVariables");
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      // Validate ObjectId format before creating ObjectId
      if (!id || typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.warn(`Invalid ObjectId format: ${id}`);
        return undefined;
      }
      
      const user = await this.usersCollection.findOne({ _id: new ObjectId(id) });
      return user || undefined;
    } catch (error) {
      console.error(`Error getting user with id ${id}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ email });
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ googleId });
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ verificationToken: token });
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ resetPasswordToken: token });
    return user || undefined;
  }

  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<void> {
    await this.usersCollection.updateOne(
      { email },
      { 
        $set: { 
          resetPasswordToken: token,
          resetPasswordExpiry: expiry,
          updatedAt: new Date()
        }
      }
    );
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          password: newPassword,
          updatedAt: new Date()
        },
        $unset: { 
          resetPasswordToken: "",
          resetPasswordExpiry: ""
        }
      }
    );
  }

  async updateVerificationToken(email: string, token: string, expiry: Date): Promise<void> {
    await this.usersCollection.updateOne(
      { email },
      { 
        $set: { 
          verificationToken: token,
          verificationTokenExpiry: expiry,
          updatedAt: new Date()
        }
      }
    );
  }

  async createLocalUser(userData: any): Promise<any> {
    const now = new Date();
    
    // Generate unique referral code for new user
    const referralCode = await this.generateReferralCode();
    
    const newUser = {
      ...userData,
      coinBalance: 100,
      emailVerified: false,
      authProvider: 'local',
      referralCode: referralCode,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.usersCollection.insertOne(newUser);
    
    // Handle referral if provided
    if (userData.referralCode && result.insertedId) {
      try {
        const referrer = await this.getUserByReferralCode(userData.referralCode);
        if (referrer && result.insertedId.toString() !== referrer._id.toString()) {
          await this.createReferral({
            referrerId: referrer._id.toString(),
            referredId: result.insertedId.toString(),
            rewardClaimed: false,
            rewardAmount: 50,
          });
          
          // Award referral bonus
          await this.updateUserBalance(referrer._id.toString(), 50);
          await this.createTransaction({
            userId: referrer._id.toString(),
            type: "referral",
            amount: 50,
            description: "Referral bonus for new user signup",
          });
        }
      } catch (error) {
        console.error('Error processing referral:', error);
      }
    }

    return result;
  }

  async verifyUser(userId: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          isVerified: true,
          emailVerified: true,
          updatedAt: new Date() 
        },
        $unset: { 
          verificationToken: "", 
          verificationTokenExpiry: "" 
        }
      }
    );
  }

  async upsertUser(userData: InsertUser, registrationIp?: string): Promise<User> {
    const now = new Date();
    
    // Check if user exists by Google ID or email
    let existingUser = null;
    if (userData.googleId) {
      existingUser = await this.getUserByGoogleId(userData.googleId);
    }
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }

    if (existingUser) {
      // Update existing user
      const updatedData = {
        ...userData,
        updatedAt: now,
      };
      
      await this.usersCollection.updateOne(
        { _id: existingUser._id },
        { $set: updatedData }
      );
      
      return { ...existingUser, ...updatedData };
    } else {
      // Check for existing accounts from same IP address before creating new user
      if (registrationIp) {
        const existingAccountsFromIP = await this.getUsersByIp(registrationIp);
        
        // Get configurable max accounts per IP from admin settings (default to 1)
        const maxAccountsSetting = await this.getAppSetting('max_accounts_per_ip');
        const maxAccountsPerIP = maxAccountsSetting?.value || 1;
        
        // Check if any of the existing accounts are active (not banned)
        const activeAccounts = existingAccountsFromIP.filter(user => 
          user.status !== 'banned' && user.status !== 'restricted'
        );
        
        if (activeAccounts.length >= maxAccountsPerIP) {
          throw new Error(`Multiple accounts detected from this IP address. Only ${maxAccountsPerIP} account(s) allowed per IP. Contact support if you believe this is an error.`);
        }
        
        // Set registration IP in user data
        userData.registrationIp = registrationIp;
        userData.lastLoginIp = registrationIp;
        userData.ipHistory = [registrationIp];
      }
      // Create new user
      if (!userData.referralCode) {
        userData.referralCode = await this.generateReferralCode();
      }

      const newUser: Omit<User, '_id'> = {
        ...userData,
        coinBalance: userData.coinBalance || 100,
        emailVerified: userData.emailVerified || true,
        authProvider: userData.authProvider || 'google',
        // Set default admin fields
        isAdmin: userData.isAdmin || false,
        role: userData.role || 'user',
        status: userData.status || 'active',
        restrictions: userData.restrictions || [],
        // IP tracking fields (will be updated by updateUserIp in callback)
        registrationIp: userData.registrationIp,
        lastLoginIp: userData.lastLoginIp,
        ipHistory: userData.ipHistory || [],
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.usersCollection.insertOne(newUser as User);
      const user = { ...newUser, _id: result.insertedId } as User;

      // Handle referral if provided
      if (userData.referredById && user._id.toString() !== userData.referredById) {
        try {
          await this.createReferral({
            referrerId: userData.referredById,
            referredId: user._id.toString(),
            rewardClaimed: false,
            rewardAmount: 50,
          });
          
          // Award referral bonus
          await this.updateUserBalance(userData.referredById, 50);
          await this.createTransaction({
            userId: userData.referredById,
            type: "referral",
            amount: 50,
            description: "Referral bonus for new user signup",
          });
        } catch (error) {
          console.log("Referral processing failed:", error);
        }
      }
      
      return user;
    }
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const now = new Date();
    const newDeployment: Omit<Deployment, '_id'> = {
      ...deployment,
      userId: new ObjectId(deployment.userId),
      cost: deployment.cost || 25,
      status: deployment.status || 'active',
      configuration: deployment.configuration || 'standard',
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.deploymentsCollection.insertOne(newDeployment as Deployment);
    const deploymentWithId = { ...newDeployment, _id: result.insertedId } as Deployment;

    // Deduct coins for deployment
    const cost = deployment.cost || 25;
    await this.updateUserBalance(deployment.userId, -cost);
    await this.createTransaction({
      userId: deployment.userId,
      type: "deployment",
      amount: -cost,
      description: `Bot deployment: ${deployment.name}`,
      relatedId: result.insertedId.toString(),
    });

    return deploymentWithId;
  }

  async getUserDeployments(userId: string): Promise<Deployment[]> {
    return await this.deploymentsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getAllDeployments(): Promise<Deployment[]> {
    return await this.deploymentsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    try {
      // Validate ObjectId format before creating ObjectId
      if (!id || typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.warn(`Invalid ObjectId format: ${id}`);
        return undefined;
      }
      
      const deployment = await this.deploymentsCollection.findOne({ _id: new ObjectId(id) });
      return deployment || undefined;
    } catch (error) {
      console.error(`Error getting deployment with id ${id}:`, error);
      return undefined;
    }
  }

  async updateDeploymentStatus(id: string, status: string): Promise<void> {
    try {
      // Validate ObjectId format before creating ObjectId
      if (!id || typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error(`Invalid ObjectId format: ${id}`);
      }
      
      await this.deploymentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } }
      );
    } catch (error) {
      console.error(`Error updating deployment status for id ${id}:`, error);
      throw error;
    }
  }

  async deleteDeployment(id: string): Promise<void> {
    try {
      // Validate ObjectId format before creating ObjectId
      if (!id || typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error(`Invalid ObjectId format: ${id}`);
      }
      
      await this.deploymentsCollection.deleteOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error(`Error deleting deployment with id ${id}:`, error);
      throw error;
    }
  }

  async getDeploymentStats(userId: string): Promise<{
    total: number;
    active: number;
    stopped: number;
    thisMonth: number;
  }> {
    const deployments = await this.getUserDeployments(userId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: deployments.length,
      active: deployments.filter(d => d.status === "active").length,
      stopped: deployments.filter(d => d.status === "stopped").length,
      thisMonth: deployments.filter(d => d.createdAt && d.createdAt >= thisMonth).length,
    };
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const now = new Date();
    const newTransaction: Omit<Transaction, '_id'> = {
      ...transaction,
      userId: new ObjectId(transaction.userId),
      relatedId: transaction.relatedId ? new ObjectId(transaction.relatedId) : undefined,
      createdAt: now,
    };

    const result = await this.transactionsCollection.insertOne(newTransaction as Transaction);
    return { ...newTransaction, _id: result.insertedId } as Transaction;
  }

  async getUserTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    return await this.transactionsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateUserBalance(userId: string, amount: number): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { coinBalance: amount },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async generateReferralCode(): Promise<string> {
    let code: string;
    let exists = true;
    
    do {
      code = randomBytes(4).toString('hex').toUpperCase();
      const existingUser = await this.getUserByReferralCode(code);
      exists = !!existingUser;
    } while (exists);
    
    return code;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const now = new Date();
    const newReferral: Omit<Referral, '_id'> = {
      ...referral,
      referrerId: new ObjectId(referral.referrerId),
      referredId: new ObjectId(referral.referredId),
      rewardClaimed: referral.rewardClaimed || false,
      rewardAmount: referral.rewardAmount || 50,
      createdAt: now,
    };

    const result = await this.referralsCollection.insertOne(newReferral as Referral);
    return { ...newReferral, _id: result.insertedId } as Referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await this.referralsCollection
      .find({ referrerId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    referralEarnings: number;
    monthlyReferrals: number;
  }> {
    const userReferrals = await this.getUserReferrals(userId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const referralTransactions = await this.transactionsCollection
      .find({
        userId: new ObjectId(userId),
        type: "referral"
      })
      .toArray();

    const totalEarnings = referralTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyReferrals = userReferrals.filter(r => r.createdAt && r.createdAt >= thisMonth).length;

    return {
      totalReferrals: userReferrals.length,
      referralEarnings: totalEarnings,
      monthlyReferrals,
    };
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ referralCode: code });
    return user || undefined;
  }

  // Admin operations implementation
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalDeployments: number;
    totalRevenue: number;
    newUsersThisMonth: number;
    activeUsers: number;
    bannedUsers: number;
  }> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalDeployments,
      newUsersThisMonth,
      activeUsers,
      bannedUsers,
      revenueTransactions
    ] = await Promise.all([
      this.usersCollection.countDocuments(),
      this.deploymentsCollection.countDocuments(),
      this.usersCollection.countDocuments({ createdAt: { $gte: thisMonth } }),
      this.usersCollection.countDocuments({ status: { $ne: "banned" } }),
      this.usersCollection.countDocuments({ status: "banned" }),
      this.transactionsCollection.find({ 
        type: "deployment",
        amount: { $lt: 0 }
      }).toArray()
    ]);

    const totalRevenue = Math.abs(revenueTransactions.reduce((sum, t) => sum + t.amount, 0));

    return {
      totalUsers,
      totalDeployments,
      totalRevenue,
      newUsersThisMonth,
      activeUsers,
      bannedUsers,
    };
  }

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    return await this.usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  async updateUserStatus(userId: string, status: string, restrictions?: string[]): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (restrictions) {
      updateData.restrictions = restrictions;
    }

    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    const updateData: any = {
      role,
      updatedAt: new Date()
    };

    if (role === "admin" || role === "super_admin") {
      updateData.isAdmin = true;
    } else {
      updateData.isAdmin = false;
    }

    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );
  }

  async updateUserCoins(userId: string, amount: number, reason: string, adminId: string): Promise<void> {
    await this.updateUserBalance(userId, amount);
    
    await this.createTransaction({
      userId,
      type: "admin_adjustment",
      amount,
      description: `Admin adjustment: ${reason}`,
      relatedId: adminId,
    });
  }

  async updateUserClaimDate(userId: string, claimDate: Date): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          lastClaimDate: claimDate,
          updatedAt: new Date()
        }
      }
    );
  }

  async promoteToAdmin(userId: string, adminId: string): Promise<void> {
    await this.updateUserRole(userId, "admin");
    
    await this.createAdminNotification({
      type: "user_promotion",
      title: "User Promoted to Admin",
      message: `User has been promoted to admin by ${adminId}`,
      data: { userId, promotedBy: adminId },
      read: false
    });
  }

  async demoteFromAdmin(userId: string, adminId: string): Promise<void> {
    await this.updateUserRole(userId, "user");
    
    await this.createAdminNotification({
      type: "admin_demotion",
      title: "Admin Demoted to User",
      message: `Admin has been demoted to user by ${adminId}`,
      data: { userId, demotedBy: adminId },
      read: false
    });
  }

  async deleteAdmin(userId: string, adminId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.createAdminNotification({
      type: "admin_deletion",
      title: "Admin Account Deleted",
      message: `Admin ${user.email} has been deleted by super admin ${adminId}`,
      data: { userId, deletedBy: adminId, userEmail: user.email },
      read: false
    });

    await this.deleteUser(userId, adminId);
  }

  async getUsersByIp(ip: string): Promise<User[]> {
    return await this.usersCollection
      .find({ 
        $or: [
          { registrationIp: ip },
          { lastLoginIp: ip },
          { ipHistory: { $in: [ip] } }
        ]
      })
      .toArray();
  }

  async updateUserIp(userId: string, ip: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const ipHistory = user.ipHistory || [];
    if (!ipHistory.includes(ip)) {
      ipHistory.push(ip);
      // Keep only last 10 IPs
      if (ipHistory.length > 10) {
        ipHistory.shift();
      }
    }

    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          lastLoginIp: ip,
          ipHistory,
          updatedAt: new Date()
        }
      }
    );

    // Check for multiple accounts from same IP
    const usersWithSameIp = await this.getUsersByIp(ip);
    if (usersWithSameIp.length > 1) {
      await this.createAdminNotification({
        type: "duplicate_ip",
        title: "Multiple Accounts from Same IP",
        message: `${usersWithSameIp.length} accounts detected from IP: ${ip}`,
        data: { 
          ip, 
          userIds: usersWithSameIp.map(u => u._id.toString()),
          userEmails: usersWithSameIp.map(u => u.email)
        },
        read: false
      });
    }
  }

  // Admin notification operations
  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const now = new Date();
    const newNotification: Omit<AdminNotification, '_id'> = {
      ...notification,
      read: notification.read || false,
      createdAt: now,
    };

    const result = await this.adminNotificationsCollection.insertOne(newNotification as AdminNotification);
    return { ...newNotification, _id: result.insertedId } as AdminNotification;
  }

  async getAdminNotifications(limit: number = 20): Promise<AdminNotification[]> {
    return await this.adminNotificationsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.adminNotificationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );
  }

  // App settings operations
  async getAppSetting(key: string): Promise<AppSettings | undefined> {
    const setting = await this.appSettingsCollection.findOne({ key });
    return setting || undefined;
  }

  async setAppSetting(setting: InsertAppSettings): Promise<AppSettings> {
    const now = new Date();
    const existingSetting = await this.getAppSetting(setting.key);

    if (existingSetting) {
      // Update existing setting
      await this.appSettingsCollection.updateOne(
        { key: setting.key },
        { 
          $set: { 
            value: setting.value,
            description: setting.description,
            updatedBy: setting.updatedBy ? new ObjectId(setting.updatedBy) : undefined,
            updatedAt: now
          }
        }
      );
      
      return { 
        ...existingSetting, 
        value: setting.value,
        description: setting.description,
        updatedBy: setting.updatedBy ? new ObjectId(setting.updatedBy) : undefined,
        updatedAt: now
      };
    } else {
      // Create new setting
      const newSetting: Omit<AppSettings, '_id'> = {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedBy: setting.updatedBy ? new ObjectId(setting.updatedBy) : undefined,
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.appSettingsCollection.insertOne(newSetting as AppSettings);
      return { ...newSetting, _id: result.insertedId } as AppSettings;
    }
  }

  async getAllAppSettings(): Promise<AppSettings[]> {
    return await this.appSettingsCollection
      .find({})
      .sort({ key: 1 })
      .toArray();
  }

  async deleteAppSetting(key: string): Promise<void> {
    await this.appSettingsCollection.deleteOne({ key });
  }

  // Maintenance mode operations
  async isMaintenanceModeEnabled(): Promise<boolean> {
    const setting = await this.getAppSetting('maintenance_mode');
    return setting ? setting.value === true : false;
  }

  async setMaintenanceMode(enabled: boolean, adminId: string, message?: string): Promise<void> {
    const now = new Date();
    
    // Set maintenance mode status
    await this.setAppSetting({
      key: 'maintenance_mode',
      value: enabled,
      description: enabled ? 'Site is in maintenance mode' : 'Site is operational',
      updatedBy: adminId
    });

    // Set maintenance message if provided
    if (message) {
      await this.setAppSetting({
        key: 'maintenance_message',
        value: message,
        description: 'Message displayed during maintenance',
        updatedBy: adminId
      });
    }

    // Create admin notification
    await this.createAdminNotification({
      type: 'maintenance_mode',
      title: enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
      message: enabled 
        ? `Site has been put into maintenance mode${message ? `: ${message}` : ''}` 
        : 'Site maintenance mode has been disabled. Site is now operational.',
      data: { enabled, message, adminId },
      read: false
    });
  }

  // User deletion and IP management operations
  async deleteUser(userId: string, adminId: string): Promise<void> {
    // First, get user info for logging
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete user's deployments
    await this.deploymentsCollection.deleteMany({ userId: new ObjectId(userId) });
    
    // Delete user's transactions
    await this.transactionsCollection.deleteMany({ userId: new ObjectId(userId) });
    
    // Delete user's referrals (both as referrer and referred)
    await this.referralsCollection.deleteMany({ 
      $or: [
        { referrerId: new ObjectId(userId) },
        { referredId: new ObjectId(userId) }
      ]
    });
    
    // Delete the user
    await this.usersCollection.deleteOne({ _id: new ObjectId(userId) });
    
    // Create admin notification
    await this.createAdminNotification({
      type: 'user_deleted',
      title: 'User Deleted',
      message: `User ${user.email} has been permanently deleted by admin`,
      data: { 
        deletedUserId: userId, 
        deletedBy: adminId, 
        userEmail: user.email,
        deletedAt: new Date().toISOString()
      },
      read: false
    });
  }

  async banUserIp(ip: string, adminId: string, reason?: string): Promise<void> {
    // Add IP to banned list
    await this.setAppSetting({
      key: `banned_ip_${ip.replace(/\./g, '_')}`,
      value: {
        ip,
        bannedBy: adminId,
        bannedAt: new Date().toISOString(),
        reason: reason || 'No reason provided'
      },
      description: `Banned IP: ${ip}`,
      updatedBy: adminId
    });

    // Get all users with this IP
    const usersWithIp = await this.getUsersByIp(ip);
    
    // Ban all users with this IP
    for (const user of usersWithIp) {
      await this.updateUserStatus(user._id.toString(), 'banned', ['ip_banned']);
    }

    // Create admin notification
    await this.createAdminNotification({
      type: 'ip_banned',
      title: 'IP Address Banned',
      message: `IP ${ip} has been banned. ${usersWithIp.length} users affected.`,
      data: { 
        ip, 
        bannedBy: adminId, 
        affectedUsers: usersWithIp.length,
        reason: reason || 'No reason provided'
      },
      read: false
    });
  }

  async unbanUserIp(ip: string, adminId: string): Promise<void> {
    // Remove IP from banned list
    await this.appSettingsCollection.deleteOne({ 
      key: `banned_ip_${ip.replace(/\./g, '_')}`
    });

    // Get all users with this IP that were banned due to IP ban
    const usersWithIp = await this.getUsersByIp(ip);
    const bannedUsers = usersWithIp.filter(user => 
      user.status === 'banned' && 
      user.restrictions?.includes('ip_banned')
    );
    
    // Unban users that were only banned due to IP ban
    for (const user of bannedUsers) {
      const remainingRestrictions = user.restrictions?.filter(r => r !== 'ip_banned') || [];
      if (remainingRestrictions.length === 0) {
        await this.updateUserStatus(user._id.toString(), 'active', []);
      } else {
        await this.updateUserStatus(user._id.toString(), user.status || 'active', remainingRestrictions);
      }
    }

    // Create admin notification
    await this.createAdminNotification({
      type: 'ip_unbanned',
      title: 'IP Address Unbanned',
      message: `IP ${ip} has been unbanned. ${bannedUsers.length} users restored.`,
      data: { 
        ip, 
        unbannedBy: adminId, 
        restoredUsers: bannedUsers.length
      },
      read: false
    });
  }

  async getBannedIps(): Promise<string[]> {
    const bannedIpSettings = await this.appSettingsCollection
      .find({ key: { $regex: /^banned_ip_/ } })
      .toArray();
    
    return bannedIpSettings.map(setting => {
      if (typeof setting.value === 'object' && setting.value.ip) {
        return setting.value.ip;
      }
      return setting.key.replace('banned_ip_', '').replace(/_/g, '.');
    });
  }

  async isIpBanned(ip: string): Promise<boolean> {
    const setting = await this.getAppSetting(`banned_ip_${ip.replace(/\./g, '_')}`);
    return !!setting;
  }

  // New deployment billing methods
  async updateDeploymentChargeDate(id: string, lastChargeDate: Date, nextChargeDate: Date): Promise<void> {
    await this.deploymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          lastChargeDate, 
          nextChargeDate,
          updatedAt: new Date() 
        } 
      }
    );
  }

  async getActiveDeploymentsForBilling(): Promise<Deployment[]> {
    const now = new Date();
    return await this.deploymentsCollection.find({
      status: 'active',
      $or: [
        { nextChargeDate: { $lte: now } },
        { nextChargeDate: { $exists: false } }
      ]
    }).toArray();
  }

  // Deployment variable methods
  async createDeploymentVariable(variable: InsertDeploymentVariable): Promise<DeploymentVariable> {
    const newVariable = {
      ...variable,
      _id: new ObjectId(),
      deploymentId: new ObjectId(variable.deploymentId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.deploymentVariablesCollection.insertOne(newVariable);
    return newVariable;
  }

  async getDeploymentVariables(deploymentId: string): Promise<DeploymentVariable[]> {
    return await this.deploymentVariablesCollection
      .find({ deploymentId: new ObjectId(deploymentId) })
      .toArray();
  }

  async updateDeploymentVariable(id: string, value: string): Promise<void> {
    await this.deploymentVariablesCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          value, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async deleteDeploymentVariable(id: string): Promise<void> {
    await this.deploymentVariablesCollection.deleteOne({ _id: new ObjectId(id) });
  }

  async upsertDeploymentVariable(
    deploymentId: string, 
    key: string, 
    value: string, 
    description?: string, 
    isRequired: boolean = true
  ): Promise<DeploymentVariable> {
    const existingVariable = await this.deploymentVariablesCollection.findOne({
      deploymentId: new ObjectId(deploymentId),
      key
    });

    if (existingVariable) {
      await this.updateDeploymentVariable(existingVariable._id.toString(), value);
      return { ...existingVariable, value, updatedAt: new Date() };
    } else {
      return await this.createDeploymentVariable({
        deploymentId,
        key,
        value,
        description,
        isRequired
      });
    }
  }

  // Daily billing process
  async processDeploymentDailyCharges(): Promise<void> {
    const activeDeployments = await this.getActiveDeploymentsForBilling();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get daily charge rate from settings
    const dailyChargeSetting = await this.getAppSetting('daily_charge');
    const dailyCharge = dailyChargeSetting?.value || 5;

    for (const deployment of activeDeployments) {
      try {
        // Get user to check balance
        const user = await this.getUser(deployment.userId.toString());
        if (!user) continue;

        // Check if user has enough coins
        if (user.coinBalance < dailyCharge) {
          // Stop the deployment and update status
          await this.updateDeploymentStatus(deployment._id.toString(), 'insufficient_funds');
          
          // Create transaction record for failed charge
          await this.createTransaction({
            userId: deployment.userId.toString(),
            type: 'deployment_charge_failed',
            amount: -dailyCharge,
            description: `Failed daily charge for deployment: ${deployment.name} (insufficient funds)`,
            relatedId: deployment._id.toString()
          });
          continue;
        }

        // Deduct coins from user
        await this.updateUserBalance(deployment.userId.toString(), -dailyCharge);
        
        // Create transaction record
        await this.createTransaction({
          userId: deployment.userId.toString(),
          type: 'deployment_charge',
          amount: -dailyCharge,
          description: `Daily charge for deployment: ${deployment.name}`,
          relatedId: deployment._id.toString()
        });

        // Update deployment charge dates
        await this.updateDeploymentChargeDate(
          deployment._id.toString(),
          now,
          tomorrow
        );

        console.log(`Charged ${dailyCharge} coins for deployment ${deployment.name} (${deployment._id})`);
      } catch (error) {
        console.error(`Error processing daily charge for deployment ${deployment._id}:`, error);
      }
    }
  }

  // Chat operations
  async createChatMessage(message: {
    userId: string;
    username: string;
    message: string;
    isAdmin: boolean;
    role?: string;
  }): Promise<ChatMessage> {
    const now = new Date();
    const chatMessage: ChatMessage = {
      _id: new ObjectId(),
      userId: new ObjectId(message.userId),
      username: message.username,
      message: message.message,
      isAdmin: message.isAdmin,
      role: message.role,
      createdAt: now,
      updatedAt: now,
    };

    await this.chatMessagesCollection.insertOne(chatMessage);
    return chatMessage;
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return await this.chatMessagesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
      .then(messages => messages.reverse()); // Return in chronological order
  }

  async restrictUserFromChat(userId: string, restrictedBy: string, reason?: string): Promise<void> {
    const now = new Date();
    const restriction: ChatRestriction = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      restrictedBy: new ObjectId(restrictedBy),
      reason,
      restrictedAt: now,
    };

    await this.chatRestrictionsCollection.insertOne(restriction);
  }

  async unrestrictUserFromChat(userId: string): Promise<void> {
    await this.chatRestrictionsCollection.deleteMany({
      userId: new ObjectId(userId)
    });
  }

  async isChatRestricted(userId: string): Promise<boolean> {
    const restriction = await this.chatRestrictionsCollection.findOne({
      userId: new ObjectId(userId)
    });
    return !!restriction;
  }

  // GitHub account management operations
  async createGitHubAccount(account: {
    name: string;
    token: string;
    owner: string;
    repo: string;
    workflowFile: string;
    priority: number;
    maxQueueLength: number;
  }): Promise<GitHubAccount> {
    const now = new Date();
    const githubAccount: GitHubAccount = {
      _id: new ObjectId(),
      name: account.name,
      token: account.token,
      owner: account.owner,
      repo: account.repo,
      workflowFile: account.workflowFile,
      isActive: true,
      priority: account.priority,
      currentQueueLength: 0,
      maxQueueLength: account.maxQueueLength,
      createdAt: now,
      updatedAt: now,
    };

    await this.githubAccountsCollection.insertOne(githubAccount);
    return githubAccount;
  }

  async getAllGitHubAccounts(): Promise<GitHubAccount[]> {
    return await this.githubAccountsCollection
      .find({})
      .sort({ priority: 1 })
      .toArray();
  }

  async getActiveGitHubAccounts(): Promise<GitHubAccount[]> {
    return await this.githubAccountsCollection
      .find({ isActive: true })
      .sort({ priority: 1 })
      .toArray();
  }

  async updateGitHubAccount(id: string, updates: Partial<GitHubAccount>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    await this.githubAccountsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
  }

  async deleteGitHubAccount(id: string): Promise<void> {
    await this.githubAccountsCollection.deleteOne({ _id: new ObjectId(id) });
  }

  async getAvailableGitHubAccount(): Promise<GitHubAccount | null> {
    // Get active accounts sorted by priority
    const activeAccounts = await this.getActiveGitHubAccounts();
    
    // Find first account that's not at max queue capacity
    for (const account of activeAccounts) {
      if (account.currentQueueLength < account.maxQueueLength) {
        return account;
      }
    }
    
    // If all are at capacity, return the highest priority one anyway
    return activeAccounts.length > 0 ? activeAccounts[0] : null;
  }

  async updateGitHubAccountQueue(id: string, queueLength: number): Promise<void> {
    await this.githubAccountsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          currentQueueLength: queueLength,
          lastUsed: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  async setGitHubAccountActive(id: string, active: boolean): Promise<void> {
    await this.githubAccountsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: active,
          updatedAt: new Date()
        }
      }
    );
  }
}

export const storage = new MongoStorage();