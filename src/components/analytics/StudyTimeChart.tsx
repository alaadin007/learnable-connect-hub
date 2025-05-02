
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface StudyTimeChartProps {
  data: StudyTimeData[];
  title?: string;
  description?: string;
}

const StudyTimeChart = ({ 
  data, 
  title = "Weekly Study Time", 
  description = "Hours studied per student this week" 
}: StudyTimeChartProps) => {
  // Prepare data for chart
  const chartData = data.map(item => ({
    name: item.studentName || item.name || `Week ${item.week}`,
    hours: item.hours || 0
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
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
                <ChartTooltip 
                  content={(props) => (
                    <ChartTooltipContent 
                      {...props} 
                      formatter={(value) => [`${value} hours`, 'Study Time']} 
                    />
                  )}
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

export default StudyTimeChart;
