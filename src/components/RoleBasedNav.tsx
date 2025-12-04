// src/components/RoleBasedNav.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: string; // Material icon name
  iconClass?: string; // Additional classes for the icon
  permission?: string;
}

const RoleBasedNav: React.FC = () => {
  const { user, logout, isRole } = useAuth();
  const router = useRouter();
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showInspectionsDropdown, setShowInspectionsDropdown] = useState(false);

  const adminNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/analytics',
      icon: 'home',
      iconClass: 'text-purple-600'
    },
    {
      label: 'User Management',
      href: '/admin/users',
      icon: 'manage_accounts',
      iconClass: 'text-blue-600'
    },
    {
      label: 'Form Management',
      href: '/admin/checklist-items',
      icon: 'description',
      iconClass: 'text-green-600'
    },
  ];

  const inspectorNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/analytics',
      icon: 'home',
      iconClass: 'text-green-600'
    },
  ];

  const inspectionForms: NavItem[] = [
    {
      label: 'Fire Extinguisher',
      href: '/fire-extinguisher',
      icon: 'local_fire_department',
      iconClass: 'text-orange-600'
    },
    {
      label: 'First Aid Items',
      href: '/first-aid',
      icon: 'medical_services',
      iconClass: 'text-red-600'
    },
    {
      label: 'HSE Inspection',
      href: '/hse-inspection',
      icon: 'verified_user',
      iconClass: 'text-indigo-600'
    },
  ];

  const supervisorNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/analytics',
      icon: 'home',
      iconClass: 'text-blue-600'
    },
  ];

  const employeeNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/analytics',
      icon: 'home',
      iconClass: 'text-cyan-600'
    },
  ];

  const getNavItems = (): NavItem[] => {
    if (isRole('admin')) return adminNavItems;
    if (isRole('inspector')) return inspectorNavItems;
    if (isRole('supervisor')) return supervisorNavItems;
    if (isRole('employee')) return employeeNavItems;
    return [];
  };

  const navItems = getNavItems();

  const isInspectionFormActive = () => {
    return inspectionForms.some(form => router.pathname.startsWith(form.href));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/admin' || href === '/analytics' || href === '/supervisor' || href === '/inspector') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const getRoleBadgeColor = () => {
    if (isRole('admin')) return 'bg-purple-100 text-purple-800';
    if (isRole('inspector')) return 'bg-green-100 text-green-800';
    if (isRole('supervisor')) return 'bg-blue-100 text-blue-800';
    if (isRole('employee')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };


  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                HSE Inspection
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {isRole('admin') ? (
                /* Admin navigation with dropdown */
                <>
                  <Link
                    href="/analytics"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActiveRoute('/analytics')
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-icons text-purple-600 mr-2 text-xl md:text-2xl">
                      home
                    </span>
                    Home
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                      onBlur={() => setTimeout(() => setShowAdminDropdown(false), 200)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActiveRoute('/admin/users') || isActiveRoute('/admin/checklist-items')
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-icons text-gray-700 mr-2 text-xl md:text-2xl">
                        settings
                      </span>
                      Management
                      <span className="material-icons text-base md:text-lg ml-1">
                        expand_more
                      </span>
                    </button>
                    {showAdminDropdown && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <Link
                            href="/admin/users"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span className="material-icons text-blue-600 mr-2 text-xl">
                              manage_accounts
                            </span>
                            User Management
                          </Link>
                          <Link
                            href="/admin/checklist-items"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span className="material-icons text-green-600 mr-2 text-xl">
                              description
                            </span>
                            Form Management
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : isRole('inspector') ? (
                /* Inspector navigation with dropdown */
                <>
                  <Link
                    href="/analytics"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActiveRoute('/analytics')
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-icons text-green-600 mr-2 text-xl md:text-2xl">
                      home
                    </span>
                    Home
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setShowInspectionsDropdown(!showInspectionsDropdown)}
                      onBlur={() => setTimeout(() => setShowInspectionsDropdown(false), 200)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isInspectionFormActive()
                          ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-icons text-blue-600 mr-2 text-xl md:text-2xl">
                        assignment
                      </span>
                      Inspection Forms
                      <span className={`material-icons text-base md:text-lg ml-1 transition-transform ${showInspectionsDropdown ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {showInspectionsDropdown && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {inspectionForms.map((form) => (
                            <Link
                              key={form.href}
                              href={form.href}
                              className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                isActiveRoute(form.href)
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`material-icons ${form.iconClass} mr-2 text-lg`}>
                                {form.icon}
                              </span>
                              {form.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Other roles navigation */
                navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActiveRoute(item.href)
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`material-icons ${item.iconClass} mr-2 text-xl md:text-2xl`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor()}`}
              >
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-icons text-base md:text-lg">
                logout
              </span>
              Logout
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden pb-3">
          {isRole('inspector') ? (
            /* Inspector mobile menu with dropdown */
            <div className="flex flex-col gap-2">
              <Link
                href="/analytics"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActiveRoute('/analytics')
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <span className="material-icons text-green-600 mr-1.5 text-2xl">
                  home
                </span>
                Home
              </Link>
              <div>
                <button
                  onClick={() => setShowInspectionsDropdown(!showInspectionsDropdown)}
                  className={`w-full inline-flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${
                    isInspectionFormActive()
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="inline-flex items-center">
                    <span className="material-icons text-blue-600 mr-1.5 text-2xl">
                      assignment
                    </span>
                    Inspection Forms
                  </span>
                  <span className={`material-icons text-xl transition-transform ${showInspectionsDropdown ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {showInspectionsDropdown && (
                  <div className="mt-2 ml-4 flex flex-col gap-2">
                    {inspectionForms.map((form) => (
                      <Link
                        key={form.href}
                        href={form.href}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActiveRoute(form.href)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`material-icons ${form.iconClass} mr-1.5 text-xl`}>
                          {form.icon}
                        </span>
                        {form.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Other roles mobile menu */
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActiveRoute(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className={`material-icons ${item.iconClass} mr-1.5 text-2xl`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor()}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default RoleBasedNav;
