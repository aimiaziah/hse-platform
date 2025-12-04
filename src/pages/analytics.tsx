import React from 'react';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import SafetyAnalyticsDashboard from '@/components/SafetyAnalyticsDashboard';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import EmployeeLayout from '@/roles/employee/layouts/EmployeeLayout';

const AnalyticsDashboard: React.FC = () => {
  const { isRole } = useAuth();

  // Determine which layout to use based on role
  const getLayout = (children: React.ReactNode) => {
    if (isRole('admin')) {
      return <AdminLayout title="Home">{children}</AdminLayout>;
    }
    if (isRole('inspector')) {
      return <InspectorLayout title="Home">{children}</InspectorLayout>;
    }
    if (isRole('supervisor')) {
      return <SupervisorLayout title="Home">{children}</SupervisorLayout>;
    }
    // Default to employee layout
    return <EmployeeLayout title="Home">{children}</EmployeeLayout>;
  };

  return (
    <ProtectedRoute requiredPermission="canViewAnalytics">
      {getLayout(<SafetyAnalyticsDashboard />)}
    </ProtectedRoute>
  );
};

export default AnalyticsDashboard;
