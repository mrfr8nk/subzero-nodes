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
  profilePicture?: string; // Base64 encoded profile picture
  socialProfiles?: {
    github?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    darkMode: boolean;
    language: string;
    timezone: string;
  };
  // Location data
  country?: string; // User's country - can be set by user or from IP geolocation
  registrationIp?: string; // IP address used during registration
  lastLoginIp?: string; // Last login IP address
  lastLogin?: Date;
  // Device restrictions
  maxAccountsPerDevice?: number; // Max accounts allowed per device (default 1)
  deviceAccountCount?: number; // Current number of accounts on this device
  // Bot limits
  maxBots?: number; // Maximum bots allowed (default 10)
  currentBotCount?: number; // Current number of bots
  // Activity tracking
  lastActivity?: Date; // Last time user was active (login, message, etc.)
  // Read message tracking
  unreadMessageCount?: number; // Number of unread messages in chat
  lastReadMessage?: ObjectId; // ID of last message user read
  createdAt: Date;
  updatedAt: Date;
}

// Login history interface
export interface LoginHistory {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  username?: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  loginMethod: string; // 'local', 'google', 'github'
  success: boolean;
  failureReason?: string;
  sessionDuration?: number; // Duration in minutes
  logoutTime?: Date;
  createdAt: Date;
}

// Developer info settings interface
export interface DeveloperInfo {
  _id: ObjectId;
  name: string;
  appName?: string;
  channels: {
    youtube?: string;
    tiktok?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    github?: string;
    whatsapp?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  };
  isActive: boolean;
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
  deploymentNumber?: number; // Sequential deployment number for user
  totalDeployments?: number; // Total deployments count for this user
  githubToken?: string; // GitHub token used for this deployment
  githubOwner?: string; // GitHub owner/org used for this deployment
  githubRepo?: string; // GitHub repository used for this deployment
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
  messageType?: 'text' | 'image' | 'file'; // Type of message
  imageUrl?: string; // URL for image messages
  imageData?: string; // Base64 encoded image data
  fileName?: string; // Original file name for file messages
  fileSize?: number; // File size in bytes
  // Auto-deletion settings
  expiresAt?: Date; // When this message should be auto-deleted
  autoDeleteReason?: 'group_chat_retention' | 'inactive_user' | 'admin_cleanup'; // Why it will be deleted
  createdAt: Date;
  updatedAt: Date;
}

// Track user read status for messages
export interface UserMessageRead {
  _id: ObjectId;
  userId: ObjectId;
  messageId: ObjectId;
  readAt: Date;
  // For group chats - track which group the read status is for
  groupId?: ObjectId; // Future use for group chat functionality
}

// Store device-specific information to prevent multiple accounts
export interface DeviceRestriction {
  _id: ObjectId;
  deviceFingerprint: string;
  cookieValue: string; // Stored cookie value for device identification
  accountsCreated: ObjectId[]; // List of user accounts created on this device
  maxAccountsAllowed: number; // Maximum accounts allowed (configurable by admin)
  firstAccountCreated: Date; // When the first account was created on this device
  lastActivity: Date; // Last activity on this device
  isBlocked: boolean; // Whether this device is blocked from creating new accounts
  blockedReason?: string; // Reason for blocking
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

export interface CoinTransfer {
  _id: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  fromEmail: string; // Email of sender
  toEmailOrUsername: string; // Email or username of recipient
  amount: number;
  message?: string; // Optional message with the transfer
  status: string; // 'pending', 'completed', 'failed', 'cancelled'
  transactionId?: ObjectId; // Related transaction ID
  createdAt: Date;
  updatedAt: Date;
}

export interface BannedUser {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  reason: string;
  bannedBy: ObjectId; // Admin who banned the user
  bannedAt: Date;
  country?: string;
  deviceFingerprints?: string[];
  isActive: boolean; // Can be unbanned by setting to false
}

export interface VoucherCode {
  _id: ObjectId;
  code: string; // Unique voucher code
  coinAmount: number; // Amount of coins to give
  createdBy: ObjectId; // Admin who created this voucher
  expiresAt?: Date; // Optional expiry date
  isActive: boolean; // Whether the voucher can be used
  usageCount: number; // How many times it has been used
  maxUsage?: number; // Optional: maximum number of uses (default: 1)
  usedBy: ObjectId[]; // Array of user IDs who have used this voucher
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
  coinBalance: z.number().default(10),
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
  username: z.string().optional(),
  bio: z.string().optional(),
  profilePicture: z.string().optional(),
  socialProfiles: z.object({
    github: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    whatsapp: z.string().optional(),
  }).optional(),
  // Device restrictions
  maxAccountsPerDevice: z.number().default(1),
  deviceAccountCount: z.number().default(0),
  // Bot limits
  maxBots: z.number().default(10),
  currentBotCount: z.number().default(0),
});

