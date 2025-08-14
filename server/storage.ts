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
  BannedDeviceFingerprint,
  CoinTransfer,
  BannedUser,
  LoginHistory,
  DeveloperInfo,
  InsertUser,
  InsertDeployment,
  InsertTransaction,
  InsertReferral,
  InsertAdminNotification,
  InsertAppSettings,
  InsertDeploymentVariable,
  InsertChatMessage,
  InsertBannedDeviceFingerprint,
  InsertCoinTransfer,
  InsertBannedUser,
  InsertLoginHistory,
  InsertDeveloperInfo,
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
  checkUsernameAvailability(username: string): Promise<boolean>;
  
  // Deployment operations
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  deleteDeployment(id: string): Promise<void>;
  getUserDeployments(userId: string): Promise<Deployment[]>;
  getAllDeployments(): Promise<Deployment[]>;
  getDeployments(): Promise<Deployment[]>;
  getDeployment(id: string): Promise<Deployment | undefined>;
  updateDeploymentStatus(id: string, status: string): Promise<void>;
  getDeploymentStats(userId: string): Promise<{
    total: number;
    active: number;
    stopped: number;
    thisMonth: number;
  }>;
  updateDeploymentChargeDate(id: string, lastChargeDate: Date, nextChargeDate: Date): Promise<void>;
  updateDeploymentStatus(id: string, status: string): Promise<void>;
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
  getUsersByDeviceFingerprint(fingerprint: string): Promise<User[]>;
  updateUserDeviceFingerprint(userId: string, fingerprint: string): Promise<void>;
  
  // Device fingerprint banning operations
  banDeviceFingerprint(fingerprint: string, reason: string, bannedBy: string): Promise<void>;
  unbanDeviceFingerprint(fingerprint: string): Promise<void>;
  getBannedDeviceFingerprints(): Promise<BannedDeviceFingerprint[]>;
  isDeviceFingerprintBanned(fingerprint: string): Promise<boolean>;
  
  // Admin notification operations
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(limit?: number): Promise<AdminNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  
  // App settings operations
  getAppSetting(key: string): Promise<AppSettings | undefined>;
  setAppSetting(setting: InsertAppSettings): Promise<AppSettings>;
  getAllAppSettings(): Promise<AppSettings[]>;
  
  // Deployment lookup operations
  getDeploymentByBranchName(branchName: string): Promise<Deployment | undefined>;
  
  // Maintenance mode operations
  isMaintenanceModeEnabled(): Promise<boolean>;
  setMaintenanceMode(enabled: boolean, adminId: string, message?: string): Promise<void>;
  
  // User deletion and device management  
  deleteUser(userId: string, adminId: string): Promise<void>;
  
  // Daily billing operations
  processDeploymentDailyCharges(): Promise<void>;
  
  // Enhanced deployment monitoring operations
  addDeploymentLogs(deploymentId: string, logs: string[]): Promise<void>;
  analyzeDeploymentStatus(deploymentId: string): Promise<{ status: string; logs?: string[]; lastCheck?: Date }>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  updateChatMessage(messageId: string, content: string, userId: string): Promise<void>;
  deleteChatMessage(messageId: string, userId: string, isAdmin: boolean): Promise<void>;
  getChatMessage(messageId: string): Promise<ChatMessage | undefined>;
  restrictUserFromChat(userId: string, restrictedBy: string, reason?: string): Promise<void>;
  unrestrictUserFromChat(userId: string): Promise<void>;
  isChatRestricted(userId: string): Promise<boolean>;
  
  // Coin transfer operations
  createCoinTransfer(transfer: InsertCoinTransfer): Promise<CoinTransfer>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  processCoinTransfer(transferId: string): Promise<void>;
  getCoinTransfers(userId: string): Promise<CoinTransfer[]>;
  updateCoinTransferStatus(transferId: string, status: string): Promise<void>;
  
  // Banned user management
  createBannedUser(bannedUser: InsertBannedUser): Promise<BannedUser>;
  getBannedUsers(limit?: number): Promise<BannedUser[]>;
  removeBannedUser(userId: string): Promise<void>;
  isBannedUser(userId: string): Promise<boolean>;
  
  // Deployment number tracking
  getNextDeploymentNumber(userId: string): Promise<number>;
  getUserTotalDeployments(userId: string): Promise<number>;
  getAllUsersWithCountryInfo(limit?: number): Promise<User[]>;
  updateUserCountry(userId: string, country: string): Promise<void>;
  
  // GitHub account management
  createGitHubAccount(account: {
    name: string;
    token: string;
    owner: string;
    repo: string;
    workflowFile: string;
  }): Promise<GitHubAccount>;
  getAllGitHubAccounts(): Promise<GitHubAccount[]>;
  getActiveGitHubAccounts(): Promise<GitHubAccount[]>;
  updateGitHubAccount(id: string, updates: Partial<GitHubAccount>): Promise<void>;
  deleteGitHubAccount(id: string): Promise<void>;
  getAvailableGitHubAccount(): Promise<GitHubAccount | null>;
  getBestGitHubAccount(): Promise<GitHubAccount | null>;
  updateGitHubAccountUsage(id: string): Promise<void>;
  setGitHubAccountActive(id: string, active: boolean): Promise<void>;
  testGitHubAccountToken(id: string): Promise<{ isValid: boolean; error?: string; rateLimitRemaining?: number }>;
  
  // User password change operations
  changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  
  // Username operations
  checkUsernameAvailability(username: string): Promise<boolean>;
  updateUsername(userId: string, username: string): Promise<void>;
  updateUserLastLogin(userId: string, ipAddress: string): Promise<void>;
  
  // Login history operations
  createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory>;
  getUserLoginHistory(userId: string, limit?: number): Promise<LoginHistory[]>;
  updateLoginSessionEnd(loginId: string, logoutTime: Date, sessionDuration: number): Promise<void>;
  
  // Device restriction operations
  checkDeviceAccountLimit(deviceFingerprint: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }>;
  incrementDeviceAccountCount(deviceFingerprint: string): Promise<void>;
  decrementDeviceAccountCount(deviceFingerprint: string): Promise<void>;
  
  // Bot limit operations
  checkUserBotLimit(userId: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }>;
  incrementUserBotCount(userId: string): Promise<void>;
  decrementUserBotCount(userId: string): Promise<void>;
  
  // Developer info operations
  getDeveloperInfo(): Promise<DeveloperInfo | undefined>;
  setDeveloperInfo(developerInfo: InsertDeveloperInfo): Promise<DeveloperInfo>;
  updateDeveloperInfo(id: string, updates: Partial<DeveloperInfo>): Promise<void>;
  
  // Branch name availability
  checkBranchNameAvailability(branchName: string, userId?: string): Promise<boolean>;
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

  private get bannedDeviceFingerprintsCollection() {
    return getDb().collection<BannedDeviceFingerprint>("bannedDeviceFingerprints");
  }

  private get coinTransfersCollection() {
    return getDb().collection<CoinTransfer>("coinTransfers");
  }

  private get bannedUsersCollection() {
    return getDb().collection<BannedUser>("bannedUsers");
  }

  private get loginHistoryCollection() {
    return getDb().collection<LoginHistory>("loginHistory");
  }

  private get developerInfoCollection() {
    return getDb().collection<DeveloperInfo>("developerInfo");
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
    
    // Get default coin balance from admin settings
    const defaultCoinsSetting = await this.getAppSetting('default_coin_balance');
    const defaultCoins = parseInt(defaultCoinsSetting?.value) || 20; // Fallback to 20 coins if not set by admin
    
    const newUser = {
      ...userData,
      coinBalance: defaultCoins,
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
          // Get referral bonus from admin settings
          const referralBonusSetting = await this.getAppSetting('referral_bonus');
          const referralBonus = referralBonusSetting?.value || 10;
          
          await this.createReferral({
            referrerId: referrer._id.toString(),
            referredId: result.insertedId.toString(),
            rewardClaimed: false,
            rewardAmount: referralBonus,
          });
          
          // Award referral bonus
          await this.updateUserBalance(referrer._id.toString(), referralBonus);
          await this.createTransaction({
            userId: referrer._id.toString(),
            type: "referral",
            amount: referralBonus,
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
      if (userData.deviceFingerprint) {
        const existingAccountsFromDevice = await this.getUsersByDeviceFingerprint(userData.deviceFingerprint);
        
        // Get configurable max accounts per device from admin settings (default to 1)
        const maxAccountsSetting = await this.getAppSetting('max_accounts_per_device');
        const maxAccountsPerDevice = maxAccountsSetting?.value || 1;
        
        // Check if any of the existing accounts are active (not banned)
        const activeAccounts = existingAccountsFromDevice.filter(user => 
          user.status !== 'banned' && user.status !== 'restricted'
        );
        
        if (activeAccounts.length >= maxAccountsPerDevice) {
          throw new Error(`Multiple accounts detected from this device. Only ${maxAccountsPerDevice} account(s) allowed per device. Contact support if you believe this is an error.`);
        }
        
        // Set device fingerprint in user data
        userData.deviceHistory = [userData.deviceFingerprint];
      }
      // Create new user
      if (!userData.referralCode) {
        userData.referralCode = await this.generateReferralCode();
      }

      // Get default coin balance from admin settings
      const defaultCoinsSetting = await this.getAppSetting('default_coin_balance');
      const defaultCoins = parseInt(defaultCoinsSetting?.value) || 20; // Fallback to 20 coins if not set by admin
      
      const newUser: Omit<User, '_id'> = {
        ...userData,
        coinBalance: userData.coinBalance || defaultCoins,
        emailVerified: userData.emailVerified || true,
        authProvider: userData.authProvider || 'google',
        // Set default admin fields
        isAdmin: userData.isAdmin || false,
        role: userData.role || 'user',
        status: userData.status || 'active',
        restrictions: userData.restrictions || [],
        // Device fingerprint tracking fields
        deviceFingerprint: userData.deviceFingerprint,
        deviceHistory: userData.deviceHistory || [],
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.usersCollection.insertOne(newUser as User);
      const user = { ...newUser, _id: result.insertedId } as User;

      // Handle referral if provided
      if (userData.referredById && user._id.toString() !== userData.referredById) {
        try {
          // Get referral bonus from admin settings
          const referralBonusSetting = await this.getAppSetting('referral_bonus');
          const referralBonus = referralBonusSetting?.value || 10;
          
          await this.createReferral({
            referrerId: userData.referredById,
            referredId: user._id.toString(),
            rewardClaimed: false,
            rewardAmount: referralBonus,
          });
          
          // Award referral bonus
          await this.updateUserBalance(userData.referredById, referralBonus);
          await this.createTransaction({
            userId: userData.referredById,
            type: "referral",
            amount: referralBonus,
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

  async getDeployments(): Promise<Deployment[]> {
    return this.getAllDeployments();
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

  // Enhanced method with log monitoring moved to end of class

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
    // If this is a deduction, check if user has enough balance first
    if (amount < 0) {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      if (user.coinBalance + amount < 0) {
        throw new Error('Insufficient coin balance');
      }
    }

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
      rewardAmount: referral.rewardAmount || 10,
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

  async searchUsers(searchTerm: string, limit: number = 50): Promise<User[]> {
    const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive search
    
    return await this.usersCollection
      .find({
        $or: [
          { email: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { username: searchRegex },
          { referralCode: searchRegex }
        ]
      })
      .sort({ createdAt: -1 })
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

  async getUsersByDeviceFingerprint(fingerprint: string): Promise<User[]> {
    return await this.usersCollection
      .find({ 
        $or: [
          { deviceFingerprint: fingerprint },
          { deviceHistory: { $in: [fingerprint] } }
        ]
      })
      .toArray();
  }

  async updateUserDeviceFingerprint(userId: string, fingerprint: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const deviceHistory = user.deviceHistory || [];
    if (!deviceHistory.includes(fingerprint)) {
      deviceHistory.push(fingerprint);
      // Keep only last 10 device fingerprints
      if (deviceHistory.length > 10) {
        deviceHistory.shift();
      }
    }

    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          deviceFingerprint: fingerprint,
          deviceHistory,
          updatedAt: new Date()
        }
      }
    );

    // Check for multiple accounts from same device
    const usersWithSameDevice = await this.getUsersByDeviceFingerprint(fingerprint);
    if (usersWithSameDevice.length > 1) {
      await this.createAdminNotification({
        type: "duplicate_device",
        title: "Multiple Accounts from Same Device",
        message: `${usersWithSameDevice.length} accounts detected from the same device`,
        data: { 
          deviceFingerprint: fingerprint, 
          userIds: usersWithSameDevice.map(u => u._id.toString()),
          userEmails: usersWithSameDevice.map(u => u.email)
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
  async getDeploymentByBranchName(branchName: string): Promise<Deployment | undefined> {
    try {
      const deployment = await this.deploymentsCollection.findOne({ branchName });
      return deployment || undefined;
    } catch (error) {
      console.error('Error getting deployment by branch name:', error);
      return undefined;
    }
  }

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

    // Get daily charge rate from settings - admin controlled with fallback
    const dailyChargeSetting = await this.getAppSetting('daily_charge');
    const dailyCharge = dailyChargeSetting?.value || 5;

    for (const deployment of activeDeployments) {
      try {
        // Get user to check balance
        const user = await this.getUser(deployment.userId.toString());
        if (!user) continue;

        // Check if user has enough coins for maintenance charge
        if (user.coinBalance < dailyCharge) {
          // Delete the deployment permanently when user has zero balance
          await this.deleteDeployment(deployment._id.toString());
          
          // Create transaction record for failed charge and deletion
          await this.createTransaction({
            userId: deployment.userId.toString(),
            type: 'deployment_deleted',
            amount: 0,
            description: `Deployment deleted permanently: ${deployment.name} (insufficient funds - user balance: ${user.coinBalance}, required: ${dailyCharge})`,
            relatedId: deployment._id.toString()
          });
          
          console.log(`Deleted deployment ${deployment.name} permanently due to insufficient funds (balance: ${user.coinBalance}, required: ${dailyCharge})`);
          continue;
        }

        // Deduct daily maintenance charge from user
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
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const now = new Date();
    
    // Extract tags from message content
    const tagRegex = /@(issue|request|query)\b/gi;
    const tags: string[] = [];
    let messageContent = message.message;
    
    // Find all tags in the message
    const matches = messageContent.match(tagRegex);
    if (matches) {
      matches.forEach(match => {
        tags.push(match.toLowerCase());
      });
    }
    
    const isTagged = tags.length > 0;
    
    const chatMessage: ChatMessage = {
      _id: new ObjectId(),
      userId: new ObjectId(message.userId),
      username: message.username,
      message: message.message,
      isAdmin: message.isAdmin,
      role: message.role,
      tags: tags.length > 0 ? tags : undefined,
      isTagged,
      messageType: message.messageType || 'text',
      imageUrl: message.imageUrl,
      imageData: message.imageData,
      fileName: message.fileName,
      fileSize: message.fileSize,
      replyTo: message.replyTo ? new ObjectId(message.replyTo) : undefined,
      replyToMessage: message.replyToMessage,
      replyToUsername: message.replyToUsername,
      createdAt: now,
      updatedAt: now,
    };

    await this.chatMessagesCollection.insertOne(chatMessage);
    
    // Create admin notification for tagged messages
    if (isTagged && !message.isAdmin) {
      const tagString = tags.join(', ');
      await this.createAdminNotification({
        type: 'tagged_message',
        title: `User Message Tagged: ${tagString}`,
        message: `${message.username} sent a tagged message: "${message.message}"`,
        data: {
          messageId: chatMessage._id.toString(),
          userId: message.userId,
          username: message.username,
          tags: tags,
          originalMessage: message.message
        },
        read: false
      });
    }
    
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
      currentQueueLength: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.githubAccountsCollection.insertOne(githubAccount);
    return githubAccount;
  }

  async getAllGitHubAccounts(): Promise<GitHubAccount[]> {
    return await this.githubAccountsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getActiveGitHubAccounts(): Promise<GitHubAccount[]> {
    return await this.githubAccountsCollection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
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
    // Get active accounts
    const activeAccounts = await this.getActiveGitHubAccounts();
    return activeAccounts.length > 0 ? activeAccounts[0] : null;
  }

  async getBestGitHubAccount(): Promise<GitHubAccount | null> {
    const activeAccounts = await this.getActiveGitHubAccounts();
    
    if (activeAccounts.length === 0) {
      return null;
    }
    
    // Try to find an account with available capacity by checking GitHub API
    for (const account of activeAccounts) {
      try {
        // Check current workflow runs to see if account is busy
        const response = await fetch(
          `https://api.github.com/repos/${account.owner}/${account.repo}/actions/runs?status=queued&status=in_progress`,
          {
            headers: {
              'Authorization': `token ${account.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const runningWorkflows = data.total_count || 0;
          
          // If this account has fewer than 5 running workflows, use it
          if (runningWorkflows < 5) {
            await this.updateGitHubAccountUsage(account._id.toString());
            return account;
          }
        }
      } catch (error) {
        console.error(`Error checking GitHub account ${account.name}:`, error);
        // Continue to next account if there's an error
      }
    }
    
    // If all accounts are busy, return the least recently used one
    const leastRecentlyUsed = activeAccounts.sort((a, b) => {
      const dateA = a.lastUsed?.getTime() || 0;
      const dateB = b.lastUsed?.getTime() || 0;
      return dateA - dateB;
    })[0];
    
    if (leastRecentlyUsed) {
      await this.updateGitHubAccountUsage(leastRecentlyUsed._id.toString());
    }
    
    return leastRecentlyUsed;
  }

  async updateGitHubAccountUsage(id: string): Promise<void> {
    await this.githubAccountsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
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

  async testGitHubAccountToken(id: string): Promise<{ isValid: boolean; error?: string; rateLimitRemaining?: number; lastUsed?: string }> {
    try {
      const account = await this.githubAccountsCollection.findOne({ _id: new ObjectId(id) });
      if (!account) {
        return { isValid: false, error: 'GitHub account not found' };
      }

      // Test the token by making a request to GitHub API
      const response = await fetch(`https://api.github.com/repos/${account.owner}/${account.repo}`, {
        headers: {
          'Authorization': `token ${account.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SUBZERO-Token-Test'
        }
      });

      const rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10);
      const now = new Date();

      if (response.ok) {
        // Update lastUsed timestamp when token is successfully validated
        await this.updateGitHubAccountUsage(id);
        
        return { 
          isValid: true, 
          rateLimitRemaining,
          lastUsed: now.toISOString()
        };
      } else if (response.status === 401) {
        return { 
          isValid: false, 
          error: 'Invalid or expired token', 
          rateLimitRemaining,
          lastUsed: account.lastUsed?.toISOString()
        };
      } else if (response.status === 404) {
        return { 
          isValid: false, 
          error: 'Repository not found or access denied', 
          rateLimitRemaining,
          lastUsed: account.lastUsed?.toISOString()
        };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { 
          isValid: false, 
          error: `GitHub API error: ${response.status} ${errorText}`, 
          rateLimitRemaining,
          lastUsed: account.lastUsed?.toISOString()
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const bcrypt = require('bcryptjs');
    
    // Get user and verify current password
    const user = await this.usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.password) {
      throw new Error('Password change not available for this account type');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      }
    );
  }

  // Device fingerprint banning operations
  async banDeviceFingerprint(fingerprint: string, reason: string, bannedBy: string): Promise<void> {
    // Get all users with this device fingerprint
    const affectedUsers = await this.getUsersByDeviceFingerprint(fingerprint);
    
    const now = new Date();
    const bannedDevice: BannedDeviceFingerprint = {
      _id: new ObjectId(),
      deviceFingerprint: fingerprint,
      reason,
      bannedBy: new ObjectId(bannedBy),
      bannedAt: now,
      affectedUsers: affectedUsers.map(user => user._id)
    };

    // Insert the banned device fingerprint
    await this.bannedDeviceFingerprintsCollection.insertOne(bannedDevice);

    // Ban all users associated with this device fingerprint
    for (const user of affectedUsers) {
      await this.updateUserStatus(user._id.toString(), 'banned', ['device_fingerprint_banned']);
    }

    // Create admin notification
    await this.createAdminNotification({
      type: 'device_fingerprint_banned',
      title: 'Device Fingerprint Banned',
      message: `Device fingerprint banned affecting ${affectedUsers.length} user(s): ${reason}`,
      data: {
        deviceFingerprint: fingerprint,
        reason,
        affectedUsers: affectedUsers.map(u => ({ id: u._id.toString(), email: u.email })),
        bannedBy
      },
      read: false
    });
  }

  async unbanDeviceFingerprint(fingerprint: string): Promise<void> {
    // Find the banned device fingerprint record
    const bannedDevice = await this.bannedDeviceFingerprintsCollection.findOne({ 
      deviceFingerprint: fingerprint 
    });
    
    if (!bannedDevice) {
      return; // Already unbanned or never banned
    }

    // Remove the banned device fingerprint record
    await this.bannedDeviceFingerprintsCollection.deleteOne({ 
      deviceFingerprint: fingerprint 
    });

    // Unban all users that were banned solely for this device fingerprint
    for (const userId of bannedDevice.affectedUsers) {
      const user = await this.getUser(userId.toString());
      if (user && user.status === 'banned' && 
          user.restrictions?.includes('device_fingerprint_banned')) {
        // Check if they have any other restrictions
        const otherRestrictions = user.restrictions.filter(r => r !== 'device_fingerprint_banned');
        if (otherRestrictions.length === 0) {
          await this.updateUserStatus(userId.toString(), 'active', []);
        } else {
          await this.updateUserStatus(userId.toString(), user.status, otherRestrictions);
        }
      }
    }

    // Create admin notification
    await this.createAdminNotification({
      type: 'device_fingerprint_unbanned',
      title: 'Device Fingerprint Unbanned',
      message: `Device fingerprint unbanned affecting ${bannedDevice.affectedUsers.length} user(s)`,
      data: {
        deviceFingerprint: fingerprint,
        affectedUsers: bannedDevice.affectedUsers.map(id => id.toString())
      },
      read: false
    });
  }

  async getBannedDeviceFingerprints(): Promise<BannedDeviceFingerprint[]> {
    return await this.bannedDeviceFingerprintsCollection
      .find({})
      .sort({ bannedAt: -1 })
      .toArray();
  }

  async isDeviceFingerprintBanned(fingerprint: string): Promise<boolean> {
    const bannedDevice = await this.bannedDeviceFingerprintsCollection.findOne({
      deviceFingerprint: fingerprint
    });
    return !!bannedDevice;
  }

  async getChatMessage(messageId: string): Promise<ChatMessage | undefined> {
    try {
      if (!messageId || typeof messageId !== 'string' || messageId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
        console.warn(`Invalid ObjectId format: ${messageId}`);
        return undefined;
      }
      
      const message = await this.chatMessagesCollection.findOne({ _id: new ObjectId(messageId) });
      return message || undefined;
    } catch (error) {
      console.error(`Error getting chat message with id ${messageId}:`, error);
      return undefined;
    }
  }

  async updateChatMessage(messageId: string, content: string, userId: string): Promise<void> {
    const message = await this.getChatMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user owns the message or is admin
    if (message.userId.toString() !== userId) {
      const user = await this.getUser(userId);
      if (!user?.isAdmin) {
        throw new Error('Unauthorized to edit this message');
      }
    }

    // Add current content to edit history
    const editHistory = message.editHistory || [];
    editHistory.push({
      content: message.message,
      editedAt: new Date()
    });

    await this.chatMessagesCollection.updateOne(
      { _id: new ObjectId(messageId) },
      { 
        $set: { 
          message: content,
          isEdited: true,
          editHistory: editHistory,
          updatedAt: new Date()
        }
      }
    );
  }

  async deleteChatMessage(messageId: string, userId: string, isAdmin: boolean): Promise<void> {
    const message = await this.getChatMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user owns the message or is admin
    if (message.userId.toString() !== userId && !isAdmin) {
      throw new Error('Unauthorized to delete this message');
    }

    await this.chatMessagesCollection.deleteOne({ _id: new ObjectId(messageId) });
  }

  // Enhanced deployment monitoring operations
  async addDeploymentLogs(deploymentId: string, logs: string[]): Promise<void> {
    try {
      if (!deploymentId || typeof deploymentId !== 'string' || deploymentId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(deploymentId)) {
        throw new Error(`Invalid ObjectId format: ${deploymentId}`);
      }
      
      const now = new Date();
      await this.deploymentsCollection.updateOne(
        { _id: new ObjectId(deploymentId) },
        { 
          $push: { 
            logs: { 
              $each: logs.map((log: string) => ({ content: log, timestamp: now }))
            }
          },
          $set: { updatedAt: now }
        }
      );
    } catch (error) {
      console.error(`Error adding deployment logs for ${deploymentId}:`, error);
      throw error;
    }
  }



  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ username });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async updateUserProfile(userId: string, profileData: { 
    firstName: string; 
    lastName: string; 
    username: string; 
    bio: string;
    profilePicture?: string;
    socialProfiles?: {
      github?: string;
      facebook?: string;
      instagram?: string;
      tiktok?: string;
      whatsapp?: string;
    };
  }): Promise<void> {
    try {
      if (!userId || typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        throw new Error('Invalid user ID format');
      }

      const updateData: any = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        username: profileData.username,
        bio: profileData.bio,
        updatedAt: new Date()
      };

      if (profileData.profilePicture !== undefined) {
        updateData.profilePicture = profileData.profilePicture;
      }



      if (profileData.socialProfiles) {
        updateData.socialProfiles = profileData.socialProfiles;
      }

      await this.usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserProfileById(userId: string): Promise<User | null> {
    try {
      if (!userId || typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        throw new Error('Invalid user ID format');
      }
      return await this.usersCollection.findOne({ _id: new ObjectId(userId) });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      if (!userId || typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        throw new Error('Invalid user ID format');
      }

      await this.usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: {
            preferences: preferences,
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  async updateDeploymentStatus(id: string, status: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error(`Invalid ObjectId format: ${id}`);
      }
      
      await this.deploymentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status, 
            updatedAt: new Date() 
          }
        }
      );
    } catch (error) {
      console.error(`Error updating deployment status for ${id}:`, error);
      throw error;
    }
  }

  async analyzeDeploymentStatus(deploymentId: string): Promise<{ status: string; reason?: string }> {
    try {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment || !(deployment as any).deploymentLogs) {
        return { status: 'deploying' };
      }

      const logs = Array.isArray((deployment as any).deploymentLogs) ? (deployment as any).deploymentLogs : [];
      const recentLogs = logs.slice(-50); // Analyze last 50 log entries
      const logText = recentLogs.join(' ').toLowerCase();

      // Success indicators
      const successPatterns = [
        'deployment successful',
        'deploy complete',
        'successfully deployed',
        'deployment finished',
        'build successful',
        'started successfully',
        'server is running',
        'application started',
        'workflow completed successfully',
        'deployment completed'
      ];

      // Failure indicators
      const failurePatterns = [
        'deployment failed',
        'deploy failed',
        'error occurred',
        'build failed',
        'failed to start',
        'deployment error',
        'fatal error',
        'cannot start',
        'startup failed',
        'deployment unsuccessful',
        'workflow failed',
        'build error'
      ];

      // Check for success
      for (const pattern of successPatterns) {
        if (logText.includes(pattern)) {
          return { status: 'active', reason: 'Deployment completed successfully' };
        }
      }

      // Check for failure
      for (const pattern of failurePatterns) {
        if (logText.includes(pattern)) {
          return { status: 'failed', reason: 'Deployment failed - check logs for details' };
        }
      }

      // If logs haven't been updated in a while, consider it stalled
      const lastUpdate = deployment.lastLogUpdate || deployment.updatedAt;
      const timeSinceUpdate = Date.now() - new Date(lastUpdate).getTime();
      
      if (timeSinceUpdate > 10 * 60 * 1000) { // 10 minutes
        return { status: 'failed', reason: 'Deployment timed out' };
      }

      return { status: 'deploying' };
    } catch (error) {
      console.error('Error analyzing deployment logs:', error);
      return { status: 'failed', reason: 'Error analyzing deployment status' };
    }
  }

  // Coin transfer operations
  async createCoinTransfer(transfer: InsertCoinTransfer): Promise<CoinTransfer> {
    const coinTransfer: CoinTransfer = {
      _id: new ObjectId(),
      fromUserId: new ObjectId(transfer.fromUserId),
      toUserId: new ObjectId(transfer.toUserId),
      fromEmail: transfer.fromEmail,
      toEmailOrUsername: transfer.toEmailOrUsername,
      amount: transfer.amount,
      message: transfer.message,
      status: transfer.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.coinTransfersCollection.insertOne(coinTransfer);
    return coinTransfer;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    // Try to find by email first, then by username
    let user = await this.usersCollection.findOne({ email: usernameOrEmail });
    if (!user) {
      user = await this.usersCollection.findOne({ username: usernameOrEmail });
    }
    return user || undefined;
  }

  async processCoinTransfer(transferId: string): Promise<void> {
    const transfer = await this.coinTransfersCollection.findOne({ _id: new ObjectId(transferId) });
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new Error('Transfer is not in pending status');
    }

    // Get sender and receiver
    const sender = await this.getUser(transfer.fromUserId.toString());
    const receiver = await this.getUser(transfer.toUserId.toString());

    if (!sender || !receiver) {
      await this.updateCoinTransferStatus(transferId, 'failed');
      throw new Error('Sender or receiver not found');
    }

    // Check if sender has enough balance
    if (sender.coinBalance < transfer.amount) {
      await this.updateCoinTransferStatus(transferId, 'failed');
      throw new Error('Insufficient balance');
    }

    // Process the transfer
    await this.updateUserBalance(sender._id.toString(), -transfer.amount);
    await this.updateUserBalance(receiver._id.toString(), transfer.amount);

    // Create transaction records
    await this.createTransaction({
      userId: sender._id.toString(),
      type: 'coin_transfer_sent',
      amount: -transfer.amount,
      description: `Sent ${transfer.amount} coins to ${transfer.toEmailOrUsername}`,
      relatedId: transferId
    });

    await this.createTransaction({
      userId: receiver._id.toString(),
      type: 'coin_transfer_received',
      amount: transfer.amount,
      description: `Received ${transfer.amount} coins from ${transfer.fromEmail}`,
      relatedId: transferId
    });

    // Mark transfer as completed
    await this.updateCoinTransferStatus(transferId, 'completed');
  }

  async getCoinTransfers(userId: string): Promise<CoinTransfer[]> {
    return await this.coinTransfersCollection
      .find({
        $or: [
          { fromUserId: new ObjectId(userId) },
          { toUserId: new ObjectId(userId) }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async updateCoinTransferStatus(transferId: string, status: string): Promise<void> {
    await this.coinTransfersCollection.updateOne(
      { _id: new ObjectId(transferId) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );
  }

  // Banned user management
  async createBannedUser(bannedUser: InsertBannedUser): Promise<BannedUser> {
    const banned: BannedUser = {
      _id: new ObjectId(),
      userId: new ObjectId(bannedUser.userId),
      email: bannedUser.email,
      username: bannedUser.username,
      firstName: bannedUser.firstName,
      lastName: bannedUser.lastName,
      reason: bannedUser.reason,
      bannedBy: new ObjectId(bannedUser.bannedBy),
      bannedAt: new Date(),
      country: bannedUser.country,
      deviceFingerprints: bannedUser.deviceFingerprints,
      isActive: bannedUser.isActive ?? true,
    };

    await this.bannedUsersCollection.insertOne(banned);
    return banned;
  }

  async getBannedUsers(limit: number = 100): Promise<BannedUser[]> {
    return await this.bannedUsersCollection
      .find({ isActive: true })
      .sort({ bannedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async removeBannedUser(userId: string): Promise<void> {
    await this.bannedUsersCollection.updateOne(
      { userId: new ObjectId(userId) },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
  }

  async isBannedUser(userId: string): Promise<boolean> {
    const banned = await this.bannedUsersCollection.findOne({ 
      userId: new ObjectId(userId),
      isActive: true
    });
    return !!banned;
  }

  // Deployment number tracking
  async getNextDeploymentNumber(userId: string): Promise<number> {
    const count = await this.deploymentsCollection.countDocuments({
      userId: new ObjectId(userId)
    });
    return count + 1;
  }

  async getUserTotalDeployments(userId: string): Promise<number> {
    return await this.deploymentsCollection.countDocuments({
      userId: new ObjectId(userId)
    });
  }

  async getAllUsersWithCountryInfo(limit: number = 100): Promise<User[]> {
    return await this.usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateUserCountry(userId: string, country: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          country,
          updatedAt: new Date()
        }
      }
    );
  }

  // Username operations
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const existingUser = await this.usersCollection.findOne({ username });
    return !existingUser;
  }

  async updateUsername(userId: string, username: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          username,
          updatedAt: new Date()
        }
      }
    );
  }

  async updateUserLastLogin(userId: string, ipAddress: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          lastLogin: new Date(),
          lastLoginIp: ipAddress,
          updatedAt: new Date()
        }
      }
    );
  }

  // Login history operations
  async createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory> {
    const history: LoginHistory = {
      _id: new ObjectId(),
      userId: new ObjectId(loginHistory.userId),
      email: loginHistory.email,
      username: loginHistory.username,
      ipAddress: loginHistory.ipAddress,
      userAgent: loginHistory.userAgent,
      deviceFingerprint: loginHistory.deviceFingerprint,
      location: loginHistory.location,
      loginMethod: loginHistory.loginMethod,
      success: loginHistory.success,
      failureReason: loginHistory.failureReason,
      sessionDuration: loginHistory.sessionDuration,
      logoutTime: loginHistory.logoutTime,
      createdAt: new Date(),
    };

    await this.loginHistoryCollection.insertOne(history);
    return history;
  }

  async getUserLoginHistory(userId: string, limit: number = 50): Promise<LoginHistory[]> {
    return await this.loginHistoryCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async updateLoginSessionEnd(loginId: string, logoutTime: Date, sessionDuration: number): Promise<void> {
    await this.loginHistoryCollection.updateOne(
      { _id: new ObjectId(loginId) },
      { 
        $set: { 
          logoutTime,
          sessionDuration
        }
      }
    );
  }

  // Device restriction operations
  async checkDeviceAccountLimit(deviceFingerprint: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }> {
    const currentCount = await this.usersCollection.countDocuments({ 
      deviceFingerprint,
      status: { $ne: 'banned' }
    });
    const maxAllowed = 1; // Default limit of 1 account per device
    
    return {
      allowed: currentCount < maxAllowed,
      currentCount,
      maxAllowed
    };
  }

  async incrementDeviceAccountCount(deviceFingerprint: string): Promise<void> {
    await this.usersCollection.updateMany(
      { deviceFingerprint },
      { 
        $inc: { deviceAccountCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async decrementDeviceAccountCount(deviceFingerprint: string): Promise<void> {
    await this.usersCollection.updateMany(
      { deviceFingerprint },
      { 
        $inc: { deviceAccountCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );
  }

  // Bot limit operations
  async checkUserBotLimit(userId: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }> {
    const user = await this.usersCollection.findOne({ _id: new ObjectId(userId) });
    const currentCount = user?.currentBotCount || 0;
    const maxAllowed = user?.maxBots || 10;
    
    return {
      allowed: currentCount < maxAllowed,
      currentCount,
      maxAllowed
    };
  }

  async incrementUserBotCount(userId: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { currentBotCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async decrementUserBotCount(userId: string): Promise<void> {
    await this.usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { currentBotCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );
  }

  // Developer info operations
  async getDeveloperInfo(): Promise<DeveloperInfo | undefined> {
    const info = await this.developerInfoCollection.findOne({ isActive: true });
    return info || undefined;
  }

  async setDeveloperInfo(developerInfo: InsertDeveloperInfo): Promise<DeveloperInfo> {
    // Deactivate existing developer info
    await this.developerInfoCollection.updateMany(
      {},
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    const info: DeveloperInfo = {
      _id: new ObjectId(),
      name: developerInfo.name,
      appName: developerInfo.appName,
      channels: developerInfo.channels,
      isActive: developerInfo.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.developerInfoCollection.insertOne(info);
    return info;
  }

  async updateDeveloperInfo(id: string, updates: Partial<DeveloperInfo>): Promise<void> {
    await this.developerInfoCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date()
        }
      }
    );
  }

  // Branch name availability
  async checkBranchNameAvailability(branchName: string, userId?: string): Promise<boolean> {
    const query: any = { branchName };
    if (userId) {
      query.userId = { $ne: new ObjectId(userId) };
    }
    
    const existingDeployment = await this.deploymentsCollection.findOne(query);
    return !existingDeployment;
  }
}

export const storage = new MongoStorage();