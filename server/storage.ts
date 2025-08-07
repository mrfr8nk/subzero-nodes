import {
  users,
  deployments,
  transactions,
  referrals,
  type User,
  type UpsertUser,
  type InsertDeployment,
  type Deployment,
  type InsertTransaction,
  type Transaction,
  type InsertReferral,
  type Referral,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sum, count, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(userData: { email: string; password: string; firstName?: string; lastName?: string; referredById?: string }): Promise<User>;
  
  // Email verification operations
  setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  verifyEmail(token: string): Promise<User | null>;
  clearEmailVerificationToken(userId: string): Promise<void>;
  
  // Deployment operations
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  getUserDeployments(userId: string): Promise<Deployment[]>;
  getDeployment(id: number): Promise<Deployment | undefined>;
  updateDeploymentStatus(id: number, status: string): Promise<void>;
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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate referral code if not provided
    if (!userData.referralCode) {
      userData.referralCode = await this.generateReferralCode();
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // If user was referred, create referral record and reward referrer
    if (userData.referredById && user.id !== userData.referredById) {
      try {
        await this.createReferral({
          referrerId: userData.referredById,
          referredId: user.id,
        });
        
        // Award referral bonus
        await this.updateUserBalance(userData.referredById, 50);
        await this.createTransaction({
          userId: userData.referredById,
          type: "referral",
          amount: 50,
          description: "Referral bonus for new user signup",
          relatedId: null,
        });
      } catch (error) {
        console.log("Referral processing failed:", error);
        // Don't fail user creation if referral fails
      }
    }
    
    return user;
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const [newDeployment] = await db
      .insert(deployments)
      .values(deployment)
      .returning();

    // Deduct coins for deployment
    const cost = deployment.cost || 25;
    await this.updateUserBalance(deployment.userId, -cost);
    await this.createTransaction({
      userId: deployment.userId,
      type: "deployment",
      amount: -cost,
      description: `Bot deployment: ${deployment.name}`,
      relatedId: newDeployment.id,
    });

    return newDeployment;
  }

  async getUserDeployments(userId: string): Promise<Deployment[]> {
    return await db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, userId))
      .orderBy(desc(deployments.createdAt));
  }

  async getDeployment(id: number): Promise<Deployment | undefined> {
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.id, id));
    return deployment;
  }

  async updateDeploymentStatus(id: number, status: string): Promise<void> {
    await db
      .update(deployments)
      .set({ status, updatedAt: new Date() })
      .where(eq(deployments.id, id));
  }

  async getDeploymentStats(userId: string): Promise<{
    total: number;
    active: number;
    stopped: number;
    thisMonth: number;
  }> {
    const allDeployments = await this.getUserDeployments(userId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: allDeployments.length,
      active: allDeployments.filter(d => d.status === "active").length,
      stopped: allDeployments.filter(d => d.status === "stopped").length,
      thisMonth: allDeployments.filter(d => d.createdAt && d.createdAt >= thisMonth).length,
    };
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async updateUserBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        coinBalance: sql`${users.coinBalance} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
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
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    referralEarnings: number;
    monthlyReferrals: number;
  }> {
    const userReferrals = await this.getUserReferrals(userId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const referralTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "referral")
        )
      );

    const totalEarnings = referralTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyReferrals = userReferrals.filter(r => r.createdAt && r.createdAt >= thisMonth).length;

    return {
      totalReferrals: userReferrals.length,
      referralEarnings: totalEarnings,
      monthlyReferrals,
    };
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, code));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationTokenExpires: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async verifyEmail(token: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          sql`${users.emailVerificationTokenExpires} > NOW()`
        )
      );

    if (!user) {
      return null;
    }

    // Update user as verified and clear token
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { ...user, emailVerified: true };
  }

  async clearEmailVerificationToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async createLocalUser(userData: { email: string; password: string; firstName?: string; lastName?: string; referredById?: string }): Promise<User> {
    const referralCode = await this.generateReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        authProvider: "local",
        referralCode,
        referredById: userData.referredById,
      })
      .returning();
    
    // If user was referred, create referral record and reward referrer
    if (userData.referredById && user.id !== userData.referredById) {
      try {
        await this.createReferral({
          referrerId: userData.referredById,
          referredId: user.id,
        });
        
        // Award referral bonus
        await this.updateUserBalance(userData.referredById, 50);
        await this.createTransaction({
          userId: userData.referredById,
          type: "referral",
          amount: 50,
          description: "Referral bonus for new user signup",
          relatedId: null,
        });
      } catch (error) {
        console.log("Referral processing failed:", error);
      }
    }
    
    return user;
  }
}

export const storage = new DatabaseStorage();
