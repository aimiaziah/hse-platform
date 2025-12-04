const fs = require('fs');
const path = require('path');

const analyticsContent = `import React, { useState, useEffect } from 'react';
import EmployeeLayout from '@/roles/employee/layouts/EmployeeLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { storage } from '@/utils/storage';
import CircularProgress from '@/components/CircularProgress';

type TimeFilter = 'today' | 'week' | 'month' | 'year';

interface MonthlyInspectionData {
  month: string;
  fireExtinguisher: number;
  firstAid: number;
  manhours: number;
  total: number;
}

interface MonthlyManhoursData {
  month: string;
  employees: number;
  manHours: number;
  accidents: number;
}

interface ExpiryItem {
  id: string;
  type: 'fire_extinguisher' | 'first_aid';
  itemName: string;
  location: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

interface AnalyticsData {
  selectedYear: number;
  totalInspectionsYear: number;
  totalInspectorsCount: number;
  currentMonthInspected: boolean;
  monthlyData: MonthlyInspectionData[];
  expiryItems: ExpiryItem[];
  averageEmployees: number;
  totalCumulativeManHours: number;
  totalAccidents: number;
  monthlyManhoursData: MonthlyManhoursData[];
}

const AnalyticsDashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('year');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedYear]);
`;

const filePath = path.join(__dirname, 'src', 'pages', 'analytics.tsx');
console.log('Writing to:', filePath);
console.log('Content preview (first 500 chars):', analyticsContent.substring(0, 500));
console.log('Script completed! Please check the file.');

