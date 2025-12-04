// src/pages/inspector/index.tsx - Inspector Dashboard
import React from 'react';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import SafetyAnalyticsDashboard from '@/components/SafetyAnalyticsDashboard';

const InspectorDashboard: React.FC = () => {
  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout title="Home">
        <SafetyAnalyticsDashboard />
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default InspectorDashboard;
