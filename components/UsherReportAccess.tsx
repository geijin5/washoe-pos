import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Eye, EyeOff, Shield, User } from 'lucide-react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { useAuth } from '@/hooks/auth-store';
import { User as UserType } from '@/types/auth';

interface UsherReportAccessProps {
  visible: boolean;
  onClose: () => void;
  onAccessGranted: (user: UserType) => void;
}

export function UsherReportAccess({ visible, onClose, onAccessGranted }: UsherReportAccessProps) {
  const { users, passwords } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Filter users to only show admin and manager accounts
  const adminManagerUsers = users.filter(user => 
    user.role === 'admin' || user.role === 'manager'
  );

  const handleUserSelect = useCallback((user: UserType) => {
    setSelectedUser(user);
    setPassword('');
  }, []);

  const handlePasswordSubmit = useCallback(async () => {
    if (!selectedUser || !password.trim()) {
      Alert.alert('Error', 'Please select a user and enter a password');
      return;
    }

    setIsVerifying(true);

    try {
      // Simulate a brief verification delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if the password matches
      const storedPassword = passwords[selectedUser.username];
      if (storedPassword === password) {
        // Grant access with the selected user's credentials
        onAccessGranted(selectedUser);
        onClose();
      } else {
        Alert.alert('Access Denied', 'Incorrect password for the selected account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify credentials');
    } finally {
      setIsVerifying(false);
    }
  }, [selectedUser, password, passwords, onAccessGranted, onClose]);

  const handleClose = useCallback(() => {
    setSelectedUser(null);
    setPassword('');
    setShowPassword(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Shield size={24} color={TheatreColors.primary} />
            <Text style={styles.title}>Report Access</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={TheatreColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            Select an admin or manager account to access the nightly report
          </Text>

          <View style={styles.userList}>
            <Text style={styles.sectionTitle}>Available Accounts</Text>
            {adminManagerUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userCard,
                  selectedUser?.id === user.id && styles.selectedUserCard
                ]}
                onPress={() => handleUserSelect(user)}
              >
                <View style={styles.userInfo}>
                  <View style={styles.userIcon}>
                    <User size={20} color={TheatreColors.primary} />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userRole}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </View>
                </View>
                {selectedUser?.id === user.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {selectedUser && (
            <View style={styles.passwordSection}>
              <Text style={styles.passwordLabel}>
                Enter password for {selectedUser.name}
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={TheatreColors.textSecondary} />
                  ) : (
                    <Eye size={20} color={TheatreColors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedUser || !password.trim() || isVerifying) && styles.submitButtonDisabled
              ]}
              onPress={handlePasswordSubmit}
              disabled={!selectedUser || !password.trim() || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color={TheatreColors.background} />
              ) : (
                <Text style={styles.submitButtonText}>Access Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: TheatreColors.text,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
    lineHeight: 22,
  },
  userList: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserCard: {
    borderColor: TheatreColors.primary,
    backgroundColor: TheatreColors.surfaceLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TheatreColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  selectedIndicator: {
    backgroundColor: TheatreColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  selectedText: {
    color: TheatreColors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  passwordSection: {
    marginBottom: 24,
  },
  passwordLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TheatreColors.text,
    marginBottom: 12,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: TheatreColors.text,
  },
  eyeButton: {
    padding: 12,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: TheatreColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: TheatreColors.surfaceLight,
  },
  submitButtonText: {
    color: TheatreColors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});