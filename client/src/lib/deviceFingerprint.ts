/**
 * Advanced device fingerprinting utility for preventing multiple account creation
 * Uses multiple browser characteristics and behavioral patterns to create a highly unique device identifier
 * Implements state-of-the-art fingerprinting techniques resistant to spoofing
 */

interface EnhancedDeviceInfo {
  // Basic browser information
  browser: {
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    vendor: string;
    product: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    webdriver: boolean;
    plugins: string[];
    mimeTypes: string[];
  };
  
  // Hardware characteristics
  hardware: {
    hardwareConcurrency: number;
    deviceMemory: number | string;
    maxTouchPoints: number;
    screenWidth: number;
    screenHeight: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    pixelRatio: number;
  };
  
  // Network and connection
  network: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } | null;
  
  // Geographic and temporal
  locale: {
    timezone: string;
    timezoneOffset: number;
    locale: string;
  };
  
  // Advanced fingerprints
  advanced: {
    webglFingerprint: string;
    canvasFingerprint: string;
    audioFingerprint: string;
    fontFingerprint: string;
    timingFingerprint: string;
  };
}

class AdvancedDeviceFingerprintGenerator {
  private static instance: AdvancedDeviceFingerprintGenerator;

  private constructor() {}

  static getInstance(): AdvancedDeviceFingerprintGenerator {
    if (!AdvancedDeviceFingerprintGenerator.instance) {
      AdvancedDeviceFingerprintGenerator.instance = new AdvancedDeviceFingerprintGenerator();
    }
    return AdvancedDeviceFingerprintGenerator.instance;
  }

  // Advanced Canvas Fingerprinting with multiple rendering techniques
  private generateCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';

      // Complex rendering to maximize entropy
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      
      // Use varied fonts to detect font rendering differences
      ctx.fillStyle = "#069";
      ctx.font = "11pt Arial";
      ctx.fillText("Cwm fjordbank glyphs vext quiz, 😃", 2, 15);
      
      // Multiple layers with different styles
      ctx.fillStyle = "rgba(102, 204, 0, 0.2)";
      ctx.font = "18pt 'Times New Roman'";
      ctx.fillText("BrowserFingerprint2025", 4, 45);
      
