import { storage } from './storage';

// Scheduled cleanup tasks for automatic maintenance
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start automated cleanup tasks that run periodically
 * - Delete inactive users after 3 months of inactivity
 * - Delete group chat messages older than 1 month
 */
export function startScheduledCleanup() {
  // Run cleanup every 24 hours (86400000 ms)
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
  
  // Run initial cleanup after 5 minutes of server startup
  setTimeout(async () => {
    console.log('Running initial scheduled cleanup...');
    await runCleanupTasks();
  }, 5 * 60 * 1000);

  // Schedule recurring cleanup
  cleanupInterval = setInterval(async () => {
    console.log('Running scheduled cleanup tasks...');
    await runCleanupTasks();
  }, CLEANUP_INTERVAL);

  console.log('Scheduled cleanup system started - runs every 24 hours');
}

/**
 * Stop the scheduled cleanup system
 */
export function stopScheduledCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Scheduled cleanup system stopped');
  }
}

/**
 * Execute all cleanup tasks
 */
async function runCleanupTasks() {
  try {
    console.log('Starting automated cleanup tasks...');
    
    // Task 1: Clean up inactive users (3 months of inactivity)
    const inactiveUsersDeleted = await storage.deleteInactiveUsers(3);
    console.log(`Cleanup: Deleted ${inactiveUsersDeleted} inactive users (3+ months inactive)`);
    
    // Task 2: Clean up old group chat messages (1 month old)
    const oldMessagesDeleted = await storage.deleteMessagesOlderThan(30, 'automated_cleanup');
    console.log(`Cleanup: Deleted ${oldMessagesDeleted} old group messages (30+ days old)`);
    
    // Task 3: Clean up orphaned message read records
    await cleanupOrphanedMessageReads();
    
    // Task 4: Update database statistics for monitoring
    await updateCleanupStatistics(inactiveUsersDeleted, oldMessagesDeleted);
    
    console.log('Automated cleanup tasks completed successfully');
    
  } catch (error) {
    console.error('Error during scheduled cleanup:', error);
    
    // Create admin notification about cleanup failure
    try {
      await storage.createAdminNotification({
        type: 'cleanup_error',
        title: 'Scheduled Cleanup Failed',
        message: `Automated cleanup task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        read: false
      });
    } catch (notificationError) {
      console.error('Failed to create cleanup error notification:', notificationError);
    }
  }
}

/**
 * Clean up MessageRead records for deleted users/messages
 */
async function cleanupOrphanedMessageReads() {
  try {
    // This would clean up MessageRead records where the user or message no longer exists
    // Implementation depends on the storage layer capability
    console.log('Cleaning up orphaned message read records...');
    // TODO: Implement orphaned record cleanup in storage layer
  } catch (error) {
    console.error('Error cleaning up orphaned message reads:', error);
  }
}

/**
 * Update cleanup statistics for monitoring
 */
async function updateCleanupStatistics(usersDeleted: number, messagesDeleted: number) {
  try {
    const stats = {
      lastCleanup: new Date().toISOString(),
      usersDeleted,
      messagesDeleted,
      totalCleanups: 1 // This would be incremented
    };
    
    // Store cleanup stats as app setting for admin monitoring
    await storage.setAppSetting('last_cleanup_stats', JSON.stringify(stats));
    
  } catch (error) {
    console.error('Error updating cleanup statistics:', error);
  }
}

/**
 * Manually trigger cleanup tasks (for admin use)
 */
export async function triggerManualCleanup() {
  console.log('Manual cleanup triggered by admin');
  await runCleanupTasks();
}