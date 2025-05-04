
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StudyTimeData } from "./types";
import { Loader2 } from "lucide-react";

interface StudyTimeChartProps {
  data: StudyTimeData[];
  title: string;
  description: string;
  isLoading?: boolean;
}

const StudyTimeChart: React.FC<StudyTimeChartProps> = ({
  data,
  title,
  description,
  isLoading = false
}) => {
  // Prepare data for the chart
  const chartData = data.map((item) => ({
    name: item.student_name,
    hours: item.total_minutes / 60
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex justify-center items-center h-80 text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={70} 
                />
                <YAxis 
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" name="Study Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyTimeChart;
