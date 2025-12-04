// src/shared/components/BaseDashboard.tsx - Unified Dashboard Layout
import React from 'react';

interface StatCard {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendColor?: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  iconColor?: string;
  onClick: () => void;
}

interface BaseDashboardProps {
  title: string;
  subtitle: string;
  userName?: string;
  userRole?: string;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  statCards: StatCard[];
  quickActions?: QuickAction[];
  children?: React.ReactNode;
  showTimeframeSelector?: boolean;
}

const BaseDashboard: React.FC<BaseDashboardProps> = ({
  title,
  subtitle,
  userName,
  userRole,
  timeframe = 'Last 30 days',
  onTimeframeChange,
  statCards,
  quickActions = [],
  children,
  showTimeframeSelector = true,
}) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header with timeframe selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{subtitle}</p>
          </div>
          {showTimeframeSelector && (
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange?.(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
            </select>
          )}
        </div>

        {/* Stat Cards - Mobile First Design */}
        <div
          className={`grid grid-cols-1 ${
            statCards.length === 2
              ? 'sm:grid-cols-2'
              : statCards.length === 3
              ? 'sm:grid-cols-3'
              : statCards.length === 6
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-4'
          } gap-4 md:gap-6`}
        >
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all"
            >
              <div className="space-y-3">
                {/* Header with icon */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  {stat.trend && (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        stat.trend === 'up'
                          ? 'bg-green-50'
                          : stat.trend === 'down'
                          ? 'bg-red-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      {stat.trend === 'up' && (
                        <svg
                          className="w-3 h-3 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                      )}
                      {stat.trend === 'down' && (
                        <svg
                          className="w-3 h-3 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      )}
                      {stat.trendValue && (
                        <span
                          className={`text-xs font-semibold ${
                            stat.trend === 'up'
                              ? 'text-green-600'
                              : stat.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {stat.trendValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Value */}
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</p>
                  {stat.sublabel && <p className="text-xs text-gray-500 mt-1">{stat.sublabel}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Forms */}
        {quickActions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Forms</h2>
            <div
              className={`grid grid-cols-1 ${
                quickActions.length >= 4
                  ? 'md:grid-cols-4'
                  : quickActions.length === 3
                  ? 'md:grid-cols-3'
                  : 'md:grid-cols-2'
              } gap-4`}
            >
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className={`flex-shrink-0 ${action.iconColor || 'text-blue-600'}`}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Additional Content */}
        {children}
      </div>
    </div>
  );
};

export default BaseDashboard;
