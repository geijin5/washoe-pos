import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Lock, UserPlus, Download, Clipboard as ClipboardIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';
import * as Clipboard from 'expo-clipboard';

type SetupMode = 'choose' | 'create-admin' | 'import-config';

export default function SetupScreen() {
  const [mode, setMode] = useState<SetupMode>('choose');
  const [isLoading, setIsLoading] = useState(false);
  const { completeDeviceSetup, importDeviceConfiguration } = useAuth();
  const router = useRouter();

  // Create Admin form state
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  // Import config state
  const [configData, setConfigData] = useState('');

  const handleCreateAdmin = async () => {
    if (!adminForm.username.trim() || !adminForm.password.trim() || !adminForm.name.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (adminForm.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const success = await completeDeviceSetup({
        username: adminForm.username.trim(),
        password: adminForm.password,
        name: adminForm.name.trim(),
        role: 'admin',
      });

      if (success) {
        Alert.alert(
          'Setup Complete',
          'Device has been set up successfully. You can now log in with your admin account.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert('Error', 'Failed to complete device setup');
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'An error occurred during setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportConfig = async () => {
    if (!configData.trim()) {
      Alert.alert('Error', 'Please paste the configuration data');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting configuration import...');
      const success = await importDeviceConfiguration(configData.trim());
      
      if (success) {
        Alert.alert(
          'Import Complete',
          'Device configuration has been imported successfully. You can now log in with existing accounts.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid configuration data';
      
      // Show a more user-friendly error dialog
      Alert.alert(
        'Configuration Import Failed',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Help',
            onPress: () => {
              Alert.alert(
                'How to Export Device Configuration',
                'To get the correct configuration data:\n\n' +
                '1. On the source device, go to Settings\n' +
                '2. Scroll to "Device Configuration"\n' +
                '3. Tap "Export Configuration"\n' +
                '4. Copy the exported data\n' +
                '5. Paste it here\n\n' +
                'Note: Do NOT use "Settings Sync" data - that\'s for products only, not user accounts.'
              );
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setConfigData(clipboardContent);
      } else {
        Alert.alert('Info', 'Clipboard is empty');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      Alert.alert('Error', 'Failed to read from clipboard');
    }
  };

  const renderChooseMode = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.modeTitle}>Device Setup</Text>
      <Text style={styles.modeSubtitle}>
        This device needs to be set up before you can use the POS system.
      </Text>

      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => setMode('create-admin')}
        testID="create-admin-button"
      >
        <UserPlus size={24} color={TheatreColors.accent} />
        <View style={styles.modeButtonContent}>
          <Text style={styles.modeButtonTitle}>Create Admin Account</Text>
          <Text style={styles.modeButtonSubtitle}>
            Set up this device as the primary device with a new admin account
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => setMode('import-config')}
        testID="import-config-button"
      >
        <Download size={24} color={TheatreColors.accent} />
        <View style={styles.modeButtonContent}>
          <Text style={styles.modeButtonTitle}>Import Configuration</Text>
          <Text style={styles.modeButtonSubtitle}>
            Use configuration from another device to sync accounts and settings
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCreateAdmin = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('choose')}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>Create Admin Account</Text>
      <Text style={styles.formSubtitle}>
        Create the primary administrator account for this device
      </Text>

      <View style={styles.inputContainer}>
        <User size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Admin Username"
          placeholderTextColor={TheatreColors.textSecondary}
          value={adminForm.username}
          onChangeText={(text) => setAdminForm(prev => ({ ...prev, username: text }))}
          autoCapitalize="none"
          autoCorrect={false}
          testID="admin-username-input"
        />
      </View>

      <View style={styles.inputContainer}>
        <User size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={TheatreColors.textSecondary}
          value={adminForm.name}
          onChangeText={(text) => setAdminForm(prev => ({ ...prev, name: text }))}
          testID="admin-name-input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Lock size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={TheatreColors.textSecondary}
          value={adminForm.password}
          onChangeText={(text) => setAdminForm(prev => ({ ...prev, password: text }))}
          secureTextEntry
          testID="admin-password-input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Lock size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={TheatreColors.textSecondary}
          value={adminForm.confirmPassword}
          onChangeText={(text) => setAdminForm(prev => ({ ...prev, confirmPassword: text }))}
          secureTextEntry
          testID="admin-confirm-password-input"
        />
      </View>

      <TouchableOpacity
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
        onPress={handleCreateAdmin}
        disabled={isLoading}
        testID="complete-setup-button"
      >
        <Text style={styles.actionButtonText}>
          {isLoading ? 'Setting Up...' : 'Complete Setup'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderImportConfig = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('choose')}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>Import Configuration</Text>
      <Text style={styles.formSubtitle}>
        Paste the device configuration data from another device. This should contain user accounts and passwords, not POS settings.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What to Import</Text>
        <Text style={styles.infoText}>
          • Use &quot;Export Configuration&quot; from Settings → Device Configuration on another device{"\n"}
          • This contains user accounts and passwords{"\n"}
          • Do NOT use &quot;Settings Sync&quot; data (that&apos;s for products/categories only){"\n"}
          • Make sure to copy the complete JSON data without modifications
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>
          Device Configuration is different from Settings Sync:{"\n"}
          • Device Configuration = User accounts &amp; passwords{"\n"}
          • Settings Sync = Products &amp; categories only
        </Text>
      </View>

      <View style={styles.configInputContainer}>
        <TextInput
          style={styles.configInput}
          placeholder="Paste configuration data here..."
          placeholderTextColor={TheatreColors.textSecondary}
          value={configData}
          onChangeText={setConfigData}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          testID="config-input"
        />
      </View>

      <TouchableOpacity
        style={styles.pasteButton}
        onPress={handlePasteFromClipboard}
        testID="paste-button"
      >
        <ClipboardIcon size={20} color={TheatreColors.accent} />
        <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
        onPress={handleImportConfig}
        disabled={isLoading}
        testID="import-button"
      >
        <Text style={styles.actionButtonText}>
          {isLoading ? 'Importing...' : 'Import Configuration'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={{ uri: 'https://r2-pub.rork.com/attachments/0hq0a7nxkz1gd8vukuxcc' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {mode === 'choose' && renderChooseMode()}
          {mode === 'create-admin' && renderCreateAdmin()}
          {mode === 'import-config' && renderImportConfig()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: TabletUtils.getResponsivePadding(24, 48),
    maxWidth: TabletUtils.isTablet() ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: TabletUtils.getResponsivePadding(48, 64),
  },
  logoContainer: {
    width: TabletUtils.getResponsivePadding(200, 280),
    height: TabletUtils.getResponsivePadding(120, 168),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TabletUtils.getResponsivePadding(24, 32),
  },
  logo: {
    width: TabletUtils.getResponsivePadding(200, 280),
    height: TabletUtils.getResponsivePadding(120, 168),
  },
  title: {
    fontSize: TabletUtils.getResponsiveFontSize(32, 42),
    fontWeight: 'bold' as const,
    color: TheatreColors.text,
    marginBottom: 8,
  },
  modeContainer: {
    alignItems: 'center',
  },
  modeTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(24, 30),
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modeSubtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginBottom: TabletUtils.getResponsivePadding(32, 40),
    lineHeight: 24,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: TabletUtils.getResponsivePadding(20, 24),
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modeButtonContent: {
    flex: 1,
    marginLeft: 16,
  },
  modeButtonTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(18, 20),
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: 4,
  },
  modeButtonSubtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: TheatreColors.textSecondary,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: TabletUtils.getResponsivePadding(24, 32),
  },
  backButtonText: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    color: TheatreColors.accent,
    fontWeight: '500' as const,
  },
  formTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(24, 30),
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginBottom: TabletUtils.getResponsivePadding(32, 40),
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
    paddingHorizontal: TabletUtils.getResponsivePadding(16, 20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: TabletUtils.getResponsivePadding(56, 68),
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    color: TheatreColors.text,
  },
  configInputContainer: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
    padding: TabletUtils.getResponsivePadding(16, 20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  configInput: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: TheatreColors.text,
    minHeight: TabletUtils.getResponsivePadding(120, 150),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    padding: TabletUtils.getResponsivePadding(12, 16),
    marginBottom: TabletUtils.getResponsivePadding(24, 32),
    borderWidth: 1,
    borderColor: TheatreColors.accent,
  },
  pasteButtonText: {
    color: TheatreColors.accent,
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: TheatreColors.accent,
    borderRadius: 12,
    height: TabletUtils.getResponsivePadding(56, 68),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: TheatreColors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: TabletUtils.getResponsiveFontSize(18, 20),
    fontWeight: '600' as const,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: TabletUtils.getResponsivePadding(16, 20),
    marginBottom: TabletUtils.getResponsivePadding(20, 24),
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: '600' as const,
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: '#1976D2',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: TabletUtils.getResponsivePadding(16, 20),
    marginBottom: TabletUtils.getResponsivePadding(20, 24),
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 18),
    fontWeight: '600' as const,
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: '#856404',
    lineHeight: 20,
  },
});