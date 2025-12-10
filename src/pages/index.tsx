// src/pages/index.tsx - Role-based Dashboard Router
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

/**
 * This page acts as a router that redirects authenticated users to their role-specific dashboard
 * Admin → /admin (Home section)
 * Other roles → /analytics (unified home page)
 */
const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // If not authenticated, redirect to login
      router.replace('/login');
      return;
    }

    // Admin users redirect to /admin (Home section)
    if (user.role === 'admin') {
      router.replace('/admin');
    } else {
      // Other authenticated users redirect to analytics (unified home page)
      router.replace('/analytics');
    }
  }, [user, router]);

  // Show a loading spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-gray-600 text-lg">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default DashboardPage;
