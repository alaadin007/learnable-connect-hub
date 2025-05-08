// This file has multiple type errors - we need to fix the table name and property references
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPerformanceTable } from "./StudentPerformanceTable";
import { Loader2 } from 'lucide-react';

// Define the correct type for student metrics
interface StudentPerformanceMetric {
  student_id: string;
  student_name: string;
  avg_score: number;
  assessments_taken: number;
  completion_rate: number;
  avg_time_spent_seconds?: number;
  top_strengths?: string;
  top_weaknesses?: string;
  last_active?: string;
}

export function StudentPerformancePanel() {
  const { user, userRole, profile } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>("table");
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<StudentPerformanceMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentPerformance() {
      setLoading(true);
      
      try {
        // Use the correct table name - student_performance_metrics
        const { data, error } = await supabase
          .from("student_performance_metrics")
          .select("*");

        if (error) throw error;

        if (data) {
          setStudents(data as StudentPerformanceMetric[]);
        }
      } catch (err: any) {
        console.error("Error fetching student performance:", err);
        setError(err.message || "Failed to load student performance data");
      } finally {
        setLoading(false);
      }
    }

    fetchStudentPerformance();
  }, []);

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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-4">{error}</div>
        ) : (
          <TabsContent value="table" className="mt-0">
            <StudentPerformanceTable students={students} />
          </TabsContent>
        )}
        <TabsContent value="chart" className="mt-0">
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Student performance charts will be available soon.
          </div>
        </TabsContent>
      </CardContent>
    </Card>
  );
}

export default StudentPerformancePanel;
