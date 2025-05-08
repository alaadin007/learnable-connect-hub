
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudyTimeData } from './types';

// Format the name for display
const formatName = (name: string) => {
  if (name.length > 15) {
    return name.substring(0, 12) + '...';
  }
  return name;
};

interface StudyTimeChartProps {
  data: StudyTimeData[];
  title?: string;
  description?: string;
}

const StudyTimeChart: React.FC<StudyTimeChartProps> = ({
  data,
  title = 'Study Time by Student',
  description = 'Hours spent learning in the past week',
}) => {
  // Format data for the chart
  const chartData = data.map(item => ({
    name: formatName(item.studentName || item.name || item.student_name || 'Unknown'),
    hours: item.hours || (item.total_minutes ? item.total_minutes / 60 : 0),
    studentId: item.student_id || '',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 65,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Time Spent']}
                labelFormatter={(name) => `Student: ${name}`}
              />
              <Legend />
              <Bar dataKey="hours" name="Study Hours" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimeChart;
