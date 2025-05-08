
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SchoolPerformanceData {
  month: string;
  avg_monthly_score: number;
  monthly_completion_rate: number;
  score_improvement_rate: number;
  completion_improvement_rate: number;
}

interface SchoolPerformanceSummary {
  total_assessments: number;
  students_with_submissions: number;
  total_students: number;
  avg_submissions_per_assessment: number;
  avg_score: number;
  completion_rate: number;
  student_participation_rate: number;
}

interface SchoolPerformancePanelProps {
  monthlyData: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary | null;
  isLoading: boolean;
}

export function SchoolPerformancePanel({ 
  monthlyData, 
  summary,
  isLoading 
}: SchoolPerformancePanelProps) {
  
  // Format data for charts
  const formattedMonthlyData = monthlyData.map(data => ({
    ...data,
    month: format(new Date(data.month), 'MMM yyyy'),
  }));
  
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>School Performance Metrics</CardTitle>
        <CardDescription>
          Track assessment scores and completion rates over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard 
                title="Avg Score"
                value={summary?.avg_score || 0}
                suffix="%"
                description="Average assessment score"
              />
              <MetricCard 
                title="Completion Rate"
                value={summary?.completion_rate || 0}
                suffix="%"
                description="Assessment completion rate" 
              />
              <MetricCard 
                title="Participation"
                value={summary?.student_participation_rate || 0} 
                suffix="%"
                description="Students participating" 
              />
              <MetricCard 
                title="Assessment Submissions"
                value={summary?.avg_submissions_per_assessment || 0} 
                description="Average per assessment" 
              />
            </div>

            <Tabs defaultValue="scores" className="w-full">
              <TabsList>
                <TabsTrigger value="scores">Score Trends</TabsTrigger>
                <TabsTrigger value="completion">Completion Rates</TabsTrigger>
                <TabsTrigger value="improvement">Improvement Rates</TabsTrigger>
              </TabsList>
              <TabsContent value="scores" className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avg_monthly_score" 
                      name="Average Score" 
                      stroke="#4f46e5" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="completion" className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="monthly_completion_rate" 
                      name="Completion Rate" 
                      stroke="#10b981" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="improvement" className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="score_improvement_rate" 
                      name="Score Improvement %" 
                      fill="#4f46e5" 
                    />
                    <Bar 
                      dataKey="completion_improvement_rate" 
                      name="Completion Improvement %" 
                      fill="#10b981" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  description: string;
  improvement?: number;
}

function MetricCard({ title, value, suffix = "", description, improvement }: MetricCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="flex items-baseline mt-1">
        <span className="text-2xl font-semibold">
          {value.toLocaleString()}
          {suffix}
        </span>
        {improvement && (
          <span className={`ml-2 flex items-center text-sm font-medium ${
            improvement > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {improvement > 0 ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            )}
            {Math.abs(improvement)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
