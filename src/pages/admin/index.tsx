// src/pages/admin/index.tsx - Admin Dashboard
import React from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import SafetyAnalyticsDashboard from '@/components/SafetyAnalyticsDashboard';

const AdminDashboard: React.FC = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout title="Home">
        <SafetyAnalyticsDashboard />
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
