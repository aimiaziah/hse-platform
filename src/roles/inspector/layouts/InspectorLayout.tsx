// src/roles/inspector/layouts/InspectorLayout.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

interface InspectorLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const InspectorLayout: React.FC<InspectorLayoutProps> = ({
  children,
  title = 'Inspector Dashboard',
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showInspectionsDropdown, setShowInspectionsDropdown] = useState(false);

  const inspectionForms = [
    {
      name: 'Fire Extinguisher',
      href: '/fire-extinguisher',
      icon: 'local_fire_department',
    },
    {
      name: 'First Aid Items',
      href: '/first-aid',
      icon: 'medical_services',
    },
    {
      name: 'HSE Inspection',
      href: '/hse-inspection',
      icon: 'verified_user',
    },
    {
      name: 'Manhours Report',
      href: '/manhours-report',
      icon: 'schedule',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/inspector') {
      return router.pathname === '/inspector';
    }
    if (path === '/inspector/profile') {
      return router.pathname === '/inspector/profile';
    }
    if (path === '/inspector/forms') {
      return router.pathname === '/inspector/forms';
    }
    return router.pathname.startsWith(path);
  };

  const isInspectionFormActive = () => {
    return inspectionForms.some((form) => router.pathname.startsWith(form.href));
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
        <meta name="description" content="Inspector panel for conducting inspections" />
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
                      href="/inspector/profile"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Go to Profile"
                    >
                      <span className="material-icons text-xl">person</span>
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
                  {/* Dashboard Link */}
                  <Link
                    href="/inspector"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive('/inspector')
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-icons mr-2 text-xl md:text-2xl">work</span>
                    Dashboard
                  </Link>

                  {/* Forms Link */}
                  <Link
                    href="/inspector/forms"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive('/inspector/forms')
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-icons mr-2 text-xl md:text-2xl">assignment</span>
                    Forms
                  </Link>

                  {/* Inspection Forms Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowInspectionsDropdown(!showInspectionsDropdown)}
                      onBlur={() => setTimeout(() => setShowInspectionsDropdown(false), 200)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isInspectionFormActive()
                          ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-icons mr-2 text-xl md:text-2xl">assignment</span>
                      Inspection Forms
                      <span
                        className={`material-icons text-base md:text-lg ml-1 transition-transform ${
                          showInspectionsDropdown ? 'rotate-180' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                    {showInspectionsDropdown && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {inspectionForms.map((form) => (
                            <Link
                              key={form.name}
                              href={form.href}
                              className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                isActive(form.href)
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className="material-icons mr-2 text-lg">{form.icon}</span>
                              {form.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side - Logo and Logout */}
              <div className="flex items-center space-x-4">
                {/* Logo */}
                <Link href="/inspector" className="flex items-center gap-3">
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

export default InspectorLayout;
