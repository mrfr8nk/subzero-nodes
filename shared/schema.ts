import { z } from "zod";
import { ObjectId } from "mongodb";

// Define MongoDB document interfaces
export interface User {
  _id: ObjectId;
  googleId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  authProvider: string;
  emailVerified: boolean;
  coinBalance: number;
  referralCode?: string;
  referredById?: string;
  password?: string;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  status: string;
  configuration: string;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  _id: ObjectId;
  userId: ObjectId;
  type: string;
  amount: number;
  description: string;
  relatedId?: ObjectId;
  createdAt: Date;
}

export interface Referral {
  _id: ObjectId;
  referrerId: ObjectId;
  referredId: ObjectId;
  rewardClaimed: boolean;
  rewardAmount: number;
  createdAt: Date;
}

export interface Session {
  _id: ObjectId;
  sid: string;
  sess: any;
  expire: Date;
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  googleId: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  authProvider: z.string().default("google"),
  emailVerified: z.boolean().default(true),
  coinBalance: z.number().default(100),
  referralCode: z.string().optional(),
  referredById: z.string().optional(),
  password: z.string().optional(),
  verificationToken: z.string().optional(),
  verificationTokenExpiry: z.date().optional(),
  isVerified: z.boolean().optional(),
});

export const insertDeploymentSchema = z.object({
  userId: z.string(),
  name: z.string(),
  status: z.string().default("active"),
  configuration: z.string().default("standard"),
  cost: z.number().default(25),
});

export const insertTransactionSchema = z.object({
  userId: z.string(),
  type: z.string(),
  amount: z.number(),
  description: z.string(),
  relatedId: z.string().optional(),
});

export const insertReferralSchema = z.object({
  referrerId: z.string(),
  referredId: z.string(),
  rewardClaimed: z.boolean().default(false),
  rewardAmount: z.number().default(50),
});

export const insertSessionSchema = z.object({
  sid: z.string(),
  sess: z.any(),
  expire: z.date(),
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// For backward compatibility
export type UpsertUser = InsertUser;