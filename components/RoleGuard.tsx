import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';
import { UserRole, Permission } from '@/types/auth';
import { TheatreColors } from '@/constants/theatre-colors';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  showFallback = true,
}: RoleGuardProps) {
  const { canAccess, hasPermission, user } = useAuth();

  const hasAccess = () => {
    if (requiredRole && !canAccess(requiredRole)) {
      return false;
    }
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return false;
    }
    return true;
  };

  if (!hasAccess()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Shield size={48} color={TheatreColors.textSecondary} />
        </View>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.message}>
          This feature requires {requiredRole ? 
            `${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole} access` :
            'additional permissions'
          }.
        </Text>
        <Text style={styles.currentRole}>
          Current role: {user?.role || 'None'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

interface PermissionButtonProps {
  children: React.ReactNode;
  requiredPermission: Permission;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}

export function PermissionButton({
  children,
  requiredPermission,
  onPress,
  style,
  disabled = false,
}: PermissionButtonProps) {
  const { hasPermission } = useAuth();
  const canPerformAction = hasPermission(requiredPermission);

  if (!canPerformAction) {
    return (
      <View style={[style, styles.disabledButton]}>
        <AlertCircle size={16} color={TheatreColors.textSecondary} />
        <Text style={styles.disabledButtonText}>No Permission</Text>
      </View>
    );
  }

  return (
    <>{React.cloneElement(children as React.ReactElement, {
      onPress,
      disabled,
      style,
    } as any)}</>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: TheatreColors.background,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: TheatreColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  currentRole: {
    fontSize: 14,
    color: TheatreColors.accent,
    fontWeight: '500' as const,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: TheatreColors.surfaceLight,
    borderRadius: 8,
    opacity: 0.6,
  },
  disabledButtonText: {
    marginLeft: 8,
    color: TheatreColors.textSecondary,
    fontSize: 14,
  },
});