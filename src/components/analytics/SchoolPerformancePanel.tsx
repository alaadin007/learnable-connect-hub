
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SchoolPerformancePanelProps {
  monthlyData: any[];
  summary: {
    averageScore: number;
    trend: string;
    changePercentage: number;
  } | null;
  isLoading?: boolean;
}

export const SchoolPerformancePanel: React.FC<SchoolPerformancePanelProps> = ({
  monthlyData,
  summary
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>School Performance Overview</CardTitle>
        <CardDescription>Academic performance metrics over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground">Average Score</div>
                  <div className="text-3xl font-bold">{summary.averageScore}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground">Trend</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold">
                      {summary.trend === 'up' ? 'Improving' : 
                       summary.trend === 'down' ? 'Declining' : 'Stable'}
                    </div>
                    {summary.trend === 'up' ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : summary.trend === 'down' ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground">Change</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold">{summary.changePercentage}%</div>
                    <Badge variant={summary.trend === 'up' ? "default" : "destructive"}>
                      {summary.trend === 'up' ? '+' : ''}
                      {summary.changePercentage}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Avg Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
