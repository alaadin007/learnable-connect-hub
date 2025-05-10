
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyTimeData } from "./types";
import { ChartContainer } from "@/components/ui/chart";

interface StudyTimeChartProps {
  data: StudyTimeData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const StudyTimeChart = ({ 
  data, 
  title = "Weekly Study Time", 
  description = "Hours studied per student this week",
  isLoading = false 
}: StudyTimeChartProps) => {
  // Prepare data for chart - only if we have data
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      name: item.student_name || item.name || `Student ${item.student_id || ""}`,
      hours: item.total_minutes ? (item.total_minutes / 60) : (item.hours || 0)
    }));
  }, [data]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer 
              config={{
                hours: { color: "#3b82f6" } // Blue color for bars
              }}
            >
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} hours`, 'Study Time']}
                />
                <Legend />
                <Bar dataKey="hours" name="Study Hours" fill="var(--color-hours)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(StudyTimeChart);
