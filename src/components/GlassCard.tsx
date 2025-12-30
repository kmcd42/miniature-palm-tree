'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'wide' | 'tall' | 'large';
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  variant = 'default',
}: GlassCardProps) {
  const variantClasses = {
    default: '',
    wide: 'bento-wide',
    tall: 'bento-tall',
    large: 'bento-large',
  };

  return (
    <div
      className={`glass-card ${onClick ? 'glass-card-interactive cursor-pointer' : ''} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Subcomponents for consistent card layouts
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-base text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardValue({
  value,
  label,
  trend,
  size = 'large',
}: {
  value: string;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  const trendColors = {
    up: 'text-money-green',
    down: 'text-money-red',
    neutral: 'text-gray-500',
  };

  return (
    <div>
      <p className={`font-bold money-display-large ${sizeClasses[size]} ${trend ? trendColors[trend] : 'text-gray-900'}`}>
        {value}
      </p>
      {label && (
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      )}
    </div>
  );
}

export function ProgressBar({
  progress,
  color = 'primary',
  showLabel = false,
}: {
  progress: number; // 0-100
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const colorClasses = {
    primary: 'bg-ios-blue',
    success: 'bg-money-green',
    warning: 'bg-ios-orange',
    danger: 'bg-money-red',
  };

  return (
    <div className="w-full">
      <div className="progress-bar">
        <div
          className={`progress-bar-fill ${colorClasses[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">
          {clampedProgress.toFixed(0)}%
        </p>
      )}
    </div>
  );
}

export function CategoryBadge({
  category,
}: {
  category: 'necessity' | 'cost' | 'savings';
}) {
  const labels = {
    necessity: 'Necessity',
    cost: 'Cost',
    savings: 'Savings',
  };

  return (
    <span className={`badge-${category} px-2 py-1 rounded-full text-xs font-medium`}>
      {labels[category]}
    </span>
  );
}
