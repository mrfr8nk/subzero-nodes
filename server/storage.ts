import {
  User,
  Deployment,
  Transaction,
  Referral,
  AdminNotification,
  AppSettings,
  InsertUser,
  InsertDeployment,
  InsertTransaction,
  InsertReferral,
  InsertAdminNotification,
  InsertAppSettings,
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
  upsertUser(user: InsertUser): Promise<User>;
  
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
  promoteToAdmin(userId: string, adminId: string): Promise<void>;
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

  async getUser(id: string): Promise<User | undefined> {
    const user = await this.usersCollection.findOne({ _id: new ObjectId(id) });
    return user || undefined;
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

  async upsertUser(userData: InsertUser): Promise<User> {
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
    const deployment = await this.deploymentsCollection.findOne({ _id: new ObjectId(id) });
    return deployment || undefined;
  }

  async updateDeploymentStatus(id: string, status: string): Promise<void> {
    await this.deploymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  async deleteDeployment(id: string): Promise<void> {
    await this.deploymentsCollection.deleteOne({ _id: new ObjectId(id) });
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
}

export const storage = new MongoStorage();