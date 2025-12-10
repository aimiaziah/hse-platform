import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

const RoleBasedNav: React.FC = () => {
  const router = useRouter();
  const { user, isRole, logout } = useAuth();

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

  // Navigation items based on role
  const getNavigationItems = () => {
    if (isRole('admin')) {
      return [
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
    }

    if (isRole('supervisor')) {
      return [
        {
          name: 'Dashboard',
          href: '/supervisor',
          icon: 'dashboard',
        },
        {
          name: 'Reviews',
          href: '/supervisor/reviews',
          icon: 'rate_review',
        },
      ];
    }

    if (isRole('inspector')) {
      return [
        {
          name: 'Dashboard',
          href: '/',
          icon: 'dashboard',
        },
        {
          name: 'Inspections',
          href: '/inspections',
          icon: 'checklist',
        },
      ];
    }

    return [
      {
        name: 'Dashboard',
        href: '/',
        icon: 'dashboard',
      },
    ];
  };

  const navigation = getNavigationItems();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-900">HSE Platform</div>
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
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
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
          )}
        </div>
      </div>
    </nav>
  );
};

export default RoleBasedNav;
