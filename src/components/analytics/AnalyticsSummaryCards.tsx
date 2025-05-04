
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, MessageSquare, BarChart } from "lucide-react";
import { AnalyticsSummary } from "./types";
import { DateRange } from "react-day-picker";
import { getDateRangeText } from "@/utils/analyticsUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
  isLoading: boolean;
  dateRange?: DateRange;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  summary,
  isLoading,
  dateRange
}) => {
  const dateRangeText = dateRange ? getDateRangeText(dateRange) : "";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Students</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{summary.activeStudents}</p>
              )}
              {dateRangeText && (
                <p className="text-xs text-muted-foreground mt-1">{dateRangeText}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{summary.totalSessions}</p>
              )}
              {dateRangeText && (
                <p className="text-xs text-muted-foreground mt-1">{dateRangeText}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <BarChart className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{summary.totalQueries}</p>
              )}
              {dateRangeText && (
                <p className="text-xs text-muted-foreground mt-1">{dateRangeText}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Session Time</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{summary.avgSessionMinutes} min</p>
              )}
              {dateRangeText && (
                <p className="text-xs text-muted-foreground mt-1">{dateRangeText}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
