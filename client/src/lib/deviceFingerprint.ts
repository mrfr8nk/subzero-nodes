/**
 * Device fingerprinting utility for preventing multiple account creation
 * Uses browser characteristics to create a unique device identifier
 */

interface DeviceInfo {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  pixelRatio: number;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  webglVendor: string;
  webglRenderer: string;
  canvasFingerprint: string;
  audioFingerprint: string;
}

class DeviceFingerprintGenerator {
  private static instance: DeviceFingerprintGenerator;

  static getInstance(): DeviceFingerprintGenerator {
    if (!DeviceFingerprintGenerator.instance) {
      DeviceFingerprintGenerator.instance = new DeviceFingerprintGenerator();
    }
    return DeviceFingerprintGenerator.instance;
  }

  private getWebGLInfo(): { vendor: string; renderer: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return { vendor: 'unknown', renderer: 'unknown' };
      }
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return { vendor: 'unknown', renderer: 'unknown' };
      }
      
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown',
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
      };
    } catch (e) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'unknown';

      // Draw some text and shapes to create a unique canvas signature
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprinting test 123', 2, 2);
      ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.fillRect(125, 1, 62, 20);
      
      return canvas.toDataURL().slice(-50); // Last 50 chars for efficiency
    } catch (e) {
      return 'unknown';
    }
  }

  private getAudioFingerprint(): string {
    try {
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      oscillator.stop();
      audioContext.close();
      
      return Array.from(frequencyData).slice(0, 10).join('');
    } catch (e) {
      return 'unknown';
    }
  }

  private async collectDeviceInfo(): Promise<DeviceInfo> {
    const nav = navigator;
    const screen = window.screen;
    const webglInfo = this.getWebGLInfo();
    
    return {
      userAgent: nav.userAgent,
      language: nav.language,
      languages: Array.from(nav.languages),
      platform: nav.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack,
      hardwareConcurrency: nav.hardwareConcurrency || 0,
      maxTouchPoints: nav.maxTouchPoints || 0,
      webglVendor: webglInfo.vendor,
      webglRenderer: webglInfo.renderer,
      canvasFingerprint: this.getCanvasFingerprint(),
      audioFingerprint: this.getAudioFingerprint()
    };
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async generateFingerprint(): Promise<string> {
    try {
      const deviceInfo = await this.collectDeviceInfo();
      
      // Create a deterministic string from device info
      const fingerprintString = [
        deviceInfo.userAgent,
        deviceInfo.platform,
        deviceInfo.screenResolution,
        deviceInfo.timezone,
        deviceInfo.colorDepth.toString(),
        deviceInfo.pixelRatio.toString(),
        deviceInfo.cookieEnabled.toString(),
        deviceInfo.hardwareConcurrency.toString(),
        deviceInfo.maxTouchPoints.toString(),
        deviceInfo.webglVendor,
        deviceInfo.webglRenderer,
        deviceInfo.canvasFingerprint,
        deviceInfo.audioFingerprint,
        deviceInfo.languages.join(',')
      ].join('|');
      
      // Hash the fingerprint string for privacy
      return await this.hashString(fingerprintString);
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      // Fallback to a simpler fingerprint
      const fallbackString = `${navigator.userAgent}|${navigator.platform}|${screen.width}x${screen.height}`;
      return await this.hashString(fallbackString);
    }
  }
}

// Export singleton instance
export const deviceFingerprintGenerator = DeviceFingerprintGenerator.getInstance();

// Helper function to get device fingerprint
export async function getDeviceFingerprint(): Promise<string> {
  return await deviceFingerprintGenerator.generateFingerprint();
}