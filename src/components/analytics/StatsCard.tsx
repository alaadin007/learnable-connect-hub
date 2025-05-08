
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
  valueClassName?: string;
  loading?: boolean;
}

const StatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  className = '',
  valueClassName = '',
  loading = false,
}: StatsCardProps) => {
  const trendColorClass = trend && trend > 0 
    ? 'text-green-600' 
    : trend && trend < 0 
      ? 'text-red-600'
      : 'text-gray-500';
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className={`text-2xl font-bold ${valueClassName}`}>
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                value
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {(trend !== undefined || trendLabel) && (
              <div className="flex items-center text-xs">
                {trend !== undefined && (
                  <span className={`mr-1 ${trendColorClass}`}>
                    {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
                    {Math.abs(trend)}%
                  </span>
                )}
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-full">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
