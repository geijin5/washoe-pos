import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { 
  X, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  Clock,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Share2,
  FileText
} from 'lucide-react-native';
import { syncService, DeviceInfo, SyncData } from '@/services/sync-service';

interface SyncManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncManagement({ visible, onClose }: SyncManagementProps) {
  const { products, availableCategories, settings, importSettings, exportSettings } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: string | null;
    deviceId: string;
    isAutoSyncEnabled: boolean;
    availableDevices: number;
  } | null>(null);
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState('');

  // Load sync status on mount
  useEffect(() => {
    if (visible) {
      loadSyncStatus();
      loadDevices();
    }
  }, [visible]);

  const loadSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      setAutoSyncEnabled(status.isAutoSyncEnabled);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const discoveredDevices = await syncService.discoverDevices();
      setDevices(discoveredDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsLoading(true);
      
      const getSyncData = async (): Promise<SyncData> => {
        return await syncService.createSyncData(products, availableCategories, settings);
      };

      const mergedData = await syncService.manualSync(getSyncData);
      
      // Apply merged data to POS store
      await importSettings(mergedData);
      
      Alert.alert('Success', 'Sync completed successfully!');
      await loadSyncStatus();
    } catch (error) {
      console.error('Error during manual sync:', error);
      Alert.alert('Error', 'Failed to sync. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const getSyncData = async (): Promise<SyncData> => {
          return await syncService.createSyncData(products, availableCategories, settings);
        };
        
        syncService.startAutoSync(getSyncData);
        Alert.alert('Auto Sync Enabled', 'Products and categories will sync automatically every 5 minutes.');
      } else {
        syncService.stopAutoSync();
        Alert.alert('Auto Sync Disabled', 'Automatic syncing has been turned off.');
      }
      
      setAutoSyncEnabled(enabled);
      await loadSyncStatus();
    } catch (error) {
      console.error('Error toggling auto sync:', error);
      Alert.alert('Error', 'Failed to toggle auto sync.');
    }
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const data = await syncService.exportSyncData(products, availableCategories, settings);
      setExportData(data);
      setShowExportModal(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export sync data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      Alert.alert('Error', 'Please paste the sync data first.');
      return;
    }

    try {
      setIsLoading(true);
      const syncData = await syncService.importSyncData(importData);
      await importSettings(syncData);
      
      setImportData('');
      setShowImportModal(false);
      Alert.alert('Success', 'Sync data imported successfully!');
      await loadSyncStatus();
    } catch (error) {
      console.error('Error importing data:', error);
      Alert.alert('Error', 'Failed to import sync data. Please check the format and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const copyToClipboard = async (text: string) => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Export Data', 'Copy this data and share it with other devices:', [
      { text: 'OK', style: 'default' }
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <RefreshCw size={24} color={TheatreColors.accent} />
            <Text style={styles.title}>Sync Management</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={TheatreColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Sync Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            {syncStatus && (
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Clock size={20} color={TheatreColors.textSecondary} />
                  <Text style={styles.statusText}>
                    Last Sync: {formatLastSync(syncStatus.lastSync)}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Smartphone size={20} color={TheatreColors.textSecondary} />
                  <Text style={styles.statusText}>
                    Device ID: {syncStatus.deviceId.slice(-8)}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Wifi size={20} color={TheatreColors.textSecondary} />
                  <Text style={styles.statusText}>
                    Available Devices: {syncStatus.availableDevices}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Auto Sync */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Automatic Sync</Text>
              <Switch
                value={autoSyncEnabled}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: TheatreColors.surfaceLight, true: TheatreColors.accent }}
                thumbColor={autoSyncEnabled ? TheatreColors.background : TheatreColors.textSecondary}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Automatically sync products and categories with other devices every 5 minutes
            </Text>
          </View>

          {/* Manual Sync */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manual Sync</Text>
            <Text style={styles.sectionDescription}>
              Sync now with all available devices on your network
            </Text>
            <TouchableOpacity
              style={[styles.syncButton, isLoading && styles.syncButtonDisabled]}
              onPress={handleManualSync}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={TheatreColors.background} />
              ) : (
                <RefreshCw size={20} color={TheatreColors.background} />
              )}
              <Text style={styles.syncButtonText}>
                {isLoading ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Available Devices */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Devices</Text>
            <Text style={styles.sectionDescription}>
              Other POS devices detected on your network
            </Text>
            {devices.length === 0 ? (
              <View style={styles.noDevicesContainer}>
                <WifiOff size={32} color={TheatreColors.textSecondary} />
                <Text style={styles.noDevicesText}>No other devices found</Text>
                <Text style={styles.noDevicesSubtext}>
                  Make sure other devices are on the same network
                </Text>
              </View>
            ) : (
              <View style={styles.devicesList}>
                {devices.map((device) => (
                  <View key={device.id} style={styles.deviceItem}>
                    <View style={styles.deviceInfo}>
                      <View style={styles.deviceStatus}>
                        {device.isOnline ? (
                          <CheckCircle size={16} color={TheatreColors.success} />
                        ) : (
                          <AlertCircle size={16} color={TheatreColors.error} />
                        )}
                        <Text style={styles.deviceName}>{device.name}</Text>
                      </View>
                      <Text style={styles.deviceDetails}>
                        {device.ip} • {device.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Manual Import/Export */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manual Data Sharing</Text>
            <Text style={styles.sectionDescription}>
              Export or import sync data manually for offline sharing
            </Text>
            <View style={styles.manualButtons}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExportData}
                disabled={isLoading}
              >
                <Upload size={20} color={TheatreColors.accent} />
                <Text style={styles.exportButtonText}>Export Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.importButton}
                onPress={() => setShowImportModal(true)}
              >
                <Download size={20} color={TheatreColors.success} />
                <Text style={styles.importButtonText}>Import Data</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How Sync Works</Text>
            <Text style={styles.infoText}>
              • Products and categories are automatically merged across devices{'\n'}
              • Newer versions of products take priority during sync{'\n'}
              • Categories are combined from all devices{'\n'}
              • Manual export/import works without network connection{'\n'}
              • Auto sync requires devices to be on the same network
            </Text>
          </View>
        </ScrollView>

        {/* Import Modal */}
        <Modal
          visible={showImportModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowImportModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Sync Data</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={24} color={TheatreColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Paste the sync data from another device below:
              </Text>
              <TextInput
                style={styles.importInput}
                value={importData}
                onChangeText={setImportData}
                placeholder="Paste sync data here..."
                placeholderTextColor={TheatreColors.textSecondary}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.importConfirmButton, isLoading && styles.importConfirmButtonDisabled]}
                onPress={handleImportData}
                disabled={isLoading || !importData.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={TheatreColors.background} />
                ) : (
                  <Download size={20} color={TheatreColors.background} />
                )}
                <Text style={styles.importConfirmButtonText}>
                  {isLoading ? 'Importing...' : 'Import Data'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Export Modal */}
        <Modal
          visible={showExportModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowExportModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Sync Data</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={24} color={TheatreColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Copy this data and share it with other devices:
              </Text>
              <ScrollView style={styles.exportDataContainer}>
                <Text style={styles.exportDataText} selectable>
                  {exportData}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => copyToClipboard(exportData)}
              >
                <Share2 size={20} color={TheatreColors.background} />
                <Text style={styles.shareButtonText}>Share Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    color: TheatreColors.text,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noDevicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.textSecondary,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  devicesList: {
    gap: 12,
  },
  deviceItem: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  deviceInfo: {
    gap: 4,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
  },
  deviceDetails: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  manualButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.background,
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  importButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.success,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  infoSection: {
    backgroundColor: TheatreColors.surfaceLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  importInput: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    padding: 16,
    fontSize: 14,
    color: TheatreColors.text,
    minHeight: 200,
    marginBottom: 20,
  },
  importConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  importConfirmButtonDisabled: {
    opacity: 0.6,
  },
  importConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  exportDataContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
    marginBottom: 20,
  },
  exportDataText: {
    fontSize: 12,
    color: TheatreColors.text,
    fontFamily: 'monospace',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
});