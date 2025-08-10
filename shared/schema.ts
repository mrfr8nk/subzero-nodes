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
  lastClaimDate?: Date;
  // Admin fields
  isAdmin?: boolean;
  role?: string; // 'user', 'admin', 'super_admin'
  status?: string; // 'active', 'banned', 'restricted'
  restrictions?: string[]; // Array of restriction types
  deviceFingerprint?: string; // Unique device/browser fingerprint
  deviceHistory?: string[]; // History of device fingerprints
  username?: string;
  bio?: string;
  preferences?: {
    emailNotifications: boolean;
    darkMode: boolean;
    language: string;
    timezone: string;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deployment {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  status: string; // 'deploying', 'active', 'stopped', 'failed', 'insufficient_funds'
  configuration: string;
  cost: number;
  branchName?: string; // GitHub branch name for logs
  lastChargeDate?: Date; // Last time coins were deducted for this deployment
  nextChargeDate?: Date; // When the next charge will occur
  deploymentLogs?: string[]; // Array of deployment log messages
  lastLogUpdate?: Date; // Last time logs were updated
  deploymentReason?: string; // Reason for current status
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
  type: string; // 'duplicate_device', 'suspicious_activity', etc.
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

export interface DeploymentVariable {
  _id: ObjectId;
  deploymentId: ObjectId;
  key: string;
  value: string;
  description?: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  _id: ObjectId;
  userId: ObjectId;
  username: string;
  message: string;
  isAdmin: boolean;
  role?: string; // 'user', 'admin', 'super_admin'
  tags?: string[]; // '@issue', '@request', '@query', etc.
  isTagged?: boolean; // Quick check for admin notifications
  replyTo?: ObjectId; // ID of the message being replied to
  replyToMessage?: string; // Content of the original message (for quick display)
  replyToUsername?: string; // Username of the original message author
  isEdited?: boolean; // Whether this message has been edited
  editHistory?: { content: string; editedAt: Date }[]; // History of edits
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRestriction {
  _id: ObjectId;
  userId: ObjectId;
  restrictedBy: ObjectId; // Admin who restricted the user
  reason?: string;
  restrictedAt: Date;
  expiresAt?: Date; // Optional: when the restriction expires
}

export interface BannedDeviceFingerprint {
  _id: ObjectId;
  deviceFingerprint: string;
  reason?: string;
  bannedBy: ObjectId; // Admin who banned the device
  bannedAt: Date;
  affectedUsers: ObjectId[]; // Users who were using this device
}

export interface GitHubAccount {
  _id: ObjectId;
  name: string; // Friendly name for the account
  token: string; // GitHub personal access token
  owner: string; // GitHub username/organization
  repo: string; // Repository name
  workflowFile: string; // Workflow file name (e.g., 'deploy.yml')
  isActive: boolean; // Whether this account is currently active
  currentQueueLength?: number; // Current number of queued deployments (optional for backward compatibility)
  lastUsed?: Date; // When this account was last used for deployment
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
  lastClaimDate: z.date().optional(),
  // Admin fields
  isAdmin: z.boolean().default(false),
  role: z.string().default("user"),
  status: z.string().default("active"),
  restrictions: z.string().array().default([]),
  deviceFingerprint: z.string().optional(),
  deviceHistory: z.string().array().default([]),
});

export const insertDeploymentSchema = z.object({
  userId: z.string(),
  name: z.string(),
  branchName: z.string().optional(),
  status: z.string().default("active"),
  configuration: z.string().default("standard"),
  cost: z.number().default(25),
  lastChargeDate: z.date().optional(),
  nextChargeDate: z.date().optional(),
});

export const insertDeploymentVariableSchema = z.object({
  deploymentId: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  isRequired: z.boolean().default(true),
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

export const insertChatMessageSchema = z.object({
  userId: z.string(),
  username: z.string(),
  message: z.string(),
  isAdmin: z.boolean().default(false),
  role: z.string().optional(),
  tags: z.string().array().optional(),
  isTagged: z.boolean().optional(),
  replyTo: z.string().optional(), // ID of the message being replied to
  replyToMessage: z.string().optional(), // Content of the original message
  replyToUsername: z.string().optional(), // Username of the original message author
  isEdited: z.boolean().optional().default(false),
  editHistory: z.array(z.object({
    content: z.string(),
    editedAt: z.date()
  })).optional(),
});

export const insertBannedDeviceFingerprintSchema = z.object({
  deviceFingerprint: z.string(),
  reason: z.string().optional(),
  bannedBy: z.string(),
  affectedUsers: z.string().array().default([]),
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type InsertDeploymentVariable = z.infer<typeof insertDeploymentVariableSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertBannedDeviceFingerprint = z.infer<typeof insertBannedDeviceFingerprintSchema>;

// For backward compatibility
export type UpsertUser = InsertUser;