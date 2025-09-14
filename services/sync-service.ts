import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category, POSSettings } from '@/types/pos';

export interface SyncData {
  products: Product[];
  categories: Category[];
  settings: POSSettings;
  timestamp: string;
  deviceId: string;
  version: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
  isOnline: boolean;
}

class SyncService {
  private static instance: SyncService;
  private deviceId: string;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(data: SyncData) => void> = [];
  
  private constructor() {
    this.deviceId = this.generateDeviceId();
  }
  
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }
  
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get current device info
  getDeviceInfo(): DeviceInfo {
    return {
      id: this.deviceId,
      name: `POS Terminal ${this.deviceId.slice(-4)}`,
      ip: this.getLocalIP(),
      lastSeen: new Date().toISOString(),
      isOnline: true
    };
  }
  
  private getLocalIP(): string {
    // In a real implementation, you'd get the actual IP
    // For now, return a placeholder
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
  
  // Subscribe to sync updates
  onSyncUpdate(callback: (data: SyncData) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  // Notify all listeners of sync update
  private notifyListeners(data: SyncData) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }
  
  // Create sync data from current state
  async createSyncData(products: Product[], categories: Category[], settings: POSSettings): Promise<SyncData> {
    return {
      products,
      categories,
      settings,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      version: '1.0.0'
    };
  }
  
  // Save sync data locally
  async saveSyncData(data: SyncData): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_data', JSON.stringify(data));
      await AsyncStorage.setItem('last_sync_timestamp', data.timestamp);
      console.log('Sync data saved locally');
    } catch (error) {
      console.error('Error saving sync data:', error);
      throw error;
    }
  }
  
  // Load sync data from local storage
  async loadSyncData(): Promise<SyncData | null> {
    try {
      const data = await AsyncStorage.getItem('sync_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading sync data:', error);
      return null;
    }
  }
  
  // Get last sync timestamp
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('last_sync_timestamp');
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }
  
  // Discover devices on network (simplified version)
  async discoverDevices(): Promise<DeviceInfo[]> {
    try {
      // In a real implementation, you'd scan the network for other POS devices
      // For now, return mock devices for demonstration
      const mockDevices: DeviceInfo[] = [
        {
          id: 'device_001',
          name: 'POS Terminal 1',
          ip: '192.168.1.101',
          lastSeen: new Date().toISOString(),
          isOnline: true
        },
        {
          id: 'device_002',
          name: 'POS Terminal 2',
          ip: '192.168.1.102',
          lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          isOnline: false
        }
      ];
      
      // Filter out current device
      return mockDevices.filter(device => device.id !== this.deviceId);
    } catch (error) {
      console.error('Error discovering devices:', error);
      return [];
    }
  }
  
  // Sync with a specific device
  async syncWithDevice(deviceInfo: DeviceInfo, localData: SyncData): Promise<SyncData | null> {
    try {
      console.log(`Attempting to sync with device ${deviceInfo.name} (${deviceInfo.ip})`);
      
      // In a real implementation, you'd make HTTP requests to the device
      // For now, simulate the sync process
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate receiving data from remote device
      const remoteData: SyncData = {
        products: localData.products, // In reality, this would come from the remote device
        categories: localData.categories,
        settings: localData.settings,
        timestamp: new Date().toISOString(),
        deviceId: deviceInfo.id,
        version: '1.0.0'
      };
      
      console.log(`Successfully synced with ${deviceInfo.name}`);
      return remoteData;
    } catch (error) {
      console.error(`Error syncing with device ${deviceInfo.name}:`, error);
      return null;
    }
  }
  
  // Merge sync data from multiple sources
  mergeSyncData(localData: SyncData, remoteDataList: SyncData[]): SyncData {
    console.log('Merging sync data from multiple sources');
    
    let mergedProducts = [...localData.products];
    let mergedCategories = [...localData.categories];
    let latestSettings = localData.settings;
    let latestTimestamp = localData.timestamp;
    
    remoteDataList.forEach(remoteData => {
      // Merge products (newer versions win)
      remoteData.products.forEach(remoteProduct => {
        const existingIndex = mergedProducts.findIndex(p => p.id === remoteProduct.id);
        if (existingIndex >= 0) {
          // Replace if remote is newer or if it's the same timestamp but different content
          mergedProducts[existingIndex] = remoteProduct;
        } else {
          // Add new product
          mergedProducts.push(remoteProduct);
        }
      });
      
      // Merge categories (union of all categories)
      remoteData.categories.forEach(category => {
        if (!mergedCategories.includes(category)) {
          mergedCategories.push(category);
        }
      });
      
      // Use latest settings
      if (remoteData.timestamp > latestTimestamp) {
        latestSettings = remoteData.settings;
        latestTimestamp = remoteData.timestamp;
      }
    });
    
    // Update categories in settings
    latestSettings.categories = mergedCategories;
    
    const mergedData: SyncData = {
      products: mergedProducts,
      categories: mergedCategories,
      settings: latestSettings,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      version: '1.0.0'
    };
    
    console.log(`Merged data: ${mergedProducts.length} products, ${mergedCategories.length} categories`);
    return mergedData;
  }
  
  // Perform full sync with all available devices
  async performFullSync(localData: SyncData): Promise<SyncData> {
    try {
      console.log('Starting full sync process...');
      
      // Discover available devices
      const devices = await this.discoverDevices();
      console.log(`Found ${devices.length} devices to sync with`);
      
      if (devices.length === 0) {
        console.log('No other devices found, using local data');
        return localData;
      }
      
      // Sync with each device
      const remoteDataList: SyncData[] = [];
      for (const device of devices) {
        if (device.isOnline) {
          const remoteData = await this.syncWithDevice(device, localData);
          if (remoteData) {
            remoteDataList.push(remoteData);
          }
        } else {
          console.log(`Skipping offline device: ${device.name}`);
        }
      }
      
      // Merge all data
      const mergedData = this.mergeSyncData(localData, remoteDataList);
      
      // Save merged data locally
      await this.saveSyncData(mergedData);
      
      // Notify listeners
      this.notifyListeners(mergedData);
      
      console.log('Full sync completed successfully');
      return mergedData;
    } catch (error) {
      console.error('Error during full sync:', error);
      throw error;
    }
  }
  
  // Start automatic sync (every 5 minutes)
  startAutoSync(getSyncData: () => Promise<SyncData>) {
    if (this.syncInterval) {
      this.stopAutoSync();
    }
    
    console.log('Starting automatic sync (every 5 minutes)');
    
    this.syncInterval = setInterval(async () => {
      try {
        const localData = await getSyncData();
        await this.performFullSync(localData);
      } catch (error) {
        console.error('Error in automatic sync:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  // Stop automatic sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Automatic sync stopped');
    }
  }
  
  // Manual sync trigger
  async manualSync(getSyncData: () => Promise<SyncData>): Promise<SyncData> {
    console.log('Manual sync triggered');
    const localData = await getSyncData();
    return await this.performFullSync(localData);
  }
  
  // Export sync data for manual sharing
  async exportSyncData(products: Product[], categories: Category[], settings: POSSettings): Promise<string> {
    const syncData = await this.createSyncData(products, categories, settings);
    return JSON.stringify(syncData, null, 2);
  }
  
  // Import sync data from manual sharing
  async importSyncData(jsonData: string): Promise<SyncData> {
    try {
      const syncData: SyncData = JSON.parse(jsonData);
      
      // Validate the data structure
      if (!syncData.products || !syncData.categories || !syncData.settings) {
        throw new Error('Invalid sync data format');
      }
      
      // Save imported data
      await this.saveSyncData(syncData);
      
      // Notify listeners
      this.notifyListeners(syncData);
      
      console.log('Sync data imported successfully');
      return syncData;
    } catch (error) {
      console.error('Error importing sync data:', error);
      throw error;
    }
  }
  
  // Get sync status
  async getSyncStatus(): Promise<{
    lastSync: string | null;
    deviceId: string;
    isAutoSyncEnabled: boolean;
    availableDevices: number;
  }> {
    const lastSync = await this.getLastSyncTimestamp();
    const devices = await this.discoverDevices();
    
    return {
      lastSync,
      deviceId: this.deviceId,
      isAutoSyncEnabled: this.syncInterval !== null,
      availableDevices: devices.filter(d => d.isOnline).length
    };
  }
}

export const syncService = SyncService.getInstance();