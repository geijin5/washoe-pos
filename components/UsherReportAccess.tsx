import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { useAuth } from '@/hooks/auth-store';
import { User, UserRole } from '@/types/auth';
import { Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react-native';

interface UsherReportAccessProps {
  visible: boolean;
  onClose: () => void;
  onAccessGranted: (selectedUser: User) => void;
}

export function UsherReportAccess({ visible, onClose, onAccessGranted }: UsherReportAccessProps) {
  const { users, verifyPassword } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show admin and manager accounts
  const adminManagerUsers = users.filter(user => 
    user.role === 'admin' || user.role === 'manager'
  );

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedUser || !password.trim()) {
      setError('Please select a user and enter a password');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const isValid = await verifyPassword(selectedUser.username, password);
      if (isValid) {
        onAccessGranted(selectedUser);
        onClose();
      } else {
        setError('Invalid password for the selected account');
      }
    } catch (error) {
      setError('Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setPassword('');
    setShowPassword(false);
    setError(null);
    onClose();
  };

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
            <Text style={styles.title}>Access Nightly Reports</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <XCircle size={24} color={TheatreColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Account</Text>
            <Text style={styles.sectionDescription}>
              Choose an admin or manager account to access the nightly reports
            </Text>
            
            <View style={styles.userList}>
              {adminManagerUsers.map((user) => (
                <View key={user.id}>
                  <TouchableOpacity
                    style={[
                      styles.userCard,
                      selectedUser?.id === user.id && styles.userCardSelected
                    ]}
                    onPress={() => handleUserSelect(user)}
                  >
                    <View style={styles.userInfo}>
                      <Text style={[
                        styles.userName,
                        selectedUser?.id === user.id && styles.userNameSelected
                      ]}>
                        {user.name}
                      </Text>
                      <Text style={[
                        styles.userRole,
                        selectedUser?.id === user.id && styles.userRoleSelected
                      ]}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Text>
                    </View>
                    {selectedUser?.id === user.id && (
                      <CheckCircle size={20} color={TheatreColors.primary} />
                    )}
                  </TouchableOpacity>
                  
                  {/* Password input appears directly under selected user */}
                  {selectedUser?.id === user.id && (
                    <View style={styles.passwordSection}>
                      <Text style={styles.passwordLabel}>
                        Enter password for {selectedUser.name}:
                      </Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Enter password"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholderTextColor={TheatreColors.textSecondary}
                          autoFocus={true}
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
                      {error && <Text style={styles.errorText}>{error}</Text>}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.accessButton,
              (!selectedUser || !password.trim() || isVerifying) && styles.accessButtonDisabled
            ]}
            onPress={handlePasswordSubmit}
            disabled={!selectedUser || !password.trim() || isVerifying}
          >
            <Text style={[
              styles.accessButtonText,
              (!selectedUser || !password.trim() || isVerifying) && styles.accessButtonTextDisabled
            ]}>
              {isVerifying ? 'Verifying...' : 'Access Reports'}
            </Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surfaceLight,
    backgroundColor: TheatreColors.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  userList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userCardSelected: {
    borderColor: TheatreColors.primary,
    backgroundColor: TheatreColors.surfaceLight,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 4,
  },
  userNameSelected: {
    color: TheatreColors.primary,
  },
  userRole: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  userRoleSelected: {
    color: TheatreColors.primary,
  },
  passwordSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: TheatreColors.text,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  errorText: {
    color: TheatreColors.error || '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TheatreColors.surfaceLight,
    backgroundColor: TheatreColors.surface,
  },
  accessButton: {
    backgroundColor: TheatreColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  accessButtonDisabled: {
    backgroundColor: TheatreColors.surfaceLight,
  },
  accessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  accessButtonTextDisabled: {
    color: TheatreColors.textSecondary,
  },
});
