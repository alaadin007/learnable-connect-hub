
import React from "react";
import StatsCard from "./StatsCard";
import { Activity, MessageSquare, Clock, LayoutGrid } from "lucide-react";
import { AnalyticsSummary } from "./types";

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
  isLoading: boolean;
}

export function AnalyticsSummaryCards({ summary, isLoading }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Active Students"
        value={summary.activeStudents}
        description="Students engaged with the platform"
        icon={<Activity className="h-6 w-6 text-blue-500" />}
        isLoading={isLoading}
      />
      
      <StatsCard
        title="Total Sessions"
        value={summary.totalSessions}
        description="Learning sessions conducted"
        icon={<LayoutGrid className="h-6 w-6 text-green-500" />}
        isLoading={isLoading}
      />
      
      <StatsCard
        title="Total Queries"
        value={summary.totalQueries}
        description="Questions asked by students"
        icon={<MessageSquare className="h-6 w-6 text-purple-500" />}
        isLoading={isLoading}
      />
      
      <StatsCard
        title="Avg Session Length"
        value={`${summary.avgSessionMinutes.toFixed(1)} min`}
        description="Average duration per session"
        icon={<Clock className="h-6 w-6 text-orange-500" />}
        isLoading={isLoading}
      />
    </div>
  );
}
