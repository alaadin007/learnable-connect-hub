
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, MessageSquare, Activity } from "lucide-react";
import { AnalyticsSummary } from './types';
import { DateRange } from 'react-day-picker';

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
  isLoading: boolean;
  dateRange: DateRange | undefined;
}

export function AnalyticsSummaryCards({ summary, isLoading, dateRange }: AnalyticsSummaryCardsProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getDateRangeText = () => {
    if (!dateRange?.from) return 'All time';
    
    const from = formatDate(dateRange.from);
    const to = dateRange.to ? formatDate(dateRange.to) : 'Present';
    
    return `${from} - ${to}`;
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Data for period: {getDateRangeText()}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Active Students"
          value={summary.activeStudents.toString()}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          color="blue"
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Total Sessions"
          value={summary.totalSessions.toString()}
          icon={<Activity className="h-5 w-5 text-green-500" />}
          color="green"
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Total Queries"
          value={summary.totalQueries.toString()}
          icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
          color="purple"
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Avg Session"
          value={`${summary.avgSessionMinutes.toFixed(1)} mins`}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          color="amber"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
  isLoading: boolean;
}

function SummaryCard({ title, value, icon, color, isLoading }: SummaryCardProps) {
  const bgColor = `bg-${color}-50`;
  const borderColor = `border-${color}-100`;
  
  return (
    <Card className={`${bgColor} border ${borderColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{isLoading ? '...' : value}</p>
          </div>
          <div>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
