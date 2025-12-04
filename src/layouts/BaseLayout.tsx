// src/layouts/BaseLayout.tsx - Updated to preserve original design + add auth
import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MobileBottomNav from '@/components/MobileBottomNav';

interface BaseLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  requireAuth?: boolean;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  title = 'HSE Inspection System',
  description = 'Comprehensive Health, Safety & Environment inspection management system',
  requireAuth = true,
}) => {
  const router = useRouter();

  // Initialize all hooks first - NEVER conditionally call hooks
  const [showInspectionsDropdown, setShowInspectionsDropdown] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // Auth hooks - handle auth context safely
  let user = null;
  let logout = () => {};
  let isAuthenticated = false;

  try {
    const authContext = useAuth();
    user = authContext.user;
    logout = authContext.logout;
    isAuthenticated = authContext.isAuthenticated;
  } catch (error) {
    console.warn('Auth context not available:', error);
    // Handle gracefully when auth is not available
  }

  // Handle auth redirect effect
  React.useEffect(() => {
    if (requireAuth && !isAuthenticated && router.pathname !== '/login') {
      router.push('/login');
    }
  }, [requireAuth, isAuthenticated, router]);

  // Don't render content if auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"
          />
        </svg>
      ),
      description: 'Overview and quick actions',
    },
    {
      href: '/inspections',
      label: 'Inspections',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      description: 'All inspection types',
      subItems: [
        {
          href: '/hse-inspection',
          label: 'HSE Inspection',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ),
          description: 'Health, Safety & Environment',
        },
        {
          href: '/fire-extinguisher',
          label: 'Fire Extinguisher',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 2.207 0 4 1.793 4 4v6c0 1.657-1.343 3-3 3z"
              />
            </svg>
          ),
          description: 'Fire safety equipment',
        },
        {
          href: '/first-aid',
          label: 'First Aid Items',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          ),
          description: 'First aid supplies inspection',
        },
      ],
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      description: 'View and manage completed inspections',
    },
  ];

  // Add role-based menu items

  if (user?.role === 'admin') {
    navItems.push({
      href: '/analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      description: 'Trends and compliance metrics',
    });
  }

  const isActivePath = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      // Clear any pending operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform logout
      logout();

      // Clear browser cache/storage if needed
      if (typeof window !== 'undefined') {
        // Optional: Clear any cached data
        // sessionStorage.clear();
      }

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if there's an error
      router.push('/login');
    }
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#ffffff" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5"
        />

        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/theta-logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HSE Inspector" />
      </Head>

      <div className="min-h-screen bg-white pb-20 lg:pb-0">
        {/* Header - Preserving original design */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20 py-3">
              {/* Logo and Title - Original Design */}
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/theta-logo.png"
                      alt="Company Logo"
                      width={64}
                      height={64}
                      className="object-contain max-w-full max-h-full"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </div>
                  <div className="flex flex-col justify-center mt-1">
                    <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight mb-0">
                      Platform
                    </h1>
                    <p className="text-xs text-gray-600 hidden sm:block leading-tight">
                      Theta Edge Berhad
                    </p>
                  </div>
                </Link>

                {/* Role Badge */}
                {user && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 ml-2">
                    {user.role.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {navItems.map((item) => (
                  <div key={item.href} className="relative">
                    {item.subItems ? (
                      <div
                        className="relative"
                        onMouseEnter={() => setShowInspectionsDropdown(true)}
                        onMouseLeave={() => setShowInspectionsDropdown(false)}
                      >
                        <button
                          className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2
                          ${
                            isActivePath(item.href)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }
                        `}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>

                        {showInspectionsDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              {item.subItems.map((subItem) => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                    isActivePath(subItem.href)
                                      ? 'text-blue-600 bg-blue-50'
                                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  onClick={() => setShowInspectionsDropdown(false)}
                                >
                                  {subItem.icon}
                                  <div className="ml-2">
                                    <div className="font-medium">{subItem.label}</div>
                                    <div className="text-xs text-gray-500">
                                      {subItem.description}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActivePath(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </nav>

              {/* User Menu - Enhanced with better logout */}
              <div className="flex items-center gap-4">
                {user && (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 text-sm rounded-lg bg-white px-3 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <span className="ml-1 text-gray-700 hidden sm:block font-medium">
                        {user.name}
                      </span>
                      <svg
                        className="ml-1 h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {showUserMenu && (
                      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {/* User Info Section */}
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-blue-600">
                                  {user.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </span>
                              </div>
                              <div className="mt-1">
                                <div className="font-medium text-gray-900 leading-tight mb-0">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500 capitalize leading-tight">
                                  {user.role}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Role-based Menu Items */}
                          {user.role === 'admin' && (
                            <>
                              <Link
                                href="/admin"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <svg
                                  className="w-4 h-4 mr-3 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                Admin Panel
                              </Link>
                              <div className="border-t border-gray-100" />
                            </>
                          )}

                          {/* Quick Actions */}
                          <div className="border-t border-gray-100" />

                          <Link
                            href="/reports"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg
                              className="w-4 h-4 mr-3 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            My Reports
                          </Link>

                          {/* Logout Section */}
                          <div className="border-t border-gray-100" />
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 mr-3 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Logout Button (Alternative - shown when user menu is closed) */}
                {user && (
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="hidden lg:block">Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb - Preserving original */}
        {router.pathname !== '/' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm">
                  <li>
                    <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                        />
                      </svg>
                      Dashboard
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-4 h-4 text-gray-400 mx-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-900 font-medium">
                      {navItems.find(
                        (item) =>
                          item.href === router.pathname ||
                          item.subItems?.some((sub) => sub.href === router.pathname),
                      )?.label ||
                        navItems
                          .find((item) =>
                            item.subItems?.some((sub) => sub.href === router.pathname),
                          )
                          ?.subItems?.find((sub) => sub.href === router.pathname)?.label ||
                        'Current Page'}
                    </span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>

        {/* Click outside handler for dropdowns */}
        {(showInspectionsDropdown || showUserMenu) && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setShowInspectionsDropdown(false);
              setShowUserMenu(false);
            }}
          />
        )}

        {/* Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </>
  );
};

export default BaseLayout;
