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
import { User, Lock, GraduationCap } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';

export default function LoginScreen() {
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, users, isTrainingMode, toggleTrainingMode } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!selectedUsername.trim() || !password.trim()) {
      Alert.alert('Error', 'Please select a user and enter password');
      return;
    }

    if (password.length < 3) {
      Alert.alert('Error', 'Password must be at least 3 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login({ username: selectedUsername.trim(), password });
      if (success) {
        router.replace('/(tabs)/pos');
      } else {
        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (username: string) => {
    setSelectedUsername(username);
    setPassword(''); // Clear password when switching users
  };



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
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            {/* User Selection */}
            <View style={styles.userSelectionContainer}>
              <Text style={styles.sectionTitle}>Select User</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.userScrollContainer}
              >
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userCard,
                      selectedUsername === user.username && styles.userCardSelected
                    ]}
                    onPress={() => handleUserSelect(user.username)}
                    testID={`user-${user.username}`}
                  >
                    <User 
                      size={24} 
                      color={selectedUsername === user.username ? TheatreColors.background : TheatreColors.accent} 
                    />
                    <Text style={[
                      styles.userCardName,
                      selectedUsername === user.username && styles.userCardNameSelected
                    ]}>
                      {user.name}
                    </Text>
                    <Text style={[
                      styles.userCardUsername,
                      selectedUsername === user.username && styles.userCardUsernameSelected
                    ]}>
                      @{user.username}
                    </Text>
                    <Text style={[
                      styles.userCardRole,
                      selectedUsername === user.username && styles.userCardRoleSelected
                    ]}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Password Input */}
            {selectedUsername && (
              <View style={styles.passwordContainer}>
                <Text style={styles.sectionTitle}>Enter Password for {users.find(u => u.username === selectedUsername)?.name}</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password (minimum 3 characters)"
                    placeholderTextColor={TheatreColors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    testID="password-input"
                    autoFocus
                  />
                </View>
              </View>
            )}

            {selectedUsername && (
              <TouchableOpacity
                style={[styles.loginButton, (isLoading || !password.trim()) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || !password.trim()}
                testID="login-button"
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Training Mode Toggle */}
            <TouchableOpacity
              style={[styles.trainingModeButton, isTrainingMode && styles.trainingModeButtonActive]}
              onPress={toggleTrainingMode}
              testID="training-mode-button"
            >
              <GraduationCap 
                size={20} 
                color={isTrainingMode ? TheatreColors.background : TheatreColors.accent} 
                style={styles.trainingModeIcon}
              />
              <Text style={[styles.trainingModeText, isTrainingMode && styles.trainingModeTextActive]}>
                {isTrainingMode ? 'Training Mode: ON' : 'Training Mode: OFF'}
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Washoe Point of Sale System</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
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
    justifyContent: 'center',
    padding: TabletUtils.getResponsivePadding(24, 48),
    maxWidth: TabletUtils.isTablet() ? 800 : '100%',
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
  subtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 20),
    color: TheatreColors.textSecondary,
  },
  form: {
    marginBottom: TabletUtils.getResponsivePadding(48, 64),
  },
  userSelectionContainer: {
    marginBottom: TabletUtils.getResponsivePadding(32, 40),
  },
  sectionTitle: {
    fontSize: TabletUtils.getResponsiveFontSize(18, 22),
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: TabletUtils.getResponsivePadding(16, 20),
    textAlign: 'center',
  },
  userScrollContainer: {
    paddingHorizontal: TabletUtils.getResponsivePadding(8, 12),
    gap: TabletUtils.getResponsivePadding(12, 16),
  },
  userCard: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 16,
    padding: TabletUtils.getResponsivePadding(16, 20),
    alignItems: 'center',
    minWidth: TabletUtils.getResponsivePadding(120, 150),
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCardSelected: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
    shadowColor: TheatreColors.accent,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  userCardName: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  userCardNameSelected: {
    color: TheatreColors.background,
  },
  userCardUsername: {
    fontSize: TabletUtils.getResponsiveFontSize(12, 14),
    color: TheatreColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  userCardUsernameSelected: {
    color: TheatreColors.background,
    opacity: 0.8,
  },
  userCardRole: {
    fontSize: TabletUtils.getResponsiveFontSize(11, 13),
    color: TheatreColors.accent,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  userCardRoleSelected: {
    color: TheatreColors.background,
    opacity: 0.9,
  },
  passwordContainer: {
    marginBottom: TabletUtils.getResponsivePadding(24, 32),
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
  loginButton: {
    backgroundColor: TheatreColors.accent,
    borderRadius: 12,
    height: TabletUtils.getResponsivePadding(56, 68),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: TabletUtils.getResponsivePadding(8, 12),
    shadowColor: TheatreColors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: TabletUtils.getResponsiveFontSize(18, 20),
    fontWeight: '600' as const,
  },
  demoButton: {
    marginTop: TabletUtils.getResponsivePadding(16, 20),
    padding: TabletUtils.getResponsivePadding(12, 16),
    alignItems: 'center',
  },
  demoButtonText: {
    color: TheatreColors.accent,
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    fontWeight: '500' as const,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    color: TheatreColors.textSecondary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: TabletUtils.getResponsiveFontSize(12, 14),
    color: TheatreColors.textSecondary,
    opacity: 0.7,
  },
  trainingModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: TabletUtils.getResponsivePadding(12, 16),
    marginTop: TabletUtils.getResponsivePadding(16, 20),
    borderWidth: 2,
    borderColor: TheatreColors.accent,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trainingModeButtonActive: {
    backgroundColor: TheatreColors.accent,
    borderColor: TheatreColors.accent,
    shadowColor: TheatreColors.accent,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  trainingModeIcon: {
    marginRight: 8,
  },
  trainingModeText: {
    fontSize: TabletUtils.getResponsiveFontSize(14, 16),
    fontWeight: '600' as const,
    color: TheatreColors.accent,
  },
  trainingModeTextActive: {
    color: TheatreColors.background,
  },
});