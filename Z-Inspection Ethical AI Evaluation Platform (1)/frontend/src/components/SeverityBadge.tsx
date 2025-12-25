import React from 'react';
import { TensionSeverity } from '../types';
import { getSeverityColor } from '../utils/helpers';

interface SeverityBadgeProps {
  severity: TensionSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function SeverityBadge({ severity, size = 'md', showLabel = false }: SeverityBadgeProps) {
  const colors = getSeverityColor(severity);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (showLabel) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
        <span className={`${sizeClasses[size]} rounded-full ${colors.badge} mr-1.5`} />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  }

  return (
    <span
      className={`inline-block ${sizeClasses[size]} rounded-full ${colors.badge}`}
      title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} severity`}
    />
  );
}
