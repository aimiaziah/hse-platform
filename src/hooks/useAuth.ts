// src/hooks/useAuth.ts
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { storage } from '@/utils/storage';

export type UserRole = 'admin' | 'inspector' | 'supervisor' | 'employee';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  signature?: string | null;
  permissions: {
    // Admin permissions
    canManageUsers: boolean;
    canManageForms: boolean;

    // Inspector permissions
    canCreateInspections: boolean;
    canViewInspections: boolean;

    // Supervisor permissions
    canReviewInspections: boolean;
    canApproveInspections: boolean;
    canRejectInspections: boolean;
    canViewPendingInspections: boolean;

    // Employee permissions
    canViewAnalytics: boolean;
  };
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: keyof User['permissions']) => boolean;
  isRole: (role: UserRole) => boolean;
  updateSignature: (signature: string) => Promise<boolean>;
  updateSignatureWithPin: (signature: string, signaturePin: string) => Promise<boolean>;
  verifySignaturePin: (signaturePin: string) => Promise<{ success: boolean; signature?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default users for demo purposes
const defaultUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    pin: '1234',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions - Manage Users & Forms
      canManageUsers: true,
      canManageForms: true,

      // Inspector permissions
      canCreateInspections: true,
      canViewInspections: true,

      // Supervisor permissions
      canReviewInspections: true,
      canApproveInspections: true,
      canRejectInspections: true,
      canViewPendingInspections: true,

      // Employee permissions
      canViewAnalytics: true,
    },
  },
  {
    id: '2',
    name: 'Inspector Demo',
    pin: '9999',
    role: 'inspector',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions
      canManageUsers: false,
      canManageForms: false,

      // Inspector permissions - Conduct Inspections
      canCreateInspections: true,
      canViewInspections: true,

      // Supervisor permissions
      canReviewInspections: false,
      canApproveInspections: false,
      canRejectInspections: false,
      canViewPendingInspections: false,

      // Employee permissions
      canViewAnalytics: true,
    },
  },
  {
    id: '3',
    name: 'Supervisor User',
    pin: '5555',
    role: 'supervisor',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions
      canManageUsers: false,
      canManageForms: false,

      // Inspector permissions
      canCreateInspections: false,
      canViewInspections: true,

      // Supervisor permissions - Approve/Reject Inspections
      canReviewInspections: true,
      canApproveInspections: true,
      canRejectInspections: true,
      canViewPendingInspections: true,

      // Employee permissions
      canViewAnalytics: true,
    },
  },
  {
    id: '4',
    name: 'Employee User',
    pin: '7777',
    role: 'employee',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions
      canManageUsers: false,
      canManageForms: false,

      // Inspector permissions
      canCreateInspections: false,
      canViewInspections: false,

      // Supervisor permissions
      canReviewInspections: false,
      canApproveInspections: false,
      canRejectInspections: false,
      canViewPendingInspections: false,

      // Employee permissions - View Analytics Only
      canViewAnalytics: true,
    },
  },
];

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Initialize default users if not exists
    const existingUsers = storage.load('users', []);
    if (existingUsers.length === 0) {
      storage.save('users', defaultUsers);
    }

    // Check for existing session
    const sessionUser = storage.load('currentUser', null);
    if (sessionUser) {
      setUser(sessionUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    try {
      console.log('[useAuth] Starting login...');
      // Call the Supabase login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();
      console.log('[useAuth] Login response:', { status: response.status, success: data.success, hasToken: !!data.token });

      if (response.ok && data.success && data.user) {
        console.log('[useAuth] Login successful, user:', data.user.name);

        // Map the API response to our User type
        const loggedInUser: User = {
          id: data.user.id,
          name: data.user.name,
          pin: pin, // We keep the PIN for consistency
          role: data.user.role as UserRole,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          signature: data.user.signature || null,
          permissions: data.user.permissions,
        };

        // Set session
        console.log('[useAuth] Saving user and token to localStorage...');
        storage.save('currentUser', loggedInUser);
        storage.save('authToken', data.token);

        // Verify it was saved
        const savedToken = storage.load('authToken', null);
        console.log('[useAuth] Token saved and verified:', !!savedToken);

        setUser(loggedInUser);
        setIsAuthenticated(true);
        return true;
      }

      console.error('[useAuth] Login failed:', data.error || 'Unknown error');
      return false;
    } catch (error) {
      console.error('[useAuth] Login error:', error);
      return false;
    }
  };

  const logout = () => {
    storage.remove('currentUser');
    storage.remove('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (permission: keyof User['permissions']): boolean => {
    return user?.permissions[permission] || false;
  };

  const isRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const updateSignature = async (signature: string): Promise<boolean> => {
    try {
      if (!user) return false;

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature }),
      });

      if (response.ok) {
        const updatedUser = { ...user, signature };
        storage.save('currentUser', updatedUser);
        setUser(updatedUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating signature:', error);
      return false;
    }
  };

  const updateSignatureWithPin = async (signature: string, signaturePin: string): Promise<boolean> => {
    try {
      if (!user) return false;

      const response = await fetch(`/api/admin/users/${user.id}/signature`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature, signaturePin }),
      });

      if (response.ok) {
        const updatedUser = { ...user, signature };
        storage.save('currentUser', updatedUser);
        setUser(updatedUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating signature with PIN:', error);
      return false;
    }
  };

  const verifySignaturePin = async (signaturePin: string): Promise<{ success: boolean; signature?: string }> => {
    try {
      if (!user) return { success: false };

      const response = await fetch(`/api/admin/users/${user.id}/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signaturePin }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, signature: data.signature };
      }

      return { success: false };
    } catch (error) {
      console.error('Error verifying signature PIN:', error);
      return { success: false };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    isRole,
    updateSignature,
    updateSignatureWithPin,
    verifySignaturePin,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole,
  requiredPermission?: keyof User['permissions'],
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, user, hasPermission, isRole } = useAuth();

    useEffect(() => {
      if (!isAuthenticated) {
        window.location.href = '/login';
        return;
      }

      if (requiredRole && !isRole(requiredRole)) {
        window.location.href = '/unauthorized';
        return;
      }

      if (requiredPermission && !hasPermission(requiredPermission)) {
        window.location.href = '/unauthorized';
      }
    }, [isAuthenticated, user, hasPermission, isRole]);

    if (!isAuthenticated) {
      return null;
    }

    if (requiredRole && !isRole(requiredRole)) {
      return null;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return null;
    }

    return React.createElement(Component, props);
  };
}
