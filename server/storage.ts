import {
  User,
  Deployment,
  Transaction,
  Referral,
  InsertUser,
  InsertDeployment,
  InsertTransaction,
  InsertReferral,
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
  createLocalUser(userData: any): Promise<any>;
  verifyUser(userId: string): Promise<void>;
  upsertUser(user: InsertUser): Promise<User>;
  
  // Deployment operations
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  getUserDeployments(userId: string): Promise<Deployment[]>;
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

  async createLocalUser(userData: any): Promise<any> {
    const now = new Date();
    const newUser = {
      ...userData,
      coinBalance: 100,
      emailVerified: false,
      authProvider: 'local',
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
}

export const storage = new MongoStorage();