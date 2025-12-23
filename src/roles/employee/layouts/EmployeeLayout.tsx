// src/roles/employee/layouts/EmployeeLayout.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import NotificationBell from '@/components/NotificationBell';
import { UserAvatarIcon } from '@/components/UserAvatar';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({
  children,
  title = 'Employee Dashboard',
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Home',
      href: '/analytics',
      icon: 'home',
    },
  ];

  const isActive = (path: string) => {
    return router.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      logout();
      router.push('/login');
    } catch (error) {
      // Logout error
    }
  };

  return (
    <>
      <Head>
        <title>{title} - HSE Inspection Platform</title>
        <meta name="description" content="Employee panel for viewing analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      <div className="min-h-screen bg-white pb-20 md:pb-0">
        {/* Mobile Header - Shows only on mobile */}
        <div className="md:hidden">
          <MobileHeader title="" showLogo showNotificationForEmployee />
        </div>

        {/* Desktop Navigation Header - Hidden on mobile - Sticky Header */}
        <header className="hidden md:block sticky top-0 bg-white shadow-sm border-b border-gray-200 z-40">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side - Logo */}
              <div className="flex items-center">
                <Link href="/analytics" className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/theta-logo.png"
                      alt="Theta Logo"
                      width={48}
                      height={48}
                      className="object-contain w-full h-full"
                      priority
                    />
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold text-[#1e3a8a] leading-tight"
                      style={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      }}
                    >
                      Theta
                    </p>
                    <p className="text-xs text-gray-600 leading-tight">Platform</p>
                  </div>
                </Link>
              </div>

              {/* Right side - Notification Bell */}
              <div className="flex items-center gap-4">
                <NotificationBell />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                >
                  <span className="material-icons text-base">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-4 md:py-6 px-4 sm:px-6 lg:px-8">{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </>
  );
};

export default EmployeeLayout;
