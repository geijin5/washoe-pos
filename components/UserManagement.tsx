import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { Users, Plus, Trash2, Key, UserCheck, Shield, Eye } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { UserRole, CreateUserData } from '@/types/auth';

interface UserManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function UserManagement({ visible, onClose }: UserManagementProps) {
  const { users, createUser, deleteUser, updateUserPassword } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create user form state
  const [newUser, setNewUser] = useState<CreateUserData>({
    username: '',
    password: '',
    name: '',
    role: 'usher',
  });
  
  // Password update form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.name.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newUser.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const success = await createUser(newUser);
      if (success) {
        Alert.alert('Success', `User ${newUser.name} created successfully!`);
        setNewUser({ username: '', password: '', name: '', role: 'usher' });
        setShowCreateForm(false);
      } else {
        Alert.alert('Error', 'Username already exists. Please choose a different username.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await deleteUser(userId);
              if (success) {
                Alert.alert('Success', `User ${userName} deleted successfully!`);
              } else {
                Alert.alert('Error', 'Cannot delete this user.');
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePassword = async (username: string) => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateUserPassword(username, newPassword);
      if (success) {
        Alert.alert('Success', 'Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(null);
      } else {
        Alert.alert('Error', 'Failed to update password.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={20} color={TheatreColors.error} />;
      case 'manager':
        return <UserCheck size={20} color={TheatreColors.warning} />;
      case 'usher':
        return <Eye size={20} color={TheatreColors.success} />;
      default:
        return <Users size={20} color={TheatreColors.textSecondary} />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return TheatreColors.error;
      case 'manager':
        return TheatreColors.warning;
      case 'usher':
        return TheatreColors.success;
      default:
        return TheatreColors.textSecondary;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Users size={28} color={TheatreColors.accent} />
            <Text style={styles.title}>User Management</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Create User Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
            disabled={isLoading}
          >
            <Plus size={20} color={TheatreColors.background} />
            <Text style={styles.createButtonText}>Create New User</Text>
          </TouchableOpacity>

          {/* Users List */}
          <View style={styles.usersList}>
            <Text style={styles.sectionTitle}>Current Users ({users.length})</Text>
            {users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <View style={styles.userNameRow}>
                      {getRoleIcon(user.role)}
                      <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                        {user.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.userUsername}>@{user.username}</Text>
                </View>
                
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowPasswordForm(user.username)}
                    disabled={isLoading}
                  >
                    <Key size={16} color={TheatreColors.accent} />
                  </TouchableOpacity>
                  
                  {user.id !== '1' && ( // Don't allow deleting the default admin
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteUser(user.id, user.name)}
                      disabled={isLoading}
                    >
                      <Trash2 size={16} color={TheatreColors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Create User Modal */}
        <Modal visible={showCreateForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New User</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.name}
                  onChangeText={(text) => setNewUser(prev => ({ ...prev, name: text }))}
                  placeholder="Enter full name"
                  placeholderTextColor={TheatreColors.textSecondary}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.username}
                  onChangeText={(text) => setNewUser(prev => ({ ...prev, username: text.toLowerCase() }))}
                  placeholder="Enter username"
                  placeholderTextColor={TheatreColors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.password}
                  onChangeText={(text) => setNewUser(prev => ({ ...prev, password: text }))}
                  placeholder="Enter password (min 6 characters)"
                  placeholderTextColor={TheatreColors.textSecondary}
                  secureTextEntry
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleSelector}>
                  {(['manager', 'usher'] as UserRole[]).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        newUser.role === role && styles.roleOptionSelected,
                      ]}
                      onPress={() => setNewUser(prev => ({ ...prev, role }))}
                    >
                      {getRoleIcon(role)}
                      <Text
                        style={[
                          styles.roleOptionText,
                          newUser.role === role && styles.roleOptionTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewUser({ username: '', password: '', name: '', role: 'usher' });
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                  onPress={handleCreateUser}
                  disabled={isLoading}
                >
                  <Text style={styles.confirmButtonText}>
                    {isLoading ? 'Creating...' : 'Create User'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Password Update Modal */}
        <Modal visible={!!showPasswordForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <Text style={styles.modalSubtitle}>@{showPasswordForm}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={TheatreColors.textSecondary}
                  secureTextEntry
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={TheatreColors.textSecondary}
                  secureTextEntry
                />
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPasswordForm(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                  onPress={() => showPasswordForm && handleUpdatePassword(showPasswordForm)}
                  disabled={isLoading}
                >
                  <Text style={styles.confirmButtonText}>
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: TheatreColors.accent,
    borderRadius: 8,
  },
  closeButtonText: {
    color: TheatreColors.background,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TheatreColors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  createButtonText: {
    color: TheatreColors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  usersList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  userUsername: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surfaceLight,
  },
  deleteButton: {
    backgroundColor: TheatreColors.error + '20',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: TheatreColors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: TheatreColors.text,
    borderWidth: 1,
    borderColor: TheatreColors.surfaceLight,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  roleOptionSelected: {
    borderColor: TheatreColors.accent,
    backgroundColor: TheatreColors.accent + '10',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.textSecondary,
  },
  roleOptionTextSelected: {
    color: TheatreColors.accent,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: TheatreColors.textSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: TheatreColors.accent,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: TheatreColors.background,
    fontWeight: 'bold',
  },
});