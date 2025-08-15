/**
 * Device Cookie Management for preventing multiple account creation
 * Creates a persistent cookie that identifies the device uniquely
 */

interface DeviceCookie {
  deviceId: string;
  fingerprint: string;
  createdAt: number;
  accountsCreated: string[];
}

class DeviceCookieManager {
  private static readonly COOKIE_NAME = 'device_restriction_id';
  private static readonly COOKIE_EXPIRES_DAYS = 365 * 3; // 3 years
  
  /**
   * Generate a unique device cookie value
   */
  private generateDeviceCookieValue(): string {
    const timestamp = Date.now();
    const randomValues = new Array(8).fill(0).map(() => Math.random().toString(36).substring(2, 8));
    return `${timestamp}-${randomValues.join('-')}`;
  }

  /**
   * Get or create device cookie
   */
  async getOrCreateDeviceCookie(): Promise<string> {
    try {
      // Check if cookie already exists
      let cookieValue = this.getDeviceCookie();
      
      if (!cookieValue) {
        // Create new device cookie
        cookieValue = this.generateDeviceCookieValue();
        this.setDeviceCookie(cookieValue);
      }
      
      return cookieValue;
    } catch (error) {
      console.error('Error managing device cookie:', error);
      // Generate a session-based identifier as fallback
      return `session-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
    }
  }

  /**
   * Get existing device cookie
   */
  private getDeviceCookie(): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === DeviceCookieManager.COOKIE_NAME) {
          return decodeURIComponent(value);
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading device cookie:', error);
      return null;
    }
  }

  /**
   * Set device cookie with long expiration
   */
  private setDeviceCookie(value: string): void {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (DeviceCookieManager.COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000));
      
      const cookieString = `${DeviceCookieManager.COOKIE_NAME}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Also try to make it secure on HTTPS
      if (window.location.protocol === 'https:') {
        document.cookie = cookieString + '; Secure';
      } else {
        document.cookie = cookieString;
      }
    } catch (error) {
      console.error('Error setting device cookie:', error);
    }
  }

  /**
   * Check if device is allowed to create accounts
   */
  async checkDeviceRestrictions(deviceFingerprint: string): Promise<{
    allowed: boolean;
    cookieValue: string;
    reason?: string;
  }> {
    try {
      const cookieValue = await this.getOrCreateDeviceCookie();
      
      // Send request to server to validate device restrictions
      const response = await fetch('/api/auth/check-device-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceFingerprint,
          cookieValue
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check device restrictions');
      }

      const result = await response.json();
      
      return {
        allowed: result.allowed,
        cookieValue,
        reason: result.reason
      };
    } catch (error) {
      console.error('Error checking device restrictions:', error);
      return {
        allowed: false,
        cookieValue: await this.getOrCreateDeviceCookie(),
        reason: 'Error checking device restrictions'
      };
    }
  }

  /**
   * Clear device cookie (for testing purposes)
   */
  clearDeviceCookie(): void {
    try {
      document.cookie = `${DeviceCookieManager.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
      console.error('Error clearing device cookie:', error);
    }
  }
}

export const deviceCookieManager = new DeviceCookieManager();
export default deviceCookieManager;