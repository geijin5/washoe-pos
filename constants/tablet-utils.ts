import { Dimensions, Platform } from 'react-native';

// Get initial dimensions
let { width, height } = Dimensions.get('window');

// Update dimensions when screen changes
const updateDimensions = ({ window }: { window: { width: number; height: number } }) => {
  width = window.width;
  height = window.height;
};

// Use the correct event listener based on React Native version
if (Dimensions.addEventListener) {
  Dimensions.addEventListener('change', updateDimensions);
}

export const TabletUtils = {
  // Device type detection - Enhanced for all device types
  isTablet: () => {
    const currentDimensions = Dimensions.get('window');
    const currentWidth = currentDimensions.width;
    const currentHeight = currentDimensions.height;
    const aspectRatio = currentWidth / currentHeight;
    const minDimension = Math.min(currentWidth, currentHeight);
    const maxDimension = Math.max(currentWidth, currentHeight);
    
    // Enhanced tablet detection logic
    // Consider device a tablet if:
    // 1. Either dimension is >= 768px (traditional tablet threshold)
    // 2. OR minimum dimension is >= 600px (smaller tablets)
    // 3. AND aspect ratio is reasonable (not ultra-wide or ultra-tall)
    // 4. Special handling for web to detect desktop browsers
    
    if (Platform.OS === 'web') {
      // For web, consider larger screens as tablets/desktops
      return (
        (maxDimension >= 768 || minDimension >= 600) &&
        (aspectRatio > 0.5 && aspectRatio < 2.5) // More lenient for web
      );
    }
    
    // For mobile platforms
    return (
      (maxDimension >= 768 || minDimension >= 600) &&
      (aspectRatio > 0.6 && aspectRatio < 1.8) // Typical tablet aspect ratios
    );
  },

  isLandscape: () => {
    const currentDimensions = Dimensions.get('window');
    return currentDimensions.width > currentDimensions.height;
  },
  
  // Enhanced device detection
  getDeviceType: () => {
    const currentDimensions = Dimensions.get('window');
    const currentWidth = currentDimensions.width;
    const currentHeight = currentDimensions.height;
    const minDimension = Math.min(currentWidth, currentHeight);
    const maxDimension = Math.max(currentWidth, currentHeight);
    
    if (Platform.OS === 'web') {
      if (maxDimension >= 1200) return 'desktop';
      if (maxDimension >= 768) return 'tablet';
      return 'mobile';
    }
    
    // For mobile platforms
    if (minDimension >= 768) return 'tablet';
    if (minDimension >= 600) return 'small-tablet';
    return 'mobile';
  },
  
  // Check if device is considered large (tablet or desktop)
  isLargeDevice: () => {
    const deviceType = TabletUtils.getDeviceType();
    return ['tablet', 'small-tablet', 'desktop'].includes(deviceType);
  },
  
  // Responsive dimensions - Enhanced with device type support
  getResponsiveWidth: (phoneWidth: number, tabletWidth: number, desktopWidth?: number) => {
    const deviceType = TabletUtils.getDeviceType();
    if (desktopWidth && deviceType === 'desktop') return desktopWidth;
    return TabletUtils.isTablet() ? tabletWidth : phoneWidth;
  },
  
  getResponsiveColumns: (phoneColumns: number, tabletColumns: number, desktopColumns?: number) => {
    const deviceType = TabletUtils.getDeviceType();
    if (desktopColumns && deviceType === 'desktop') return desktopColumns;
    return TabletUtils.isTablet() ? tabletColumns : phoneColumns;
  },
  
  getResponsivePadding: (phonePadding: number, tabletPadding: number, desktopPadding?: number) => {
    const deviceType = TabletUtils.getDeviceType();
    if (desktopPadding && deviceType === 'desktop') return desktopPadding;
    return TabletUtils.isTablet() ? tabletPadding : phonePadding;
  },
  
  getResponsiveFontSize: (phoneFontSize: number, tabletFontSize: number, desktopFontSize?: number) => {
    const deviceType = TabletUtils.getDeviceType();
    if (desktopFontSize && deviceType === 'desktop') return desktopFontSize;
    return TabletUtils.isTablet() ? tabletFontSize : phoneFontSize;
  },
  
  // Layout configurations - Enhanced for all device types
  getProductGridColumns: () => {
    const deviceType = TabletUtils.getDeviceType();
    const isLandscape = TabletUtils.isLandscape();
    
    switch (deviceType) {
      case 'desktop':
        return isLandscape ? 6 : 4;
      case 'tablet':
        return isLandscape ? 4 : 3;
      case 'small-tablet':
        return isLandscape ? 3 : 2;
      default: // mobile
        return 2;
    }
  },
  
  getCartWidth: () => {
    const deviceType = TabletUtils.getDeviceType();
    const isLandscape = TabletUtils.isLandscape();
    
    switch (deviceType) {
      case 'desktop':
        return isLandscape ? '35%' : '45%';
      case 'tablet':
        return isLandscape ? '40%' : '50%';
      case 'small-tablet':
        return isLandscape ? '45%' : '55%';
      default: // mobile
        return '100%';
    }
  },
  
  getMaxCartWidth: () => {
    const deviceType = TabletUtils.getDeviceType();
    
    switch (deviceType) {
      case 'desktop':
        return 600;
      case 'tablet':
        return 500;
      case 'small-tablet':
        return 450;
      default: // mobile
        return 400;
    }
  },
  
  // Touch target sizes - Enhanced for all device types
  getMinTouchTarget: () => {
    const deviceType = TabletUtils.getDeviceType();
    
    switch (deviceType) {
      case 'desktop':
        return 40; // Smaller for mouse interaction
      case 'tablet':
      case 'small-tablet':
        return 48; // Larger for touch
      default: // mobile
        return 44; // Standard mobile touch target
    }
  },
  
  // Department card layout - Enhanced for all device types
  getDepartmentCardLayout: () => {
    const deviceType = TabletUtils.getDeviceType();
    const isLandscape = TabletUtils.isLandscape();
    
    switch (deviceType) {
      case 'desktop':
        return { 
          direction: 'row' as const, 
          maxWidth: '70%',
          gap: 32
        };
      case 'tablet':
        return { 
          direction: isLandscape ? 'row' as const : 'column' as const,
          maxWidth: isLandscape ? '80%' : '100%',
          gap: 24
        };
      case 'small-tablet':
        return { 
          direction: isLandscape ? 'row' as const : 'column' as const,
          maxWidth: '90%',
          gap: 20
        };
      default: // mobile
        return { 
          direction: 'column' as const, 
          maxWidth: '100%',
          gap: 16
        };
    }
  },
  
  // Screen dimensions (dynamic)
  getScreenWidth: () => Dimensions.get('window').width,
  getScreenHeight: () => Dimensions.get('window').height,
  
  // Get screen density/scale
  getScreenScale: () => Dimensions.get('window').scale || 1,
  
  // Get safe dimensions (accounting for notches, etc.)
  getSafeDimensions: () => {
    const screen = Dimensions.get('screen');
    const window = Dimensions.get('window');
    return {
      width: window.width,
      height: window.height,
      screenWidth: screen.width,
      screenHeight: screen.height,
      scale: window.scale || 1,
      fontScale: window.fontScale || 1
    };
  },
  
  // Check if device has notch or similar
  hasNotch: () => {
    const dimensions = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    
    // Simple heuristic: if screen height is significantly larger than window height
    return Platform.OS === 'ios' && (screen.height - dimensions.height) > 50;
  },
  
  // Static initial dimensions (for backwards compatibility)
  screenWidth: width,
  screenHeight: height,
  
  // Network utilities
  getDeviceIPAddress: async (): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        return await TabletUtils.getWebIPAddress();
      } else {
        return await TabletUtils.getMobileIPAddress();
      }
    } catch (error) {
      console.error('Error getting IP address:', error);
      return 'Unknown';
    }
  },
  
  getWebIPAddress: (): Promise<string> => {
    return new Promise((resolve) => {
      try {
        // First try to get actual IP via WebRTC
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        pc.createDataChannel('');
        
        let resolved = false;
        
        pc.onicecandidate = (event) => {
          if (event.candidate && !resolved) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
            if (ipMatch) {
              const ip = ipMatch[1];
              // Prefer local network IPs
              if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                resolved = true;
                pc.close();
                resolve(ip);
                return;
              }
            }
          }
        };
        
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(() => {
            if (!resolved) {
              resolved = true;
              // Generate static IP based on device ID with expanded range and better distribution
              const deviceId = TabletUtils.getDeviceId();
              const hash = TabletUtils.hashString(deviceId);
              const secondaryHash = TabletUtils.hashString(deviceId + '_secondary');
              
              // Use multiple hash ranges to avoid collisions - expanded to 800 IPs
              const totalRange = 800;
              const ipIndex = hash % totalRange;
              
              // Add secondary hash for better distribution within ranges
              const subIndex = secondaryHash % 20;
              
              let networkBase, ipSuffix;
              if (ipIndex < 100) {
                // Range 1: 192.168.1.100-199 (100 IPs)
                networkBase = '192.168.1';
                ipSuffix = 100 + ipIndex;
              } else if (ipIndex < 200) {
                // Range 2: 192.168.2.100-199 (100 IPs)
                networkBase = '192.168.2';
                ipSuffix = 100 + (ipIndex - 100);
              } else if (ipIndex < 300) {
                // Range 3: 192.168.3.100-199 (100 IPs)
                networkBase = '192.168.3';
                ipSuffix = 100 + (ipIndex - 200);
              } else if (ipIndex < 400) {
                // Range 4: 192.168.4.100-199 (100 IPs)
                networkBase = '192.168.4';
                ipSuffix = 100 + (ipIndex - 300);
              } else if (ipIndex < 500) {
                // Range 5: 192.168.5.100-199 (100 IPs)
                networkBase = '192.168.5';
                ipSuffix = 100 + (ipIndex - 400);
              } else if (ipIndex < 600) {
                // Range 6: 192.168.6.100-199 (100 IPs)
                networkBase = '192.168.6';
                ipSuffix = 100 + (ipIndex - 500);
              } else if (ipIndex < 700) {
                // Range 7: 192.168.7.100-199 (100 IPs)
                networkBase = '192.168.7';
                ipSuffix = 100 + (ipIndex - 600);
              } else {
                // Range 8: 192.168.8.100-199 (100 IPs)
                networkBase = '192.168.8';
                ipSuffix = 100 + (ipIndex - 700);
              }
              
              // Apply sub-index for fine-tuning within range
              ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
              
              const staticIP = `${networkBase}.${ipSuffix}`;
              console.log(`Generated fallback static IP for web device: ${staticIP} (hash: ${hash}, index: ${ipIndex}, sub: ${subIndex})`);
              resolve(staticIP);
            }
          });
        
        // Timeout fallback with static IP generation
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            pc.close();
            // Generate static IP based on device ID with expanded range and better distribution
            const deviceId = TabletUtils.getDeviceId();
            const hash = TabletUtils.hashString(deviceId);
            const secondaryHash = TabletUtils.hashString(deviceId + '_secondary');
            
            // Use multiple hash ranges to avoid collisions - expanded to 800 IPs
            const totalRange = 800;
            const ipIndex = hash % totalRange;
            
            // Add secondary hash for better distribution within ranges
            const subIndex = secondaryHash % 20;
            
            let networkBase, ipSuffix;
            if (ipIndex < 100) {
              // Range 1: 192.168.1.100-199 (100 IPs)
              networkBase = '192.168.1';
              ipSuffix = 100 + ipIndex;
            } else if (ipIndex < 200) {
              // Range 2: 192.168.2.100-199 (100 IPs)
              networkBase = '192.168.2';
              ipSuffix = 100 + (ipIndex - 100);
            } else if (ipIndex < 300) {
              // Range 3: 192.168.3.100-199 (100 IPs)
              networkBase = '192.168.3';
              ipSuffix = 100 + (ipIndex - 200);
            } else if (ipIndex < 400) {
              // Range 4: 192.168.4.100-199 (100 IPs)
              networkBase = '192.168.4';
              ipSuffix = 100 + (ipIndex - 300);
            } else if (ipIndex < 500) {
              // Range 5: 192.168.5.100-199 (100 IPs)
              networkBase = '192.168.5';
              ipSuffix = 100 + (ipIndex - 400);
            } else if (ipIndex < 600) {
              // Range 6: 192.168.6.100-199 (100 IPs)
              networkBase = '192.168.6';
              ipSuffix = 100 + (ipIndex - 500);
            } else if (ipIndex < 700) {
              // Range 7: 192.168.7.100-199 (100 IPs)
              networkBase = '192.168.7';
              ipSuffix = 100 + (ipIndex - 600);
            } else {
              // Range 8: 192.168.8.100-199 (100 IPs)
              networkBase = '192.168.8';
              ipSuffix = 100 + (ipIndex - 700);
            }
            
            // Apply sub-index for fine-tuning within range
            ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
            
            const staticIP = `${networkBase}.${ipSuffix}`;
            console.log(`Generated timeout fallback static IP for web device: ${staticIP} (hash: ${hash}, index: ${ipIndex}, sub: ${subIndex})`);
            resolve(staticIP);
          }
        }, 3000);
      } catch (error) {
        console.error('Error in WebRTC IP detection:', error);
        // Generate static IP based on device ID with expanded range and better distribution
        const deviceId = TabletUtils.getDeviceId();
        const hash = TabletUtils.hashString(deviceId);
        const secondaryHash = TabletUtils.hashString(deviceId + '_secondary');
        
        // Use multiple hash ranges to avoid collisions - expanded to 800 IPs
        const totalRange = 800;
        const ipIndex = hash % totalRange;
        
        // Add secondary hash for better distribution within ranges
        const subIndex = secondaryHash % 20;
        
        let networkBase, ipSuffix;
        if (ipIndex < 100) {
          // Range 1: 192.168.1.100-199 (100 IPs)
          networkBase = '192.168.1';
          ipSuffix = 100 + ipIndex;
        } else if (ipIndex < 200) {
          // Range 2: 192.168.2.100-199 (100 IPs)
          networkBase = '192.168.2';
          ipSuffix = 100 + (ipIndex - 100);
        } else if (ipIndex < 300) {
          // Range 3: 192.168.3.100-199 (100 IPs)
          networkBase = '192.168.3';
          ipSuffix = 100 + (ipIndex - 200);
        } else if (ipIndex < 400) {
          // Range 4: 192.168.4.100-199 (100 IPs)
          networkBase = '192.168.4';
          ipSuffix = 100 + (ipIndex - 300);
        } else if (ipIndex < 500) {
          // Range 5: 192.168.5.100-199 (100 IPs)
          networkBase = '192.168.5';
          ipSuffix = 100 + (ipIndex - 400);
        } else if (ipIndex < 600) {
          // Range 6: 192.168.6.100-199 (100 IPs)
          networkBase = '192.168.6';
          ipSuffix = 100 + (ipIndex - 500);
        } else if (ipIndex < 700) {
          // Range 7: 192.168.7.100-199 (100 IPs)
          networkBase = '192.168.7';
          ipSuffix = 100 + (ipIndex - 600);
        } else {
          // Range 8: 192.168.8.100-199 (100 IPs)
          networkBase = '192.168.8';
          ipSuffix = 100 + (ipIndex - 700);
        }
        
        // Apply sub-index for fine-tuning within range
        ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
        
        const staticIP = `${networkBase}.${ipSuffix}`;
        console.log(`Generated catch fallback static IP for web device: ${staticIP} (hash: ${hash}, index: ${ipIndex}, sub: ${subIndex})`);
        resolve(staticIP);
      }
    });
  },
  
  getMobileIPAddress: async (): Promise<string> => {
    try {
      // Generate unique static IP for each device based on device ID with better distribution
      const deviceId = TabletUtils.getDeviceId();
      const hash = TabletUtils.hashString(deviceId);
      const secondaryHash = TabletUtils.hashString(deviceId + '_mobile_secondary');
      
      // Use multiple hash ranges to avoid collisions - expanded to 800 IPs across 8 networks
      // Range 1: 192.168.1.100-199 (100 IPs)
      // Range 2: 192.168.2.100-199 (100 IPs) 
      // Range 3: 192.168.3.100-199 (100 IPs)
      // Range 4: 192.168.4.100-199 (100 IPs)
      // Range 5: 192.168.5.100-199 (100 IPs)
      // Range 6: 192.168.6.100-199 (100 IPs)
      // Range 7: 192.168.7.100-199 (100 IPs)
      // Range 8: 192.168.8.100-199 (100 IPs)
      const totalRange = 800; // Total available IPs across ranges
      const ipIndex = hash % totalRange;
      
      // Add secondary hash for better distribution within ranges
      const subIndex = secondaryHash % 20; // Increased sub-range
      
      let networkBase, ipSuffix;
      if (ipIndex < 100) {
        // Range 1: 192.168.1.100-199
        networkBase = '192.168.1';
        ipSuffix = 100 + ipIndex;
      } else if (ipIndex < 200) {
        // Range 2: 192.168.2.100-199
        networkBase = '192.168.2';
        ipSuffix = 100 + (ipIndex - 100);
      } else if (ipIndex < 300) {
        // Range 3: 192.168.3.100-199
        networkBase = '192.168.3';
        ipSuffix = 100 + (ipIndex - 200);
      } else if (ipIndex < 400) {
        // Range 4: 192.168.4.100-199
        networkBase = '192.168.4';
        ipSuffix = 100 + (ipIndex - 300);
      } else if (ipIndex < 500) {
        // Range 5: 192.168.5.100-199
        networkBase = '192.168.5';
        ipSuffix = 100 + (ipIndex - 400);
      } else if (ipIndex < 600) {
        // Range 6: 192.168.6.100-199
        networkBase = '192.168.6';
        ipSuffix = 100 + (ipIndex - 500);
      } else if (ipIndex < 700) {
        // Range 7: 192.168.7.100-199
        networkBase = '192.168.7';
        ipSuffix = 100 + (ipIndex - 600);
      } else {
        // Range 8: 192.168.8.100-199
        networkBase = '192.168.8';
        ipSuffix = 100 + (ipIndex - 700);
      }
      
      // Apply sub-index for fine-tuning within range
      ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
      
      const staticIP = `${networkBase}.${ipSuffix}`;
      console.log(`Generated static IP for device ${deviceId.substring(0, 30)}...: ${staticIP} (hash: ${hash}, index: ${ipIndex}, sub: ${subIndex})`);
      return staticIP;
    } catch (error) {
      console.error('Error generating mobile IP:', error);
      return '192.168.1.100';
    }
  },
  
  // Generate a unique device ID with better uniqueness and persistence
  getDeviceId: (): string => {
    try {
      // Try to get from localStorage first
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        let deviceId = window.localStorage.getItem('pos_device_id');
        if (!deviceId) {
          // Generate highly unique ID using multiple entropy sources
          const timestamp = Date.now();
          const random1 = Math.random().toString(36).substr(2, 15);
          const random2 = Math.random().toString(36).substr(2, 15);
          const random3 = Math.random().toString(36).substr(2, 15);
          const random4 = Math.random().toString(36).substr(2, 15);
          const random5 = Math.random().toString(36).substr(2, 15);
          const random6 = Math.random().toString(36).substr(2, 15);
          
          // Use more detailed browser fingerprinting for uniqueness
          const userAgent = navigator.userAgent || 'unknown';
          const language = navigator.language || 'unknown';
          const platform = navigator.platform || 'unknown';
          const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}x${screen.pixelDepth}`;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
          const cookieEnabled = navigator.cookieEnabled ? 'cookies' : 'nocookies';
          const hardwareConcurrency = navigator.hardwareConcurrency || 0;
          const maxTouchPoints = navigator.maxTouchPoints || 0;
          const deviceMemory = (navigator as any).deviceMemory || 0;
          const connection = (navigator as any).connection;
          const connectionInfo = connection ? `${connection.effectiveType}_${connection.downlink}_${connection.rtt}` : 'no_connection';
          const webgl = TabletUtils.getWebGLFingerprint();
          const canvas = TabletUtils.getCanvasFingerprint();
          
          // Create a more unique fingerprint with additional entropy
          const fingerprint = `${userAgent}_${language}_${platform}_${screenInfo}_${timezone}_${cookieEnabled}_${hardwareConcurrency}_${maxTouchPoints}_${deviceMemory}_${connectionInfo}_${webgl}_${canvas}_${timestamp}_${Math.random()}_${Math.random()}_${Math.random()}`;
          const fingerprintHash = TabletUtils.hashString(fingerprint);
          
          deviceId = `web_${timestamp}_${random1}_${random2}_${random3}_${random4}_${random5}_${random6}_${fingerprintHash}`;
          window.localStorage.setItem('pos_device_id', deviceId);
          console.log('Generated new unique web device ID:', deviceId.substring(0, 50) + '...');
        }
        return deviceId;
      }
      
      // For mobile, try to get from global storage or generate
      const globalAny = global as any;
      const storedId = globalAny.__POS_DEVICE_ID__ || null;
      if (storedId) {
        return storedId;
      }
      
      // Generate highly unique ID for mobile
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substr(2, 15);
      const random2 = Math.random().toString(36).substr(2, 15);
      const random3 = Math.random().toString(36).substr(2, 15);
      const random4 = Math.random().toString(36).substr(2, 15);
      const random5 = Math.random().toString(36).substr(2, 15);
      const random6 = Math.random().toString(36).substr(2, 15);
      
      // Use detailed device fingerprinting
      const platformInfo = `${Platform.OS}_${Platform.Version || 'unknown'}`;
      const dimensions = Dimensions.get('window');
      const screenDimensions = Dimensions.get('screen');
      const screenInfo = `${dimensions.width}x${dimensions.height}x${dimensions.scale}x${dimensions.fontScale}`;
      const screenFullInfo = `${screenDimensions.width}x${screenDimensions.height}x${screenDimensions.scale}x${screenDimensions.fontScale}`;
      
      // Create unique fingerprint for mobile with additional entropy
      const fingerprint = `${platformInfo}_${screenInfo}_${screenFullInfo}_${timestamp}_${Math.random()}_${Math.random()}_${Math.random()}_${Math.random()}_${Math.random()}`;
      const fingerprintHash = TabletUtils.hashString(fingerprint);
      
      const newId = `mobile_${timestamp}_${random1}_${random2}_${random3}_${random4}_${random5}_${random6}_${fingerprintHash}`;
      globalAny.__POS_DEVICE_ID__ = newId;
      console.log('Generated new unique mobile device ID:', newId.substring(0, 50) + '...');
      return newId;
    } catch (error) {
      console.error('Error generating device ID:', error);
      const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 25)}_${Math.random().toString(36).substr(2, 25)}_${Math.random().toString(36).substr(2, 25)}_${Math.random().toString(36).substr(2, 25)}`;
      console.log('Using fallback device ID:', fallbackId);
      return fallbackId;
    }
  },
  
  // Enhanced hash function for better distribution and collision avoidance
  hashString: (str: string): number => {
    if (str.length === 0) return 1; // Avoid zero hash
    
    // Use multiple hash algorithms for better distribution and collision resistance
    let hash1 = 5381; // djb2 initial value
    let hash2 = 0;
    let hash3 = 0;
    
    // First hash (djb2 algorithm - better initial value)
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1) + char;
    }
    
    // Second hash (sdbm algorithm)
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
    }
    
    // Third hash (FNV-1a inspired)
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash3 = (hash3 ^ char) * 16777619;
    }
    
    // Combine all three hashes with better mixing
    let combinedHash = hash1 ^ (hash2 << 1) ^ (hash3 << 2);
    
    // Additional mixing to reduce patterns
    combinedHash = combinedHash ^ (combinedHash >>> 16);
    combinedHash = combinedHash * 0x85ebca6b;
    combinedHash = combinedHash ^ (combinedHash >>> 13);
    combinedHash = combinedHash * 0xc2b2ae35;
    combinedHash = combinedHash ^ (combinedHash >>> 16);
    
    // Ensure positive and non-zero
    combinedHash = Math.abs(combinedHash);
    return combinedHash === 0 ? 1 : combinedHash;
  },
  
  // Get static IP for this device with expanded range and better distribution
  getStaticIPAddress: async (): Promise<string> => {
    try {
      const deviceId = TabletUtils.getDeviceId();
      const hash = TabletUtils.hashString(deviceId);
      
      // Use multiple hash ranges to avoid collisions across 8 different IP ranges - expanded
      // Range 1: 192.168.1.100-199 (100 IPs)
      // Range 2: 192.168.2.100-199 (100 IPs) 
      // Range 3: 192.168.3.100-199 (100 IPs)
      // Range 4: 192.168.4.100-199 (100 IPs)
      // Range 5: 192.168.5.100-199 (100 IPs)
      // Range 6: 192.168.6.100-199 (100 IPs)
      // Range 7: 192.168.7.100-199 (100 IPs)
      // Range 8: 192.168.8.100-199 (100 IPs)
      const totalRange = 800; // Total available IPs across ranges
      const ipIndex = hash % totalRange;
      
      // Add secondary hash for better distribution within ranges
      const secondaryHash = TabletUtils.hashString(deviceId + '_static_secondary');
      const subIndex = secondaryHash % 20; // Increased sub-range
      
      let networkBase, ipSuffix;
      if (ipIndex < 100) {
        // Range 1: 192.168.1.100-199
        networkBase = '192.168.1';
        ipSuffix = 100 + ipIndex;
      } else if (ipIndex < 200) {
        // Range 2: 192.168.2.100-199
        networkBase = '192.168.2';
        ipSuffix = 100 + (ipIndex - 100);
      } else if (ipIndex < 300) {
        // Range 3: 192.168.3.100-199
        networkBase = '192.168.3';
        ipSuffix = 100 + (ipIndex - 200);
      } else if (ipIndex < 400) {
        // Range 4: 192.168.4.100-199
        networkBase = '192.168.4';
        ipSuffix = 100 + (ipIndex - 300);
      } else if (ipIndex < 500) {
        // Range 5: 192.168.5.100-199
        networkBase = '192.168.5';
        ipSuffix = 100 + (ipIndex - 400);
      } else if (ipIndex < 600) {
        // Range 6: 192.168.6.100-199
        networkBase = '192.168.6';
        ipSuffix = 100 + (ipIndex - 500);
      } else if (ipIndex < 700) {
        // Range 7: 192.168.7.100-199
        networkBase = '192.168.7';
        ipSuffix = 100 + (ipIndex - 600);
      } else {
        // Range 8: 192.168.8.100-199
        networkBase = '192.168.8';
        ipSuffix = 100 + (ipIndex - 700);
      }
      
      // Apply sub-index for fine-tuning within range
      ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
      
      const staticIP = `${networkBase}.${ipSuffix}`;
      console.log(`Static IP for device ${deviceId.substring(0, 30)}...: ${staticIP} (hash: ${hash}, index: ${ipIndex}, sub: ${subIndex})`);
      return staticIP;
    } catch (error) {
      console.error('Error generating static IP:', error);
      return '192.168.1.100';
    }
  },
  
  // Additional fingerprinting methods for better uniqueness
  getWebGLFingerprint: (): string => {
    try {
      if (typeof window === 'undefined' || !window.document) return 'no_webgl';
      
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no_webgl';
      
      const webglContext = gl as WebGLRenderingContext;
      const renderer = webglContext.getParameter(webglContext.RENDERER);
      const vendor = webglContext.getParameter(webglContext.VENDOR);
      const version = webglContext.getParameter(webglContext.VERSION);
      const shadingLanguageVersion = webglContext.getParameter(webglContext.SHADING_LANGUAGE_VERSION);
      
      return `${renderer}_${vendor}_${version}_${shadingLanguageVersion}`.replace(/\s+/g, '_');
    } catch {
      return 'webgl_error';
    }
  },
  
  getCanvasFingerprint: (): string => {
    try {
      if (typeof window === 'undefined' || !window.document) return 'no_canvas';
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no_canvas';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Canvas fingerprint test 🎭', 2, 2);
      
      return canvas.toDataURL().slice(-50); // Last 50 chars for uniqueness
    } catch {
      return 'canvas_error';
    }
  },
  
  // Clear device ID cache to force regeneration (useful for testing or device reset)
  clearDeviceId: (): void => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('pos_device_id');
        console.log('Cleared web device ID cache');
      } else {
        const globalAny = global as any;
        delete globalAny.__POS_DEVICE_ID__;
        console.log('Cleared mobile device ID cache');
      }
    } catch (error) {
      console.error('Error clearing device ID:', error);
    }
  },
  
  // Get device info for debugging
  getDeviceInfo: (): { deviceId: string; staticIP: string; hash: number; ipIndex: number } => {
    try {
      const deviceId = TabletUtils.getDeviceId();
      const hash = TabletUtils.hashString(deviceId);
      const totalRange = 800;
      const ipIndex = hash % totalRange;
      
      // Add secondary hash for better distribution within ranges
      const secondaryHash = TabletUtils.hashString(deviceId + '_debug_secondary');
      const subIndex = secondaryHash % 20;
      
      let networkBase, ipSuffix;
      if (ipIndex < 100) {
        // Range 1: 192.168.1.100-199
        networkBase = '192.168.1';
        ipSuffix = 100 + ipIndex;
      } else if (ipIndex < 200) {
        // Range 2: 192.168.2.100-199
        networkBase = '192.168.2';
        ipSuffix = 100 + (ipIndex - 100);
      } else if (ipIndex < 300) {
        // Range 3: 192.168.3.100-199
        networkBase = '192.168.3';
        ipSuffix = 100 + (ipIndex - 200);
      } else if (ipIndex < 400) {
        // Range 4: 192.168.4.100-199
        networkBase = '192.168.4';
        ipSuffix = 100 + (ipIndex - 300);
      } else if (ipIndex < 500) {
        // Range 5: 192.168.5.100-199
        networkBase = '192.168.5';
        ipSuffix = 100 + (ipIndex - 400);
      } else if (ipIndex < 600) {
        // Range 6: 192.168.6.100-199
        networkBase = '192.168.6';
        ipSuffix = 100 + (ipIndex - 500);
      } else if (ipIndex < 700) {
        // Range 7: 192.168.7.100-199
        networkBase = '192.168.7';
        ipSuffix = 100 + (ipIndex - 600);
      } else {
        // Range 8: 192.168.8.100-199
        networkBase = '192.168.8';
        ipSuffix = 100 + (ipIndex - 700);
      }
      
      // Apply sub-index for fine-tuning within range
      ipSuffix = Math.min(ipSuffix + (subIndex % 10), 199);
      
      const staticIP = `${networkBase}.${ipSuffix}`;
      
      return {
        deviceId: deviceId.substring(0, 50) + (deviceId.length > 50 ? '...' : ''),
        staticIP,
        hash,
        ipIndex
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        deviceId: 'Error',
        staticIP: '192.168.1.100',
        hash: 0,
        ipIndex: 0
      };
    }
  },
};