export const insertLoginHistorySchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  ipAddress: z.string(),
  userAgent: z.string(),
  deviceFingerprint: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  loginMethod: z.string(),
  success: z.boolean(),
  failureReason: z.string().optional(),
  sessionDuration: z.number().optional(),
  logoutTime: z.date().optional(),
});

export const insertDeveloperInfoSchema = z.object({
  name: z.string(),
  appName: z.string().optional(),
  channels: z.object({
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    whatsapp: z.string().optional(),
    discord: z.string().optional(),
    telegram: z.string().optional(),
    website: z.string().optional(),
  }),
  isActive: z.boolean().default(true),
});

export const insertDeploymentSchema = z.object({
  userId: z.string(),
  name: z.string(),
  branchName: z.string().optional(),
  status: z.string().default("active"),
  configuration: z.string().default("standard"),
  cost: z.number().default(10),
  githubToken: z.string().optional(),
  githubOwner: z.string().optional(),
  githubRepo: z.string().optional(),
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

export const insertCoinTransferSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  fromEmail: z.string().email(),
  toEmailOrUsername: z.string(),
  amount: z.number().positive(),
  message: z.string().optional(),
  status: z.string().default('pending'),
});

export const insertBannedUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  reason: z.string(),
  bannedBy: z.string(),
  country: z.string().optional(),
  deviceFingerprints: z.string().array().optional(),
  isActive: z.boolean().default(true),
});

export const insertVoucherCodeSchema = z.object({
  code: z.string().min(3).max(50),
  coinAmount: z.number().positive(),
  createdBy: z.string(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
  maxUsage: z.number().positive().optional().default(1),
});

export const insertReferralSchema = z.object({
  referrerId: z.string(),
  referredId: z.string(),
  rewardClaimed: z.boolean().default(false),
  rewardAmount: z.number().default(10),
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
  messageType: z.enum(['text', 'image', 'file']).optional().default('text'),
  imageUrl: z.string().optional(),
  imageData: z.string().optional(), // Base64 encoded image data
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});

export const insertBannedDeviceFingerprintSchema = z.object({
  deviceFingerprint: z.string(),
  reason: z.string().optional(),
  bannedBy: z.string(),
  affectedUsers: z.string().array().default([]),
});

export const insertUserMessageReadSchema = z.object({
  userId: z.string(),
  messageId: z.string(),
  groupId: z.string().optional(),
});

export const insertDeviceRestrictionSchema = z.object({
  deviceFingerprint: z.string(),
  cookieValue: z.string(),
  accountsCreated: z.string().array().default([]),
  maxAccountsAllowed: z.number().default(1),
  isBlocked: z.boolean().default(false),
  blockedReason: z.string().optional(),
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
export type InsertCoinTransfer = z.infer<typeof insertCoinTransferSchema>;
export type InsertBannedUser = z.infer<typeof insertBannedUserSchema>;
export type InsertVoucherCode = z.infer<typeof insertVoucherCodeSchema>;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type InsertDeveloperInfo = z.infer<typeof insertDeveloperInfoSchema>;
export type InsertUserMessageRead = z.infer<typeof insertUserMessageReadSchema>;
export type InsertDeviceRestriction = z.infer<typeof insertDeviceRestrictionSchema>;

// For backward compatibility
export type UpsertUser = InsertUser;