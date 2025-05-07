import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopicData } from "./types";
import { ChartContainer } from "@/components/ui/chart";

interface TopicsChartProps {
  data: TopicData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300', '#4CAF50', '#9C27B0', '#3F51B5'];
const RADIAN = Math.PI / 180;

const TopicsChart = ({ 
  data, 
  title = "Most Studied Topics", 
  description = "Distribution of topics studied by students",
  isLoading = false 
}: TopicsChartProps) => {
  // Prepare data for chart - only if we have data
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      name: item.topic || item.name || "Unknown",
      value: item.count || item.value || 0
    }));
  }, [data]);

  // Custom label renderer for the pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: PieLabelRenderProps) => {
    const cxNum = typeof cx === 'number' ? cx : parseFloat(cx || '0');
    const cyNum = typeof cy === 'number' ? cy : parseFloat(cy || '0');
    const innerRadiusNum = typeof innerRadius === 'number' ? innerRadius : parseFloat(innerRadius || '0');
    const outerRadiusNum = typeof outerRadius === 'number' ? outerRadius : parseFloat(outerRadius || '0');
    const radius = innerRadiusNum + (outerRadiusNum - innerRadiusNum) * 0.5;
    const x = cxNum + radius * Math.cos(-midAngle * RADIAN);
    const y = cyNum + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null; // Don't show labels for very small segments
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cxNum ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
                // Define color themes for our data
                ...Object.fromEntries(
                  chartData.map((entry, index) => [
                    entry.name,
                    { color: COLORS[index % COLORS.length] }
                  ])
                ),
              }}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} sessions`, 'Count']} />
                <Legend />
              </PieChart>
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

export default React.memo(TopicsChart);
