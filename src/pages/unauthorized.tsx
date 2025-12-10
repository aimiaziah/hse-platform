// src/pages/unauthorized.tsx
import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';

const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'admin') {
      router.push('/admin');
    } else if (user?.role === 'inspector') {
      router.push('/inspector');
    } else if (user?.role === 'supervisor') {
      router.push('/supervisor');
    } else if (user?.role === 'employee') {
      router.push('/analytics');
    } else {
      router.push('/');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Unauthorized - HSE Inspection Platform</title>
      </Head>

      <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Access Denied</h2>
              <p className="mt-2 text-sm text-gray-600">
                You don&apos;t have permission to access this page.
              </p>

              {user && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Current User:</span> {user.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Role:</span>{' '}
                    <span className="capitalize">{user.role}</span>
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Logout
                </button>
              </div>

              <p className="mt-6 text-xs text-gray-500">
                If you believe this is an error, please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UnauthorizedPage;
