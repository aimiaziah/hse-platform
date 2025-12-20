// src/components/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, UserRole, User } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: keyof User['permissions'];
  fallbackUrl?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackUrl = '/login',
}) => {
  const { isAuthenticated, user, hasPermission, isRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) {
      return;
    }

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
    isLoading,
  ]);

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
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

  return <>{children}</>;
};

export default ProtectedRoute;
