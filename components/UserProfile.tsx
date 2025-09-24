import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { User, LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { TheatreColors } from '@/constants/theatre-colors';

interface UserProfileProps {
  showLogout?: boolean;
  compact?: boolean;
}

export function UserProfile({ showLogout = true, compact = false }: UserProfileProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#FF6B6B';
      case 'manager':
        return '#4ECDC4';
      case 'usher':
        return '#45B7D1';
      default:
        return TheatreColors.textSecondary;
    }
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin':
        return <Shield size={16} color={getRoleColor(user.role)} />;
      case 'manager':
        return <User size={16} color={getRoleColor(user.role)} />;
      case 'usher':
        return <User size={16} color={getRoleColor(user.role)} />;
      default:
        return <User size={16} color={TheatreColors.textSecondary} />;
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{user.name}</Text>
          <View style={styles.compactRole}>
            {getRoleIcon()}
            <Text style={[styles.compactRoleText, { color: getRoleColor(user.role) }]}>
              {user.role.toUpperCase()}
            </Text>
          </View>
        </View>
        {showLogout && (
          <TouchableOpacity
            style={styles.compactLogoutButton}
            onPress={handleLogout}
            testID="logout-button"
          >
            <LogOut size={20} color={TheatreColors.textSecondary} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <User size={32} color={TheatreColors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.roleContainer}>
          {getRoleIcon()}
          <Text style={[styles.role, { color: getRoleColor(user.role) }]}>
            {user.role.toUpperCase()}
          </Text>
        </View>
      </View>
      {showLogout && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="logout-button"
        >
          <LogOut size={24} color={TheatreColors.textSecondary} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TheatreColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  role: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 6,
  },
  logoutButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: TheatreColors.text,
    marginBottom: 2,
  },
  compactRole: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRoleText: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  compactLogoutButton: {
    padding: 8,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: TheatreColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});