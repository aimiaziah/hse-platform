import React from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import SafetyAnalyticsDashboard from '@/components/SafetyAnalyticsDashboard';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import EmployeeLayout from '@/roles/employee/layouts/EmployeeLayout';

const AnalyticsDashboard: React.FC = () => {
  const { isRole } = useAuth();
  const router = useRouter();

  // Redirect admin users to /admin (Home section) instead of analytics
  React.useEffect(() => {
    if (isRole('admin')) {
      router.replace('/admin');
    }
  }, [isRole, router]);

  // Determine which layout to use based on role (admin is redirected, so this is for other roles)
  const getLayout = (children: React.ReactNode) => {
    if (isRole('inspector')) {
      return <InspectorLayout title="Home">{children}</InspectorLayout>;
    }
    if (isRole('supervisor')) {
      return <SupervisorLayout title="Home">{children}</SupervisorLayout>;
    }
    // Default to employee layout
    return <EmployeeLayout title="Home">{children}</EmployeeLayout>;
  };

  // Don't render analytics for admin (they're redirected)
  if (isRole('admin')) {
    return null;
  }

  return (
    <ProtectedRoute requiredPermission="canViewAnalytics">
      {getLayout(<SafetyAnalyticsDashboard />)}
    </ProtectedRoute>
  );
};

export default AnalyticsDashboard;