      // Geometric shapes with composite operations
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgb(255,0,255)";
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = "rgb(0,255,255)";
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = "rgb(255,255,0)";
      ctx.beginPath();
      ctx.arc(75, 100, 50, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      
      // Add gradients for more complexity
      const gradient = ctx.createLinearGradient(0, 0, 200, 0);
      gradient.addColorStop(0, "red");
      gradient.addColorStop(1, "blue");
      ctx.fillStyle = gradient;
      ctx.fillRect(200, 10, 100, 50);
      
      return canvas.toDataURL();
    } catch (e) {
      return 'canvas-error';
    }
  }

  // Advanced WebGL Fingerprinting
  private generateWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return 'webgl_not_supported';
      }
      
      const webglCtx = gl as WebGLRenderingContext;
      
      const fingerprint = {
        // GPU vendor and renderer information
        vendor: webglCtx.getParameter(webglCtx.VENDOR) || 'unknown',
        renderer: webglCtx.getParameter(webglCtx.RENDERER) || 'unknown',
        version: webglCtx.getParameter(webglCtx.VERSION) || 'unknown',
        shadingLanguageVersion: webglCtx.getParameter(webglCtx.SHADING_LANGUAGE_VERSION) || 'unknown',
        
        // WebGL capabilities
        maxTextureSize: webglCtx.getParameter(webglCtx.MAX_TEXTURE_SIZE),
        maxViewportDims: Array.from(webglCtx.getParameter(webglCtx.MAX_VIEWPORT_DIMS) || []),
        maxVertexAttribs: webglCtx.getParameter(webglCtx.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: webglCtx.getParameter(webglCtx.MAX_VARYING_VECTORS),
        maxFragmentUniforms: webglCtx.getParameter(webglCtx.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxVertexUniforms: webglCtx.getParameter(webglCtx.MAX_VERTEX_UNIFORM_VECTORS),
        
        // Extensions (major fingerprinting vector)
        extensions: (webglCtx.getSupportedExtensions() || []).sort(),
        
        // Unmasked vendor/renderer (if available)
        unmaskedVendor: 'unknown',
        unmaskedRenderer: 'unknown'
      };

      // Try to get unmasked vendor/renderer
      try {
        const debugInfo = webglCtx.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          fingerprint.unmaskedVendor = webglCtx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
          fingerprint.unmaskedRenderer = webglCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
      } catch (e) {
        // Silent fail
      }
      
      // Perform rendering test
      const renderingResult = this.performWebGLRenderingTest(webglCtx);
      (fingerprint as any).renderingTest = renderingResult;
      
      return JSON.stringify(fingerprint);
    } catch (e) {
      return 'webgl-error';
    }
  }

  // WebGL rendering test for hardware-specific differences
  private performWebGLRenderingTest(gl: WebGLRenderingContext): string {
    try {
      // Create a simple shader program for rendering test
      const vertexShaderSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;
      
      const fragmentShaderSource = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(0.5, 0.8, 0.2, 1.0);
        }
      `;
      
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) return 'shader-creation-failed';
      
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);
      
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) return 'shader-creation-failed';
      
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);
      
      const program = gl.createProgram();
      if (!program) return 'program-creation-failed';
      
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.useProgram(program);
      
      // Create buffer and draw
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);
      
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      // Read pixels to get rendering result
      const pixels = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      return Array.from(pixels).join(',');
    } catch (e) {
      return 'rendering-test-failed';
    }
  }

  // Advanced Audio Context Fingerprinting
  private async generateAudioFingerprint(): Promise<string> {
    try {
      // Create offline audio context for consistent processing
      const context = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
        1, // number of channels
        44100, // sample rate
        44100 // buffer length (1 second)
      );
      
      // Create oscillator with specific frequency
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 1000;
      
      // Create dynamic compressor for hardware-specific processing
      const compressor = context.createDynamicsCompressor();
      if (compressor.threshold) compressor.threshold.setValueAtTime(-50, context.currentTime);
      if (compressor.knee) compressor.knee.setValueAtTime(40, context.currentTime);
      if (compressor.ratio) compressor.ratio.setValueAtTime(12, context.currentTime);
      if (compressor.attack) compressor.attack.setValueAtTime(0, context.currentTime);
      if (compressor.release) compressor.release.setValueAtTime(0.25, context.currentTime);
      
      // Connect audio nodes
      oscillator.connect(compressor);
      compressor.connect(context.destination);
      
      // Start and stop oscillator
      oscillator.start(0);
      oscillator.stop(1);
      
      // Process audio and extract fingerprint
      const buffer = await context.startRendering();
      const channelData = buffer.getChannelData(0);
      
      // Sample specific points for fingerprint
      const samples = [];
      for (let i = 4500; i < 5000; i += 10) {
        samples.push(channelData[i]);
      }
      
      // Create hash from audio samples
      const audioHash = samples.reduce((hash, sample) => {
        return ((hash << 5) - hash) + (sample * 1000000 | 0);
      }, 0);
      
      return audioHash.toString();
    } catch (e) {
      return 'audio_not_supported';
    }
  }

  // Font Detection Fingerprinting
  private generateFontFingerprint(): string {
    const testFonts = [
      'Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana',
      'Comic Sans MS', 'Impact', 'Tahoma', 'Trebuchet MS', 'Courier New',
      'Lucida Console', 'Monaco', 'Consolas', 'DejaVu Sans', 'Liberation Sans',
      'Calibri', 'Cambria', 'Times', 'Palatino', 'Garamond', 'Futura',
      'Century Gothic', 'Optima', 'Avenir', 'Proxima Nova', 'Open Sans'
    ];
    
    const availableFonts = testFonts.filter(font => this.isFontAvailable(font));
    return availableFonts.sort().join(',');
  }

  private isFontAvailable(fontName: string): boolean {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return false;
      
      const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
      
      context.font = '72px monospace';
      const baselineSize = context.measureText(text).width;
      
      context.font = `72px "${fontName}", monospace`;
      const newSize = context.measureText(text).width;
      
      return newSize !== baselineSize;
    } catch (e) {
      return false;
    }
  }

  // Behavioral timing fingerprint
  private async generateTimingFingerprint(): Promise<string> {
    try {
      const timings: number[] = [];
      
      // Test JavaScript execution timing
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        // Perform CPU-intensive operation
        let result = 0;
        for (let j = 0; j < 100000; j++) {
          result += Math.sin(j) * Math.cos(j);
        }
        const end = performance.now();
        timings.push(end - start);
      }
      
      // Calculate timing statistics
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / timings.length;
      const min = Math.min(...timings);
      const max = Math.max(...timings);
      
      return `${avg.toFixed(3)}_${variance.toFixed(3)}_${min.toFixed(3)}_${max.toFixed(3)}`;
    } catch (e) {
      return 'timing-error';
    }
  }

  // Enhanced Browser and Hardware Fingerprinting
  private getBrowserFingerprint(): any {
    const nav = navigator as any;
    
    return {
      userAgent: nav.userAgent,
      language: nav.language,
      languages: nav.languages || [],
      platform: nav.platform,
      vendor: nav.vendor || 'unknown',
      product: nav.product || 'unknown',
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack || 'unknown',
      webdriver: nav.webdriver || false,
      plugins: Array.from(nav.plugins || []).map((p: any) => p.name).sort(),
      mimeTypes: Array.from(nav.mimeTypes || []).map((m: any) => m.type).sort()
    };
  }

  private getHardwareFingerprint(): any {
    const nav = navigator as any;
    
    return {
      hardwareConcurrency: nav.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory || 'unknown',
      maxTouchPoints: nav.maxTouchPoints || 0,
      screenWidth: screen.width,
      screenHeight: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth || screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  private getNetworkFingerprint(): any {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (!connection) return null;
    
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  private getLocaleFingerprint(): any {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale
    };
  }

  // Collect all device information
  private async collectEnhancedDeviceInfo(): Promise<EnhancedDeviceInfo> {
    const [audioFingerprint, timingFingerprint] = await Promise.all([
      this.generateAudioFingerprint(),
      this.generateTimingFingerprint()
    ]);

    return {
      browser: this.getBrowserFingerprint(),
      hardware: this.getHardwareFingerprint(),
      network: this.getNetworkFingerprint(),
      locale: this.getLocaleFingerprint(),
      advanced: {
        webglFingerprint: this.generateWebGLFingerprint(),
        canvasFingerprint: this.generateCanvasFingerprint(),
        audioFingerprint,
        fontFingerprint: this.generateFontFingerprint(),
        timingFingerprint
      }
    };
  }

  // Multiple hash algorithms for increased entropy
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // DJB2 hash algorithm
  private djb2Hash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  // SDBM hash algorithm
  private sdbmHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Create a complex hash using multiple techniques
  private createComplexHash(input: string): string {
    // Multiple hash techniques for increased entropy
    const hash1 = this.hashString(input);
    const hash2 = this.hashString(input.split('').reverse().join(''));
    const hash3 = this.djb2Hash(input);
    const hash4 = this.sdbmHash(input);
    
    return `${hash1}-${hash2}-${hash3}-${hash4}`;
  }

  // Generate comprehensive device fingerprint
  async generateFingerprint(): Promise<string> {
    try {
      const deviceInfo = await this.collectEnhancedDeviceInfo();

      // Create deterministic fingerprint string with all components
      const fingerprintComponents = [
        // Browser fingerprint
        JSON.stringify(deviceInfo.browser),
        
        // Hardware fingerprint
        JSON.stringify(deviceInfo.hardware),
        
        // Network fingerprint
        JSON.stringify(deviceInfo.network),
        
        // Locale fingerprint
        JSON.stringify(deviceInfo.locale),
        
        // Advanced fingerprints
        deviceInfo.advanced.webglFingerprint,
        this.hashString(deviceInfo.advanced.canvasFingerprint),
        deviceInfo.advanced.audioFingerprint,
        deviceInfo.advanced.fontFingerprint,
        deviceInfo.advanced.timingFingerprint
      ];

      const fingerprintString = fingerprintComponents.join('|');
      
      // Create a multi-layered hash for maximum uniqueness
      const complexHash = this.createComplexHash(fingerprintString);
      
      return complexHash;
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      
      // Fallback to basic fingerprint if advanced techniques fail
      const fallbackString = [
        navigator.userAgent,
        navigator.platform,
        screen.width.toString(),
        screen.height.toString(),
        navigator.language,
        new Date().getTimezoneOffset().toString()
      ].join('|');
      
      return this.createComplexHash(fallbackString);
    }
  }
}

// Export singleton instance
export const advancedDeviceFingerprintGenerator = AdvancedDeviceFingerprintGenerator.getInstance();

// Helper function to get device fingerprint
export async function getDeviceFingerprint(): Promise<string> {
  return await advancedDeviceFingerprintGenerator.generateFingerprint();
}

// Export the class for direct access if needed
export { AdvancedDeviceFingerprintGenerator };