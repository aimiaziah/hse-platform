// src/pages/supervisor/index.tsx - Supervisor Home (Analytics Dashboard)
import React from 'react';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import SafetyAnalyticsDashboard from '@/components/SafetyAnalyticsDashboard';

const SupervisorHome: React.FC = () => {
  return (
    <ProtectedRoute requiredPermission="canViewAnalytics">
      <SupervisorLayout title="Home">
        <SafetyAnalyticsDashboard />
      </SupervisorLayout>
    </ProtectedRoute>
  );
};

export default SupervisorHome;
