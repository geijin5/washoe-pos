export type UserRole = 'admin' | 'manager' | 'staff' | 'usher';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

// Role permissions
export const ROLE_PERMISSIONS = {
  admin: {
    canManageProducts: true,
    canViewOrders: true,
    canProcessSales: true,
    canViewStats: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
  },
  manager: {
    canManageProducts: false,
    canViewOrders: true,
    canProcessSales: true,
    canViewStats: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
  },
  staff: {
    canManageProducts: false,
    canViewOrders: false,
    canProcessSales: true,
    canViewStats: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
  },
  usher: {
    canManageProducts: false,
    canViewOrders: false,
    canProcessSales: true,
    canViewStats: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.admin;