
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPerformanceTable } from "./StudentPerformanceTable";
import { StudentPerformanceMetric } from './types';
import { getStudentPerformanceMetrics } from '@/utils/supabaseHelpers';

export function StudentPerformancePanel() {
  const { user, userRole, profile, schoolId } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>("table");
  const [students, setStudents] = useState<StudentPerformanceMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentPerformance() {
      try {
        if (!schoolId) {
          console.error("No school ID found");
          setStudents([]);
          return;
        }
        
        const performanceData = await getStudentPerformanceMetrics(schoolId);
        
        // Transform the data to match our StudentPerformanceMetric type
        const formattedData: StudentPerformanceMetric[] = performanceData.map(item => ({
          student_id: item.student_id || '',
          student_name: item.student_name || 'Unknown Student',
          avg_score: Number(item.avg_score) || 0,
          assessments_taken: Number(item.assessments_taken) || 0,
          completion_rate: Number(item.completion_rate) || 0,
          avg_time_spent_seconds: Number(item.avg_time_spent_seconds) || 0,
          top_strengths: item.top_strengths || '',
          top_weaknesses: item.top_weaknesses || '',
          last_active: null
        }));
        
        setStudents(formattedData);
      } catch (err: any) {
        console.error("Error fetching student performance:", err);
        setError(err.message || "Failed to load student performance data");
        setStudents([]);
      }
    }

    fetchStudentPerformance();
  }, [schoolId]);

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Student Performance
        </CardTitle>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center text-destructive p-4">{error}</div>
        ) : (
          <>
            <TabsContent value="table" className="mt-0">
              <StudentPerformanceTable students={students} />
            </TabsContent>
            <TabsContent value="chart" className="mt-0">
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Student performance charts will be available soon.
              </div>
            </TabsContent>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default StudentPerformancePanel;
