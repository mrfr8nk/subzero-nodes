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
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  // Admin fields
  isAdmin?: boolean;
  role?: string; // 'user', 'admin', 'super_admin'
  status?: string; // 'active', 'banned', 'restricted'
  restrictions?: string[]; // Array of restriction types
  registrationIp?: string;
  lastLoginIp?: string;
  ipHistory?: string[];
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

export interface AdminNotification {
  _id: ObjectId;
  type: string; // 'duplicate_ip', 'suspicious_activity', etc.
  title: string;
  message: string;
  data?: any; // Additional data related to the notification
  read: boolean;
  createdAt: Date;
}

export interface AppSettings {
  _id: ObjectId;
  key: string;
  value: any;
  description?: string;
  updatedBy?: ObjectId; // Admin who updated this setting
  createdAt: Date;
  updatedAt: Date;
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
  resetPasswordToken: z.string().optional(),
  resetPasswordExpiry: z.date().optional(),
  // Admin fields
  isAdmin: z.boolean().default(false),
  role: z.string().default("user"),
  status: z.string().default("active"),
  restrictions: z.string().array().default([]),
  registrationIp: z.string().optional(),
  lastLoginIp: z.string().optional(),
  ipHistory: z.string().array().default([]),
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

export const insertAdminNotificationSchema = z.object({
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.any().optional(),
  read: z.boolean().optional().default(false),
});

export const insertAppSettingsSchema = z.object({
  key: z.string(),
  value: z.any(),
  description: z.string().optional(),
  updatedBy: z.string().optional(),
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

// For backward compatibility
export type UpsertUser = InsertUser;