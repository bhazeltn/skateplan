'use client';

import { ReactNode } from 'react';

interface QuickStatsCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function QuickStatsCard({ title, value, icon, trend, subtitle }: QuickStatsCardProps) {
  const getTrendColor = () => {
    if (!trend) return '';
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-foreground">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${getTrendColor()}`}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && <div className="ml-4 flex-shrink-0 text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}
