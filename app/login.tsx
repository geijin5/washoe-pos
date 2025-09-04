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
import { User, Lock } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { TheatreColors } from '@/constants/theatre-colors';
import { TabletUtils } from '@/constants/tablet-utils';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login({ username: username.trim(), password });
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
            <View style={styles.inputContainer}>
              <User size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={TheatreColors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                testID="username-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={TheatreColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={TheatreColors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="password-input"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              testID="login-button"
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
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
  subtitle: {
    fontSize: TabletUtils.getResponsiveFontSize(16, 20),
    color: TheatreColors.textSecondary,
  },
  form: {
    marginBottom: TabletUtils.getResponsivePadding(48, 64),
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
});