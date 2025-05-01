
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StudyData {
  name: string;
  hours: number;
}

interface StudyTimeChartProps {
  data: StudyData[];
  title?: string;
  description?: string;
}

const StudyTimeChart = ({ data, title = "Weekly Study Time", description = "Hours studied per student this week" }: StudyTimeChartProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => [`${value} hours`, 'Study Time']} />
              <Legend />
              <Bar dataKey="hours" name="Study Hours" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimeChart;
