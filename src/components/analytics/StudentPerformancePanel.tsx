import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange, StudentPerformanceData } from '@/components/analytics/types';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export interface StudentPerformancePanelProps {
  schoolId: string;
  selectedStudentId?: string | null;
  dateRange: DateRange;
}

const StudentPerformancePanel: React.FC<StudentPerformancePanelProps> = ({
  schoolId,
  selectedStudentId,
  dateRange
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<StudentPerformanceData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("scores");

  useEffect(() => {
    const fetchStudentPerformance = async () => {
      if (!schoolId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
        const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
        
        let query = supabase
          .from('student_performance')
          .select('*')
          .eq('school_id', schoolId);
          
        if (selectedStudentId) {
          query = query.eq('id', selectedStudentId);
        }
        
        if (startDate) {
          query = query.gte('last_active', startDate);
        }
        
        if (endDate) {
          query = query.lte('last_active', endDate);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data) {
          setPerformanceData(data.map(item => ({
            id: item.id,
            name: item.name,
            avg_score: item.average_score || item.avg_score || 0,
            average_score: item.average_score || item.avg_score || 0,
            assessments_taken: item.assessments_taken || 0,
            completion_rate: item.completion_rate || 0,
            last_active: item.last_active
          })));
        }
      } catch (error) {
        console.error("Error fetching student performance:", error);
        setError("Failed to load student performance data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentPerformance();
  }, [schoolId, selectedStudentId, dateRange]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // If we're in development mode, generate mock data
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && performanceData.length === 0) {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: `student-${i + 1}`,
        name: `Student ${i + 1}`,
        avg_score: Math.floor(Math.random() * 40) + 60,
        average_score: Math.floor(Math.random() * 40) + 60,
        assessments_taken: Math.floor(Math.random() * 20) + 5,
        completion_rate: Math.floor(Math.random() * 50) + 50,
        last_active: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      setPerformanceData(mockData);
      setIsLoading(false);
    }
  }, [performanceData.length]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-learnable-blue"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p className="font-medium">Error loading performance data</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  if (performanceData.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md">
        <p className="font-medium">No performance data available</p>
        <p className="text-sm">There is no assessment data for the selected criteria.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="scores">Assessment Scores</TabsTrigger>
          <TabsTrigger value="completion">Completion Rates</TabsTrigger>
          <TabsTrigger value="activity">Activity Levels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Average Assessment Scores</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                  <Legend />
                  <Bar 
                    dataKey="avg_score" 
                    name="Average Score (%)" 
                    fill="#8884d8" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Assessment Completion Rates</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                  <Legend />
                  <Bar 
                    dataKey="completion_rate" 
                    name="Completion Rate (%)" 
                    fill="#82ca9d" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Assessments Taken</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="assessments_taken" 
                    name="Assessments Taken" 
                    fill="#ff8042" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {selectedStudentId && performanceData.length === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-medium">{performanceData[0].name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="font-medium">{performanceData[0].avg_score}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assessments Taken</p>
                <p className="font-medium">{performanceData[0].assessments_taken}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="font-medium">{performanceData[0].completion_rate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Active</p>
                <p className="font-medium">
                  {performanceData[0].last_active ? 
                    format(new Date(performanceData[0].last_active), 'MMM d, yyyy') : 
                    'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentPerformancePanel;
