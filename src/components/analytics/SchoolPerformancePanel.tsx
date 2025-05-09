
import React from 'react';
import { Card } from "@/components/ui/card";
import { SchoolPerformanceData, SchoolPerformanceSummary } from './types';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface SchoolPerformancePanelProps {
  data: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary;
  isLoading?: boolean;
}

export function SchoolPerformancePanel({ data, summary, isLoading = false }: SchoolPerformancePanelProps) {
  // Format data for chart display
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      month: item.month ? format(parseISO(item.month), 'MMM yyyy') : '',
      avg_monthly_score: Number(item.avg_monthly_score || 0).toFixed(1),
      monthly_completion_rate: Number(item.monthly_completion_rate || 0).toFixed(1),
      score_improvement_rate: Number(item.score_improvement_rate || 0).toFixed(1),
      completion_improvement_rate: Number(item.completion_improvement_rate || 0).toFixed(1),
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm font-medium text-muted-foreground">Total Assessments</div>
              <div className="text-2xl font-bold mt-1">{summary.total_assessments}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.avg_submissions_per_assessment.toFixed(1)} submissions per assessment
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-muted-foreground">Student Participation</div>
              <div className="text-2xl font-bold mt-1">{summary.student_participation_rate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.students_with_submissions} of {summary.total_students} students
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-muted-foreground">Average Score</div>
              <div className="text-2xl font-bold mt-1">{summary.avg_score.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.improvement_rate ? `${summary.improvement_rate.toFixed(1)}% improvement` : 'No change'}
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-muted-foreground">Completion Rate</div>
              <div className="text-2xl font-bold mt-1">{summary.completion_rate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Assessments completed by students
              </div>
            </Card>
          </div>
          
          <div className="h-[400px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="avg_monthly_score" 
                  name="Average Score (%)" 
                  fill="#8884d8" 
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="monthly_completion_rate" 
                  name="Completion Rate (%)" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
