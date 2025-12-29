'use client';

import React from 'react';

// Wealth projection line graph
interface WealthDataPoint {
  age: number;
  investments: number;
  property: number;
  debt: number;
  netWealth: number;
}

interface LineGraphProps {
  data: WealthDataPoint[];
  height?: number;
  showLegend?: boolean;
}

export function WealthLineGraph({ data, height = 200, showLegend = true }: LineGraphProps) {
  if (data.length < 2) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const width = 100; // percentage-based

  // Find min/max values
  const allValues = data.flatMap((d) => [d.netWealth, d.investments, d.property, -d.debt]);
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  // Scale functions
  const scaleX = (index: number) => (index / (data.length - 1)) * 100;
  const scaleY = (value: number) => 100 - ((value - minVal) / range) * 100;

  // Generate path for a data series
  const generatePath = (getValue: (d: WealthDataPoint) => number) => {
    return data
      .map((d, i) => {
        const x = scaleX(i);
        const y = scaleY(getValue(d));
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Format large numbers
  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
        style={{ height, width: '100%' }}
        className="overflow-visible"
      >
        {/* Grid lines */}
        <defs>
          <linearGradient id="netWealthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34C759" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Zero line if applicable */}
        {minVal < 0 && (
          <line
            x1="0"
            y1={scaleY(0)}
            x2="100"
            y2={scaleY(0)}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        )}

        {/* Area fill for net wealth */}
        <path
          d={`${generatePath((d) => d.netWealth)} L 100 100 L 0 100 Z`}
          fill="url(#netWealthGradient)"
        />

        {/* Net wealth line (main) */}
        <path
          d={generatePath((d) => d.netWealth)}
          fill="none"
          stroke="#34C759"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Investment line */}
        <path
          d={generatePath((d) => d.investments)}
          fill="none"
          stroke="#007AFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4,2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Property line */}
        <path
          d={generatePath((d) => d.property)}
          fill="none"
          stroke="#AF52DE"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Debt line (shown as negative) */}
        <path
          d={generatePath((d) => -d.debt)}
          fill="none"
          stroke="#FF3B30"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4,2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
        <span>{data[0]?.age}</span>
        <span>{data[Math.floor(data.length / 2)]?.age}</span>
        <span>{data[data.length - 1]?.age}</span>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-ios-green rounded" />
            <span className="text-gray-600 dark:text-gray-400">Net Wealth</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-ios-blue rounded" style={{ opacity: 0.7 }} />
            <span className="text-gray-600 dark:text-gray-400">Investments</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-ios-purple rounded" style={{ opacity: 0.7 }} />
            <span className="text-gray-600 dark:text-gray-400">Property</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-ios-red rounded" style={{ opacity: 0.7 }} />
            <span className="text-gray-600 dark:text-gray-400">Debt</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Horizontal stacked bar chart for budget breakdown
interface BudgetBreakdownItem {
  id: string;
  name: string;
  amount: number;
  category: 'necessity' | 'cost' | 'savings';
}

interface StackedBarProps {
  items: BudgetBreakdownItem[];
  totalIncome: number;
  height?: number;
}

export function BudgetStackedBar({ items, totalIncome, height = 32 }: StackedBarProps) {
  if (totalIncome <= 0 || items.length === 0) return null;

  // Sort by category then amount
  const sortedItems = [...items].sort((a, b) => {
    const categoryOrder = { necessity: 0, cost: 1, savings: 2 };
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    return b.amount - a.amount;
  });

  // Calculate percentages
  const itemsWithPercent = sortedItems.map((item) => ({
    ...item,
    percent: (item.amount / totalIncome) * 100,
  }));

  const totalPercent = itemsWithPercent.reduce((sum, item) => sum + item.percent, 0);
  const uncommittedPercent = Math.max(0, 100 - totalPercent);

  const categoryColors = {
    necessity: 'bg-ios-red',
    cost: 'bg-ios-orange',
    savings: 'bg-ios-green',
  };

  return (
    <div className="w-full">
      {/* Bar */}
      <div
        className="w-full rounded-full overflow-hidden flex"
        style={{ height }}
      >
        {itemsWithPercent.map((item, index) => (
          <div
            key={item.id}
            className={`${categoryColors[item.category]} transition-all relative group`}
            style={{
              width: `${item.percent}%`,
              opacity: 0.7 + (index % 3) * 0.1,
            }}
            title={`${item.name}: ${item.percent.toFixed(1)}%`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {item.name}: {item.percent.toFixed(1)}%
            </div>
          </div>
        ))}
        {uncommittedPercent > 0 && (
          <div
            className="bg-gray-300 dark:bg-gray-600 transition-all"
            style={{ width: `${uncommittedPercent}%` }}
            title={`Uncommitted: ${uncommittedPercent.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Summary below */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ios-red" />
            {itemsWithPercent
              .filter((i) => i.category === 'necessity')
              .reduce((sum, i) => sum + i.percent, 0)
              .toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ios-orange" />
            {itemsWithPercent
              .filter((i) => i.category === 'cost')
              .reduce((sum, i) => sum + i.percent, 0)
              .toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ios-green" />
            {itemsWithPercent
              .filter((i) => i.category === 'savings')
              .reduce((sum, i) => sum + i.percent, 0)
              .toFixed(0)}%
          </span>
        </div>
        {uncommittedPercent > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {uncommittedPercent.toFixed(0)}% free
          </span>
        )}
      </div>
    </div>
  );
}

// Simple progress ring for goals
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#34C759',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
