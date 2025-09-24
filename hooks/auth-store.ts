import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { User, UserRole, AuthState, LoginCredentials, ROLE_PERMISSIONS, Permission, CreateUserData } from '@/types/auth';

const AUTH_KEY = 'theatre_auth';
const USERS_KEY = 'theatre_users';
const PASSWORDS_KEY = 'theatre_passwords';
const DEVICE_SETUP_KEY = 'theatre_device_setup';
const DAILY_LOGINS_KEY = 'theatre_daily_logins';
const TRAINING_MODE_KEY = 'theatre_training_mode';

// No default users - must be created during setup

// No default passwords - must be created during setup

export const [AuthProvider, useAuth] = createContextHook(() => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [isDeviceSetup, setIsDeviceSetup] = useState<boolean>(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState<boolean>(true);
  const [dailyLogins, setDailyLogins] = useState<Record<string, { userId: string; userName: string; loginTime: string }[]>>({});
  const [isTrainingMode, setIsTrainingMode] = useState<boolean>(false);

  // Load auth state, users, and device setup from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check device setup first
        const deviceSetup = await AsyncStorage.getItem(DEVICE_SETUP_KEY);
        const setupComplete = deviceSetup === 'true';
        setIsDeviceSetup(setupComplete);

        if (setupComplete) {
          // Load auth state
          const storedAuth = await AsyncStorage.getItem(AUTH_KEY);
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            setAuthState({
              user: parsedAuth.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }

          // Load users
          const storedUsers = await AsyncStorage.getItem(USERS_KEY);
          if (storedUsers) {
            setUsers(JSON.parse(storedUsers));
          }

          // Load passwords
          const storedPasswords = await AsyncStorage.getItem(PASSWORDS_KEY);
          if (storedPasswords) {
            setPasswords(JSON.parse(storedPasswords));
          }

          // Load daily logins
          const storedDailyLogins = await AsyncStorage.getItem(DAILY_LOGINS_KEY);
          if (storedDailyLogins) {
            setDailyLogins(JSON.parse(storedDailyLogins));
          }

          // Load training mode
          const storedTrainingMode = await AsyncStorage.getItem(TRAINING_MODE_KEY);
          if (storedTrainingMode) {
            setIsTrainingMode(JSON.parse(storedTrainingMode));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      } finally {
        setIsCheckingSetup(false);
      }
    };

    loadData();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const user = users.find(u => u.username === credentials.username);
      const isValidPassword = passwords[credentials.username] === credentials.password;

      if (user && isValidPassword) {
        const newAuthState = {
          user,
          isAuthenticated: true,
          isLoading: false,
        };

        // Track daily login
        const today = new Date().toISOString().split('T')[0];
        const loginTime = new Date().toISOString();
        const updatedDailyLogins = { ...dailyLogins };
        
        if (!updatedDailyLogins[today]) {
          updatedDailyLogins[today] = [];
        }
        
        // Check if user already logged in today
        const alreadyLoggedInToday = updatedDailyLogins[today].some(login => login.userId === user.id);
        if (!alreadyLoggedInToday) {
          updatedDailyLogins[today].push({
            userId: user.id,
            userName: user.name,
            loginTime
          });
          
          await AsyncStorage.setItem(DAILY_LOGINS_KEY, JSON.stringify(updatedDailyLogins));
          setDailyLogins(updatedDailyLogins);
        }

        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
        setAuthState(newAuthState);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [users, passwords, dailyLogins]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!authState.user) return false;
    return ROLE_PERMISSIONS[authState.user.role][permission];
  }, [authState.user]);

  const canAccess = useCallback((requiredRole: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(authState.user.role);
  }, [authState.user]);

  const createUser = useCallback(async (userData: CreateUserData): Promise<boolean> => {
    try {
      // Check if username already exists
      if (users.find(u => u.username === userData.username)) {
        return false;
      }

      const newUser: User = {
        id: Date.now().toString(),
        username: userData.username,
        role: userData.role,
        name: userData.name,
      };

      const updatedUsers = [...users, newUser];
      const updatedPasswords = { ...passwords, [userData.username]: userData.password };

      // Save to storage
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(updatedPasswords));

      // Update state
      setUsers(updatedUsers);
      setPasswords(updatedPasswords);

      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }, [users, passwords]);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) return false;

      // Don't allow deleting the current user or the default admin
      if (userToDelete.id === authState.user?.id || userToDelete.id === '1') {
        return false;
      }

      const updatedUsers = users.filter(u => u.id !== userId);
      const updatedPasswords = { ...passwords };
      delete updatedPasswords[userToDelete.username];

      // Save to storage
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(updatedPasswords));

      // Update state
      setUsers(updatedUsers);
      setPasswords(updatedPasswords);

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }, [users, passwords, authState.user]);

  const updateUserPassword = useCallback(async (username: string, newPassword: string): Promise<boolean> => {
    try {
      const updatedPasswords = { ...passwords, [username]: newPassword };
      
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(updatedPasswords));
      setPasswords(updatedPasswords);
      
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }, [passwords]);

  const completeDeviceSetup = useCallback(async (adminData: CreateUserData): Promise<boolean> => {
    try {
      // Create the admin user
      const adminUser: User = {
        id: Date.now().toString(),
        username: adminData.username,
        role: 'admin',
        name: adminData.name,
      };

      const initialUsers = [adminUser];
      const initialPasswords = { [adminData.username]: adminData.password };

      // Save everything to storage
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(initialPasswords));
      await AsyncStorage.setItem(DEVICE_SETUP_KEY, 'true');

      // Update state
      setUsers(initialUsers);
      setPasswords(initialPasswords);
      setIsDeviceSetup(true);

      return true;
    } catch (error) {
      console.error('Error completing device setup:', error);
      return false;
    }
  }, []);

  const importDeviceConfiguration = useCallback(async (configData: string): Promise<boolean> => {
    try {
      console.log('Attempting to parse configuration data...');
      console.log('Raw config data length:', configData.length);
      
      if (!configData || configData.trim().length === 0) {
        throw new Error('Configuration data is empty. Please paste the exported configuration.');
      }
      
      // More aggressive cleaning for copy-paste issues
      let cleanedData = configData
        .trim()
        // Remove all zero-width and invisible characters
        .replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, '')
        // Remove control characters but keep newlines and tabs
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove any leading/trailing whitespace again
        .trim();
      
      // Remove markdown code blocks if present
      if (cleanedData.startsWith('```json')) {
        cleanedData = cleanedData.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      } else if (cleanedData.startsWith('```')) {
        cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      }
      
      // Remove any quotes around the entire JSON if present
      if ((cleanedData.startsWith('"') && cleanedData.endsWith('"')) ||
          (cleanedData.startsWith("'") && cleanedData.endsWith("'"))) {
        cleanedData = cleanedData.slice(1, -1);
      }
      
      console.log('Cleaned data length:', cleanedData.length);
      console.log('First 100 chars:', cleanedData.substring(0, 100));
      console.log('Last 100 chars:', cleanedData.substring(Math.max(0, cleanedData.length - 100)));
      
      if (!cleanedData) {
        throw new Error('Configuration data is empty after cleaning. Please ensure you copied the complete export.');
      }
      
      // Basic JSON structure validation
      if (!cleanedData.startsWith('{') || !cleanedData.endsWith('}')) {
        throw new Error('Invalid format: Configuration data must be valid JSON starting with { and ending with }. Make sure you copied the complete export.');
      }
      
      // Check for obvious truncation indicators
      if (cleanedData.includes('...') || cleanedData.includes('[truncated]') || cleanedData.includes('…')) {
        throw new Error('Configuration data appears to be truncated. Please copy the complete export.');
      }
      
      // Try to parse JSON
      let config;
      try {
        config = JSON.parse(cleanedData);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.log('First 500 characters of data:', cleanedData.substring(0, 500));
        
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
        
        // Try to provide more specific error messages
        if (errorMessage.includes('Unexpected character')) {
          throw new Error(`JSON parsing failed: ${errorMessage}. This usually means the data was not copied completely or contains invalid characters. Please try copying the export again.`);
        } else if (errorMessage.includes('Unexpected end')) {
          throw new Error('JSON parsing failed: The configuration data appears to be incomplete. Please ensure you copied the entire export.');
        } else {
          throw new Error(`Invalid JSON format: ${errorMessage}. Please ensure you copied the complete configuration data without any modifications.`);
        }
      }
      
      console.log('Parsed config keys:', Object.keys(config));
      
      // Check if this is a device configuration (users/passwords) or settings export
      if (config.settings && config.products && !config.users) {
        console.error('Error: This appears to be a POS settings export, not a device configuration');
        throw new Error('Wrong export type: This is a POS settings export (products/categories). You need to use "Export Configuration" from Settings → Device Configuration for user accounts.');
      }
      
      // Validate required fields for device configuration
      if (!config.users) {
        throw new Error('Missing "users" field. This doesn\'t appear to be a device configuration export. Make sure to use "Export Configuration" from Device Configuration section.');
      }
      
      if (!Array.isArray(config.users)) {
        throw new Error('Invalid "users" field format. Expected an array of user objects.');
      }
      
      if (config.users.length === 0) {
        throw new Error('No users found in configuration. The export appears to be empty or corrupted.');
      }
      
      if (!config.passwords) {
        throw new Error('Missing "passwords" field. This doesn\'t appear to be a complete device configuration export.');
      }
      
      if (typeof config.passwords !== 'object' || Array.isArray(config.passwords)) {
        throw new Error('Invalid "passwords" field format. Expected an object with username-password pairs.');
      }
      
      // Validate user objects structure
      for (let i = 0; i < config.users.length; i++) {
        const user = config.users[i];
        if (!user.id || !user.username || !user.role || !user.name) {
          throw new Error(`Invalid user object at index ${i}. Missing required fields: id, username, role, or name.`);
        }
        
        if (!['admin', 'manager', 'staff', 'usher'].includes(user.role)) {
          throw new Error(`Invalid role "${user.role}" for user "${user.username}". Must be admin, manager, staff, or usher.`);
        }
        
        if (!config.passwords[user.username]) {
          throw new Error(`Missing password for user "${user.username}". Configuration appears to be incomplete.`);
        }
      }

      // Validate that there's at least one admin user
      const adminUsers = config.users.filter((user: User) => user.role === 'admin');
      if (adminUsers.length === 0) {
        console.error('No admin user found in configuration');
        throw new Error('Configuration must contain at least one admin user to manage the system.');
      }

      console.log(`Configuration validation passed. Found ${config.users.length} users (${adminUsers.length} admin). Importing...`);
      
      // Save configuration to storage
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(config.users));
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(config.passwords));
      await AsyncStorage.setItem(DEVICE_SETUP_KEY, 'true');

      // Update state
      setUsers(config.users);
      setPasswords(config.passwords);
      setIsDeviceSetup(true);

      console.log('Device configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing device configuration:', error);
      // Re-throw the error so the UI can display the specific error message
      throw error;
    }
  }, []);

  const exportDeviceConfiguration = useCallback((): string => {
    const config = {
      type: 'device_configuration',
      version: '1.0.0',
      users,
      passwords,
      exportedAt: new Date().toISOString(),
      deviceId: `device_${Date.now()}`,
      userCount: users.length,
      adminCount: users.filter(u => u.role === 'admin').length,
    };
    return JSON.stringify(config, null, 2);
  }, [users, passwords]);

  const getDailyLogins = useCallback((date?: Date): { userId: string; userName: string; loginTime: string }[] => {
    const targetDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return dailyLogins[targetDate] || [];
  }, [dailyLogins]);

  const clearOldLoginData = useCallback(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of login data
      
      const filteredLogins: Record<string, { userId: string; userName: string; loginTime: string }[]> = {};
      
      Object.keys(dailyLogins).forEach(dateKey => {
        const loginDate = new Date(dateKey);
        if (loginDate >= cutoffDate) {
          filteredLogins[dateKey] = dailyLogins[dateKey];
        }
      });
      
      if (Object.keys(filteredLogins).length !== Object.keys(dailyLogins).length) {
        await AsyncStorage.setItem(DAILY_LOGINS_KEY, JSON.stringify(filteredLogins));
        setDailyLogins(filteredLogins);
        console.log('Cleared old login data, kept', Object.keys(filteredLogins).length, 'days');
      }
    } catch (error) {
      console.error('Error clearing old login data:', error);
    }
  }, [dailyLogins]);

  // Auto sign-out at 2am for tablets that weren't manually signed out
  const checkAutoSignOut = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if it's 2am (02:00)
      if (currentHour === 2 && authState.isAuthenticated) {
        console.log('Auto sign-out triggered at 2am');
        
        // Check if user was already signed out today
        const today = now.toISOString().split('T')[0];
        const lastAutoSignOut = await AsyncStorage.getItem('last_auto_signout');
        
        if (lastAutoSignOut !== today) {
          console.log('Performing automatic sign-out for user:', authState.user?.name);
          
          // Sign out the user
          await AsyncStorage.removeItem(AUTH_KEY);
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          // Mark that auto sign-out happened today
          await AsyncStorage.setItem('last_auto_signout', today);
          
          // Navigate to login screen
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error during auto sign-out check:', error);
    }
  }, [authState.isAuthenticated, authState.user, router]);

  // Clear old login data periodically and check for auto sign-out
  useEffect(() => {
    clearOldLoginData();
    checkAutoSignOut();
    
    // Clear old data every 24 hours and check for auto sign-out every minute
    const clearDataInterval = setInterval(clearOldLoginData, 24 * 60 * 60 * 1000);
    const autoSignOutInterval = setInterval(checkAutoSignOut, 60 * 1000); // Check every minute
    
    return () => {
      clearInterval(clearDataInterval);
      clearInterval(autoSignOutInterval);
    };
  }, [clearOldLoginData, checkAutoSignOut]);

  const toggleTrainingMode = useCallback(async () => {
    try {
      const newTrainingMode = !isTrainingMode;
      await AsyncStorage.setItem(TRAINING_MODE_KEY, JSON.stringify(newTrainingMode));
      setIsTrainingMode(newTrainingMode);
      
      // If turning off training mode, clear all training data
      if (!newTrainingMode) {
        await AsyncStorage.removeItem('theatre_training_orders');
        console.log('🎓 Training data cleared when training mode was disabled');
      }
      
      console.log('Training mode', newTrainingMode ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Error toggling training mode:', error);
    }
  }, [isTrainingMode]);

  return {
    ...authState,
    users,
    passwords,
    isDeviceSetup,
    isCheckingSetup,
    dailyLogins,
    isTrainingMode,
    login,
    logout,
    hasPermission,
    canAccess,
    createUser,
    deleteUser,
    updateUserPassword,
    completeDeviceSetup,
    importDeviceConfiguration,
    exportDeviceConfiguration,
    getDailyLogins,
    clearOldLoginData,
    toggleTrainingMode,
  };
});