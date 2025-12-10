// src/roles/admin/layouts/AdminLayout.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title = 'Admin Dashboard' }) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: 'dashboard',
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: 'manage_accounts',
    },
    {
      name: 'Form Management',
      href: '/admin/checklist-items',
      icon: 'description',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return router.pathname === '/admin';
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
        <meta name="description" content="Admin panel for HSE inspection management" />
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
              {/* Logo and Title */}
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/admin" className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
                      <Image
                        src="/theta-logo.png"
                        alt="Theta Logo"
                        width={60}
                        height={60}
                        className="object-contain max-w-full max-h-full"
                        style={{ width: 'auto', height: 'auto' }}
                      />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                        Platform
                      </p>
                      <p className="text-xs text-gray-600">Theta Edge Berhad</p>
                    </div>
                  </Link>
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

              {/* User menu */}
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {user?.role}
                  </span>
                </div>
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

export default AdminLayout;
