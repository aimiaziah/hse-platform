// src/pages/admin/index.tsx - Admin Dashboard
import React from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout title="Home">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 md:p-8 border border-blue-100">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Manage your HSE inspection platform from here.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Link
              href="/admin/users"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="material-icons text-blue-600 text-2xl">manage_accounts</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <p className="text-sm text-gray-600">Manage users and permissions</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/security-dashboard"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="material-icons text-red-600 text-2xl">security</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Security Dashboard</h3>
                  <p className="text-sm text-gray-600">Monitor security events and threats</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/checklist-items"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="material-icons text-green-600 text-2xl">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Form Management</h3>
                  <p className="text-sm text-gray-600">Configure inspection forms</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
