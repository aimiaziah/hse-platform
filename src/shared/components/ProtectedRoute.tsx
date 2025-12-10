// src/components/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, UserRole } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  fallbackUrl?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackUrl = '/login',
}) => {
  const { isAuthenticated, user, hasPermission, isRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.push(fallbackUrl);
      return;
    }

    // Role requirement not met
    if (requiredRole && !isRole(requiredRole)) {
      router.push('/unauthorized');
      return;
    }

    // Permission requirement not met
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/unauthorized');
    }
  }, [
    isAuthenticated,
    user,
    router,
    requiredRole,
    requiredPermission,
    fallbackUrl,
    hasPermission,
    isRole,
  ]);

  // Show loading while checking auth
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Role requirement not met
  if (requiredRole && !isRole(requiredRole)) {
    return null;
  }

  // Permission requirement not met
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
