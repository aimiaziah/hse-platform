// src/roles/supervisor/layouts/SupervisorLayout.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

interface SupervisorLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({
  children,
  title = 'Supervisor Dashboard',
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Home',
      href: '/supervisor',
      icon: 'home',
    },
    {
      name: 'Reviews',
      href: '/supervisor/reviews',
      icon: 'rate_review',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/supervisor') {
      return router.pathname === '/supervisor';
    }
    if (path === '/supervisor/reviews') {
      return (
        router.pathname === '/supervisor/reviews' ||
        router.pathname.startsWith('/supervisor/review/')
      );
    }
    if (path === '/supervisor/profile') {
      return router.pathname === '/supervisor/profile';
    }
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
        <meta name="description" content="Supervisor panel for inspection review and approval" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      <div className="min-h-screen bg-white pb-20 md:pb-0">
        {/* Mobile Header - Shows only on mobile */}
        <div className="md:hidden">
          <MobileHeader title="" showLogo />
        </div>

        {/* Desktop Navigation Header - Hidden on mobile */}
        <nav className="hidden md:block bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side - User Info */}
              <div className="flex">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {/* Profile Link */}
                    <Link
                      href="/supervisor/profile"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Go to Profile"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </Link>
                    <div className="text-left flex flex-col justify-center">
                      <p className="text-sm font-medium text-gray-900 leading-none mb-0">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize font-medium leading-none mt-1">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:ml-6 md:flex md:space-x-1 md:items-center">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-icons mr-2 text-xl md:text-2xl">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right side - Logo and Logout */}
              <div className="flex items-center space-x-4">
                {/* Logo */}
                <Link href="/supervisor" className="flex items-center gap-3">
                  <Image
                    src="/theta-logo.png"
                    alt="Theta Logo"
                    width={60}
                    height={60}
                    className="object-contain"
                    style={{ width: 'auto', height: 'auto' }}
                  />
                  <div>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                      Platform
                    </p>
                    <p className="text-xs text-gray-600">Theta Edge Berhad</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                >
                  <span className="material-icons text-base">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-4 md:py-6 px-4 sm:px-6 lg:px-8">{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </>
  );
};

export default SupervisorLayout;
