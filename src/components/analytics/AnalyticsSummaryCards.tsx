
import React from "react";
import StatsCard from "./StatsCard";
import { BarChart, MessageSquare, Clock, Users } from "lucide-react";

interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
  isLoading?: boolean;
}

export function AnalyticsSummaryCards({ summary, isLoading }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Active Students"
        value={summary.activeStudents}
        description="Students engaged with the platform"
        icon={<Users size={24} />}
      />
      
      <StatsCard
        title="Total Sessions"
        value={summary.totalSessions}
        description="Learning sessions conducted"
        icon={<BarChart size={24} />}
      />
      
      <StatsCard
        title="Total Queries"
        value={summary.totalQueries}
        description="Questions asked by students"
        icon={<MessageSquare size={24} />}
      />
      
      <StatsCard
        title="Avg Session Length"
        value={`${summary.avgSessionMinutes.toFixed(1)} min`}
        description="Average duration per session"
        icon={<Clock size={24} />}
      />
    </div>
  );
}
