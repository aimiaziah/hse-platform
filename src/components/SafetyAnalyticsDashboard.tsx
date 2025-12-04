import React, { useState, useEffect } from 'react';
import CircularProgress from '@/components/CircularProgress';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TabType = 'manhours' | 'inspections';

interface MonthlyManhoursData {
  month: string;
  employees: number;
  manHours: number;
  accidents: number;
}

interface MonthlyInspectionData {
  month: string;
  fireExtinguisher: number;
  firstAid: number;
  total: number;
}

interface ExpiryItem {
  id: string;
  type: 'fire_extinguisher' | 'first_aid';
  itemName: string;
  location: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

interface Inspector {
  id: string;
  name: string;
  initials: string;
  color: string;
  inspectionCount: number;
}

interface AnalyticsData {
  // Statistics tab data
  averageEmployees: number;
  totalCumulativeManHours: number;
  totalAccidents: number;
  currentMonthStats: {
    employees: number;
    manHours: number;
    accidents: number;
  };
  monthlyManhoursData: MonthlyManhoursData[];

  // Inspections tab data
  totalInspectionsThisMonth: number;
  totalInspectionsYear: number;
  totalInspectorsCount: number;
  currentMonthStatus: 'Done' | 'Pending' | 'In Progress';
  monthlyInspectionData: MonthlyInspectionData[];
  expiryItems: ExpiryItem[];
  inspectors: Inspector[];
  monthlyCompletionStats: {
    completed: number;
    total: number;
  };
  yearlyCompletionStats: {
    completed: number;
    total: number;
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
];

const SafetyAnalyticsDashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [activeTab, setActiveTab] = useState<TabType>('manhours');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedYear]);

  const loadAnalyticsData = async () => {
    setLoading(true);

    try {
      // Fetch data from API with year filter only (showing all months)
      const response = await fetch(
        `/api/analytics/dashboard?year=${selectedYear}&month=0`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Optionally show error message to user
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    // Show exact numbers, no K formatting
    return num.toLocaleString();
  };

  const getExpiryColor = (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return 'text-red-600';
    if (daysUntilExpiry <= 17) return 'text-red-600';
    if (daysUntilExpiry <= 70) return 'text-green-600';
    return 'text-green-600';
  };

  const getExpiryText = (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return `${Math.abs(daysUntilExpiry)}d ago`;
    return `${daysUntilExpiry}d`;
  };

  const availableYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600">No data available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-2 pb-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Dashboard</h1>

            {/* Year Filter Only */}
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-2 flex gap-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('manhours')}
              className={`pb-1.5 px-1 font-medium text-xs transition-colors relative ${
                activeTab === 'manhours' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Safety Statistics
              {activeTab === 'manhours' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`pb-1.5 px-1 font-medium text-xs transition-colors relative ${
                activeTab === 'inspections' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inspections & Alerts
              {activeTab === 'inspections' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manhours Tab */}
      {activeTab === 'manhours' && (
        <>
          {/* Yearly Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Average Employees Card */}
            <div
              className="rounded-lg shadow-sm px-3 py-4 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#0EA974' }}
            >
              <p className="text-[9px] font-medium text-white mb-1 text-center leading-tight">
                Average Employees
              </p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(analyticsData.averageEmployees)}
              </p>
            </div>

            {/* Total Man-Hours Card */}
            <div
              className="rounded-lg shadow-sm px-3 py-4 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#1E355E' }}
            >
              <p className="text-[9px] font-medium text-white mb-1 text-center leading-tight">
                Total Man-Hours
              </p>
              <p className="text-[9px] font-medium text-white mb-1 text-center leading-tight">
                (Year to Date)
              </p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(analyticsData.totalCumulativeManHours)}
              </p>
            </div>

            {/* Total Accidents Card */}
            <div
              className="rounded-lg shadow-sm px-3 py-4 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#84286B' }}
            >
              <p className="text-[9px] font-medium text-white mb-1 text-center leading-tight">
                Total Accidents
              </p>
              <p className="text-2xl font-bold text-white">{analyticsData.totalAccidents}</p>
            </div>
          </div>

          {/* Monthly Statistics Title */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-900 text-center">Monthly Statistics</h3>
          </div>

          {/* Employees Monthly Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Employees</h3>
            {/* @ts-ignore - Recharts has type compatibility issues with React 18 */}
            <ResponsiveContainer width="100%" height={200}>
              {/* @ts-ignore */}
              <ComposedChart
                data={analyticsData.monthlyManhoursData.slice(0, 12)}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                {/* @ts-ignore */}
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                {/* @ts-ignore */}
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  height={25}
                />
                {/* @ts-ignore */}
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  width={40}
                />
                {/* @ts-ignore */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '6px 8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Employees']}
                />
                {/* @ts-ignore */}
                <Bar dataKey="employees" fill="#0EA974" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Man-Hours Monthly Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Man-Hours</h3>
            {/* @ts-ignore - Recharts has type compatibility issues with React 18 */}
            <ResponsiveContainer width="100%" height={200}>
              {/* @ts-ignore */}
              <ComposedChart
                data={analyticsData.monthlyManhoursData.slice(0, 12)}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                {/* @ts-ignore */}
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                {/* @ts-ignore */}
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  height={25}
                />
                {/* @ts-ignore */}
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  width={40}
                />
                {/* @ts-ignore */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '6px 8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Man-Hours']}
                />
                {/* @ts-ignore */}
                <Bar dataKey="manHours" fill="#1E355E" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Total Accumulated Man-Hours Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Total Accumulated Man-Hours
            </h3>
            {/* @ts-ignore - Recharts has type compatibility issues with React 18 */}
            <ResponsiveContainer width="100%" height={200}>
              {/* @ts-ignore */}
              <ComposedChart
                data={(() => {
                  // Get first 12 months
                  const yearData = analyticsData.monthlyManhoursData.slice(0, 12);

                  // Find the last month with data
                  let lastMonthWithData = 0;
                  for (let i = yearData.length - 1; i >= 0; i--) {
                    if (yearData[i].manHours > 0 || yearData[i].employees > 0) {
                      lastMonthWithData = i;
                      break;
                    }
                  }

                  // Slice to only include months up to the last month with data
                  const dataWithValues = yearData.slice(0, lastMonthWithData + 1);

                  // Calculate cumulative sum
                  return dataWithValues.map((item, index, array) => {
                    const cumulativeManHours = array
                      .slice(0, index + 1)
                      .reduce((sum, data) => sum + data.manHours, 0);
                    return {
                      ...item,
                      cumulativeManHours,
                    };
                  });
                })()}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                {/* @ts-ignore */}
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                {/* @ts-ignore */}
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  height={25}
                />
                {/* @ts-ignore */}
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickLine={false}
                  width={40}
                />
                {/* @ts-ignore */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '6px 8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Accumulated']}
                />
                {/* @ts-ignore */}
                <Line
                  type="monotone"
                  dataKey="cumulativeManHours"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ fill: '#D97706', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <>
          {/* Monthly Progress Circle */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Monthly Inspection Progress
            </h3>
            <div className="flex flex-col items-center justify-center">
              <CircularProgress
                percentage={
                  (analyticsData.monthlyCompletionStats.completed /
                    analyticsData.monthlyCompletionStats.total) *
                  100
                }
                size={120}
                strokeWidth={10}
                color="#10B981"
                completed={analyticsData.monthlyCompletionStats.completed}
                total={analyticsData.monthlyCompletionStats.total}
              />
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 mt-1">Inspections Done This Month</p>
              </div>
            </div>
          </div>

          {/* Yearly Progress Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Yearly Inspection Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {analyticsData.yearlyCompletionStats.completed} /{' '}
                  {analyticsData.yearlyCompletionStats.total} Forms Completed
                </span>
                <span className="text-sm font-bold text-green-600">
                  {Math.round(
                    (analyticsData.yearlyCompletionStats.completed /
                      analyticsData.yearlyCompletionStats.total) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      (analyticsData.yearlyCompletionStats.completed /
                        analyticsData.yearlyCompletionStats.total) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Monthly Inspections Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Monthly Inspections</h3>
            <div className="h-32 flex items-end justify-between gap-1.5">
              {analyticsData.monthlyInspectionData.slice(0, 6).map((data, index) => {
                const maxValue = Math.max(
                  ...analyticsData.monthlyInspectionData.flatMap((d) => [
                    d.fireExtinguisher,
                    d.firstAid,
                  ]),
                  60,
                );

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="relative w-full flex items-end justify-center gap-0.5"
                      style={{ height: '100px' }}
                    >
                      {/* Fire Extinguisher Bar */}
                      <div className="flex-1 flex flex-col items-center justify-end group">
                        <div
                          className="rounded-t w-full transition-all hover:opacity-80 cursor-pointer relative"
                          style={{
                            backgroundColor: '#1E355E',
                            height: `${Math.max((data.fireExtinguisher / maxValue) * 90, 3)}px`,
                            minHeight: data.fireExtinguisher > 0 ? '4px' : '2px',
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[9px] py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Fire: {data.fireExtinguisher}
                          </div>
                        </div>
                      </div>
                      {/* First Aid Bar */}
                      <div className="flex-1 flex flex-col items-center justify-end group">
                        <div
                          className="rounded-t w-full transition-all hover:opacity-80 cursor-pointer relative"
                          style={{
                            backgroundColor: '#0EA974',
                            height: `${Math.max((data.firstAid / maxValue) * 90, 3)}px`,
                            minHeight: data.firstAid > 0 ? '4px' : '2px',
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[9px] py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            First Aid: {data.firstAid}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 mt-1 font-medium">{data.month}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#1E355E' }}></div>
                <span className="text-[10px] text-gray-600">Fire Extinguishers</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#0EA974' }}></div>
                <span className="text-[10px] text-gray-600">First Aid Items</span>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Expiry Alerts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <svg
                  className="w-3.5 h-3.5 text-orange-600"
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
                <h3 className="text-xs font-semibold text-gray-900">Expiry Alerts</h3>
              </div>
              <div className="space-y-1.5">
                {analyticsData.expiryItems.length > 0 ? (
                  analyticsData.expiryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-gray-900 truncate">
                          {item.itemName}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold ml-2 ${getExpiryColor(
                          item.daysUntilExpiry,
                        )}`}
                      >
                        {getExpiryText(item.daysUntilExpiry)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-500 text-center py-2">No expiry alerts</p>
                )}
              </div>
            </div>

            {/* Inspectors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Inspectors</h3>
              <div className="space-y-1.5">
                {analyticsData.inspectors.length > 0 ? (
                  analyticsData.inspectors.map((inspector) => (
                    <div key={inspector.id} className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full ${inspector.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-semibold text-[10px]">
                          {inspector.initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-900 truncate">
                          {inspector.name}
                        </p>
                        <p className="text-[9px] text-gray-500">{inspector.inspectionCount}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-500 text-center py-2">No inspectors found</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SafetyAnalyticsDashboard;
