// src/components/CircularProgress.tsx - Circular Progress Indicator
import React from 'react';

interface CircularProgressProps {
  percentage: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showPercentage?: boolean;
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  // Fraction display (e.g., "2/3")
  completed?: number;
  total?: number;
  fractionLabel?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6', // blue-500
  trackColor = '#E5E7EB', // gray-200
  showPercentage = true,
  label,
  sublabel,
  icon,
  completed,
  total,
  fractionLabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track circle (background) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {icon && <div className="flex justify-center mb-1">{icon}</div>}
            {completed !== undefined && total !== undefined ? (
              <div>
                <div className="font-bold text-2xl" style={{ color }}>
                  {completed}/{total}
                </div>
                {fractionLabel && <div className="text-xs text-gray-600 mt-1">{fractionLabel}</div>}
              </div>
            ) : (
              showPercentage && (
                <div className="font-bold text-2xl" style={{ color }}>
                  {Math.round(percentage)}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Label */}
      {label && (
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
