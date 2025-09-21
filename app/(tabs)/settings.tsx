import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { usePOS } from '@/hooks/pos-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { Settings, CreditCard, Percent, Save, Users, Tag, Share as ShareIcon, Download, Info } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { RoleGuard } from '@/components/RoleGuard';
import { UserManagement } from '@/components/UserManagement';
import { CategoryManagement } from '@/components/CategoryManagement';

import { TabletUtils } from '@/constants/tablet-utils';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { settings, updateSettings } = usePOS();
  const { user } = useAuth();
  const [creditCardFeePercent, setCreditCardFeePercent] = useState(settings.creditCardFeePercent.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);


  const [deviceIP, setDeviceIP] = useState<string>('Loading...');
  const [deviceId, setDeviceId] = useState<string>('');
  const { exportDeviceConfiguration } = useAuth();
  
  // Load device information on component mount
  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const ip = await TabletUtils.getDeviceIPAddress();
        const id = TabletUtils.getDeviceId();
        setDeviceIP(ip);
        setDeviceId(id);
      } catch (error) {
        console.error('Error loading device info:', error);
        setDeviceIP('Unknown');
        setDeviceId('Unknown');
      }
    };
    
    loadDeviceInfo();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const newCreditCardFee = parseFloat(creditCardFeePercent);

      if (isNaN(newCreditCardFee) || newCreditCardFee < 0 || newCreditCardFee > 10) {
        Alert.alert('Invalid Input', 'Credit card fee must be between 0% and 10%');
        return;
      }

      await updateSettings({
        creditCardFeePercent: newCreditCardFee,
      });

      Alert.alert('Success', 'Settings updated successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportConfiguration = async () => {
    try {
      const configData = exportDeviceConfiguration();
      
      if (Platform.OS === 'web') {
        // For web, copy to clipboard
        await Clipboard.setStringAsync(configData);
        Alert.alert(
          'Configuration Exported',
          'Device configuration has been copied to clipboard. You can now paste it on another device during setup.',
          [{ text: 'OK' }]
        );
      } else {
        // For mobile, use share functionality
        try {
          await Share.share({
            message: configData,
            title: 'Washoe POS Device Configuration',
          });
        } catch {
          // Fallback to clipboard if share fails
          await Clipboard.setStringAsync(configData);
          Alert.alert(
            'Configuration Exported',
            'Device configuration has been copied to clipboard. You can now paste it on another device during setup.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error exporting configuration:', error);
      Alert.alert('Error', 'Failed to export device configuration');
    }
  };

  return (
    <RoleGuard requiredRole="admin">
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Settings size={32} color={TheatreColors.accent} />
            <Text style={styles.title}>System Settings</Text>
            <Text style={styles.subtitle}>Configure payment processing settings</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={24} color={TheatreColors.accent} />
              <Text style={styles.sectionTitle}>Credit Card Processing</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Set the percentage fee charged for credit card transactions
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Credit Card Fee (%)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={creditCardFeePercent}
                  onChangeText={setCreditCardFeePercent}
                  placeholder="2.9"
                  keyboardType="decimal-pad"
                  placeholderTextColor={TheatreColors.textSecondary}
                />
                <Percent size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
              </View>
              <Text style={styles.inputHelp}>
                Current: {settings.creditCardFeePercent}% • Recommended: 2.9%
              </Text>
            </View>
          </View>



          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.previewDescription}>
              Example calculation for a $10.00 purchase:
            </Text>
            
            <View style={styles.previewCalculation}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Subtotal:</Text>
                <Text style={styles.previewValue}>$10.00</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Credit Card Fee ({creditCardFeePercent}%):</Text>
                <Text style={styles.previewValue}>${(10 * (parseFloat(creditCardFeePercent) || 0) / 100).toFixed(2)}</Text>
              </View>
              <View style={[styles.previewRow, styles.previewTotal]}>
                <Text style={styles.previewTotalLabel}>Total (Card):</Text>
                <Text style={styles.previewTotalValue}>
                  ${(10 + (10 * (parseFloat(creditCardFeePercent) || 0) / 100)).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSaveSettings}
            disabled={isLoading}
          >
            <Save size={20} color={TheatreColors.background} />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>

          {/* Category Management Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tag size={24} color={TheatreColors.accent} />
              <Text style={styles.sectionTitle}>Category Management</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Add and remove product categories to organize your inventory
            </Text>
            
            <TouchableOpacity
              style={styles.managementButton}
              onPress={() => setShowCategoryManagement(true)}
            >
              <Tag size={20} color={TheatreColors.background} />
              <Text style={styles.managementButtonText}>Manage Categories</Text>
            </TouchableOpacity>
          </View>



          {/* Device Configuration Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShareIcon size={24} color={TheatreColors.accent} />
              <Text style={styles.sectionTitle}>Device Configuration</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Export device configuration to set up additional POS terminals with the same user accounts and settings
            </Text>
            
            <TouchableOpacity
              style={styles.managementButton}
              onPress={handleExportConfiguration}
            >
              <Download size={20} color={TheatreColors.background} />
              <Text style={styles.managementButtonText}>Export Configuration</Text>
            </TouchableOpacity>
          </View>


          
          {/* System Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={24} color={TheatreColors.accent} />
              <Text style={styles.sectionTitle}>System Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Current device information and network configuration
            </Text>
            
            <View style={styles.systemInfoContainer}>
              <View style={styles.systemInfoRow}>
                <Text style={styles.systemInfoLabel}>Device IP:</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Clipboard.setStringAsync(deviceIP);
                    Alert.alert('Copied', 'IP address copied to clipboard');
                  }}
                  style={styles.copyableValue}
                >
                  <Text style={styles.systemInfoValue}>{deviceIP}</Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.systemInfoRow}>
                <Text style={styles.systemInfoLabel}>Device ID:</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Clipboard.setStringAsync(deviceId);
                    Alert.alert('Copied', 'Device ID copied to clipboard');
                  }}
                  style={styles.copyableValue}
                >
                  <Text style={styles.systemInfoValue}>{deviceId.slice(-12)}</Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.systemInfoRow}>
                <Text style={styles.systemInfoLabel}>Platform:</Text>
                <Text style={styles.systemInfoValue}>{Platform.OS === 'web' ? 'Web Browser' : 'Mobile App'}</Text>
              </View>
              <View style={styles.systemInfoRow}>
                <Text style={styles.systemInfoLabel}>Version:</Text>
                <Text style={styles.systemInfoValue}>1.0.0</Text>
              </View>
            </View>
          </View>



          {/* User Management Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={24} color={TheatreColors.accent} />
              <Text style={styles.sectionTitle}>User Management</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Create and manage manager and usher accounts for your theatre staff
            </Text>
            
            <TouchableOpacity
              style={styles.managementButton}
              onPress={() => setShowUserManagement(true)}
            >
              <Users size={20} color={TheatreColors.background} />
              <Text style={styles.managementButtonText}>Manage Users</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Settings updated by: {user?.name} ({user?.role})
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <CategoryManagement
        visible={showCategoryManagement}
        onClose={() => setShowCategoryManagement(false)}
      />
      

      
      <UserManagement
        visible={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TheatreColors.surfaceLight,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TheatreColors.text,
    paddingVertical: 14,
  },
  inputIcon: {
    marginLeft: 8,
  },
  inputHelp: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
    marginTop: 6,
  },
  previewSection: {
    backgroundColor: TheatreColors.surfaceLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 16,
  },
  previewCalculation: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  previewValue: {
    fontSize: 14,
    color: TheatreColors.text,
    fontWeight: '500',
  },
  previewTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  previewTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.accent,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surface,
  },
  footerText: {
    fontSize: 12,
    color: TheatreColors.textSecondary,
  },
  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  managementButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.background,
  },
  systemInfoContainer: {
    backgroundColor: TheatreColors.background,
    borderRadius: 12,
    padding: 16,
  },
  systemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  systemInfoLabel: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    fontWeight: '500',
  },
  systemInfoValue: {
    fontSize: 14,
    color: TheatreColors.text,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyableValue: {
    alignItems: 'flex-end',
    flex: 1,
  },
  copyHint: {
    fontSize: 10,
    color: TheatreColors.textSecondary,
    opacity: 0.7,
    marginTop: 2,
  },
});