import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  fetchAnalyticsSummary, 
  fetchSessionLogs,
  fetchTopics,
  fetchStudyTime,
  fetchSchoolPerformance,
  fetchTeacherPerformance,
  fetchStudentPerformance,
  getDateRangeText
} from "@/utils/analyticsUtils";
import { 
  AnalyticsFilters,
  TopicsChart,
  StudyTimeChart,
  SessionsTable,
  AnalyticsExport,
  AnalyticsSummaryCards
} from "@/components/analytics";
import { AnalyticsFilters as FiltersType, SessionData, TopicData, StudyTimeData, Student } from "@/components/analytics/types";
import { toast } from "sonner";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { StudentPerformanceTable } from "@/components/analytics/StudentPerformancePanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';

// Initial data for immediate display
const initialSummaryData = {
  activeStudents: 15,
  totalSessions: 42,
  totalQueries: 128,
  avgSessionMinutes: 18
};

const initialSessionData = [
  {
    id: 'session-1',
    student_name: 'John Doe',
    session_date: new Date().toISOString(),
    duration_minutes: 25,
    topics: ['Algebra'],
    topic: 'Algebra',
    questions_asked: 8,
  },
  {
    id: 'session-2',
    student_name: 'Jane Smith',
    session_date: new Date(Date.now() - 86400000).toISOString(),
    duration_minutes: 18,
    topics: ['Chemistry'],
    topic: 'Chemistry',
    questions_asked: 6,
  }
];

const initialTopicsData = [
  { topic: 'Algebra', count: 8, name: 'Algebra', value: 8 },
  { topic: 'Chemistry', count: 6, name: 'Chemistry', value: 6 },
  { topic: 'History', count: 10, name: 'History', value: 10 },
  { topic: 'Biology', count: 5, name: 'Biology', value: 5 }
];

const initialStudyTimeData = [
  { student_id: 'student-1', student_name: 'John Doe', total_minutes: 180, hours: 3 },
  { student_id: 'student-2', student_name: 'Jane Smith', total_minutes: 120, hours: 2 },
  { student_id: 'student-3', student_name: 'Mike Brown', total_minutes: 210, hours: 3.5 }
];

// Adapt initial data to match expected components format
const initialPerformanceData = {
  monthlyData: [
    { month: new Date().toISOString().split('T')[0], score: 85 },
    { month: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], score: 82 }
  ],
  summary: {
    averageScore: 83,
    trend: 'up',
    changePercentage: 3
  }
};

// Adapted teacher data format to match component expectations
const initialTeacherData = [
  { 
    id: 1,
    name: 'Ms. Johnson',
    students: 8,
    avgScore: 86,
    trend: 'up'
  },
  { 
    id: 2,
    name: 'Mr. Smith',
    students: 10,
    avgScore: 79,
    trend: 'down'
  }
];

// Adapted student data format to match component expectations
const initialStudentData = [
  {
    id: 'student-1',
    name: 'John Doe',
    assessments: 8,
    avgScore: 88,
    timeSpent: '20 min',
    completionRate: 87.5,
    strengths: ['Algebra', 'Geometry'],
    weaknesses: ['Calculus']
  },
  {
    id: 'student-2',
    name: 'Jane Smith',
    assessments: 7,
    avgScore: 92,
    timeSpent: '15 min',
    completionRate: 100,
    strengths: ['Chemistry', 'Biology'],
    weaknesses: ['Physics']
  }
];

const AdminAnalytics = () => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("engagement");
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  });
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Student 1' },
    { id: '2', name: 'Student 2' },
    { id: '3', name: 'Student 3' }
  ]);

  // Derive schoolId with memo to avoid unnecessary recalculation
  const schoolId = useMemo(() => {
    return profile?.organization?.id || 'test-school-id';
  }, [profile?.organization?.id]);
  
  // Update filters when schoolId changes
  useEffect(() => {
    if (schoolId) {
      setFilters(prevFilters => ({
        ...prevFilters,
        schoolId,
      }));
    }
  }, [schoolId]);

  // Fetch students data when schoolId is available
  useEffect(() => {
    if (schoolId) {
      const fetchStudents = async () => {
        try {
          // Get total count first
          const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
            
          if (countError) throw countError;
          
          // If too many students, limit the query
          const limit = count && count > 500 ? 50 : 500;
          
          // Fetch student profiles with name information
          const { data, error } = await supabase
            .from('students')
            .select('id, profiles(full_name)')
            .eq('school_id', schoolId)
            .limit(limit);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            const formattedStudents = data.map(student => ({
              id: student.id,
              name: student.profiles?.full_name || `Student ${student.id.substring(0, 4)}`
            }));
            setStudents(formattedStudents);
          }
        } catch (e) {
          console.error("Error fetching students:", e);
          // Keep using default students data on error
        }
      };
      
      fetchStudents();
    }
  }, [schoolId]);

  // Use React Query with optimized settings to reduce requests
  const { 
    data: summary = initialSummaryData,
    refetch: refetchSummary,
    isLoading: isSummaryLoading
  } = useQuery({
    queryKey: ['analytics-summary', schoolId, filters.dateRange],
    queryFn: () => fetchAnalyticsSummary(schoolId, filters),
    staleTime: 15 * 60 * 1000, // Consider data fresh for 15 minutes
    enabled: !!schoolId,
    initialData: initialSummaryData
  });

  // Optimized query for session logs
  const {
    data: sessions = initialSessionData,
    refetch: refetchSessions,
    isLoading: isSessionsLoading
  } = useQuery({
    queryKey: ['session-logs', schoolId, filters],
    queryFn: () => fetchSessionLogs(schoolId, filters),
    staleTime: 15 * 60 * 1000,
    enabled: !!schoolId && activeTab === "engagement",
    initialData: initialSessionData
  });

  // Optimized query for topics data
  const {
    data: topics = initialTopicsData,
    refetch: refetchTopics,
    isLoading: isTopicsLoading
  } = useQuery({
    queryKey: ['topics', schoolId, filters],
    queryFn: () => fetchTopics(schoolId, filters),
    staleTime: 20 * 60 * 1000,
    enabled: !!schoolId && activeTab === "engagement",
    initialData: initialTopicsData
  });

  // Optimized query for study time data
  const {
    data: studyTime = initialStudyTimeData,
    refetch: refetchStudyTime,
    isLoading: isStudyTimeLoading
  } = useQuery({
    queryKey: ['study-time', schoolId, filters],
    queryFn: () => fetchStudyTime(schoolId, filters),
    staleTime: 20 * 60 * 1000,
    enabled: !!schoolId && activeTab === "engagement",
    initialData: initialStudyTimeData
  });

  // Optimized query for school performance data
  const {
    data: schoolPerformanceData = initialPerformanceData,
    refetch: refetchSchoolPerformance,
    isLoading: isSchoolPerformanceLoading
  } = useQuery({
    queryKey: ['school-performance', schoolId, filters],
    queryFn: () => fetchSchoolPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialPerformanceData
  });

  // Optimized query for teacher performance data
  const {
    data: teacherPerformanceData = initialTeacherData,
    refetch: refetchTeacherPerformance,
    isLoading: isTeacherPerformanceLoading
  } = useQuery({
    queryKey: ['teacher-performance', schoolId, filters],
    queryFn: () => fetchTeacherPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialTeacherData
  });

  // Optimized query for student performance data
  const {
    data: studentPerformanceData = initialStudentData,
    refetch: refetchStudentPerformance,
    isLoading: isStudentPerformanceLoading
  } = useQuery({
    queryKey: ['student-performance', schoolId, filters],
    queryFn: () => fetchStudentPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialStudentData
  });

  // Optimized refresh function to only refetch data based on active tab
  const handleRefreshData = () => {
    refetchSummary();
    
    if (activeTab === "engagement") {
      refetchSessions();
      refetchTopics();
      refetchStudyTime();
      toast.success("Engagement metrics refreshed");
    } else if (activeTab === "performance") {
      refetchSchoolPerformance();
      refetchTeacherPerformance();
      refetchStudentPerformance();
      toast.success("Performance metrics refreshed");
    }
  };

  const handleFiltersChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const dateRangeText = useMemo(() => getDateRangeText(filters.dateRange), [filters.dateRange]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Admin Analytics</h1>
            <p className="text-learnable-gray">Track school-wide learning analytics and student progress</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>View analytics for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Name:</span>
                  <span className="text-foreground">{profile?.organization?.name || "Crescent School"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span className="text-foreground">{profile?.organization?.code || "CRES123"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mb-6">
            <AnalyticsFilters 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              showStudentSelector={true}
              showTeacherSelector={true}
              students={students}
            />
            <Button 
              onClick={handleRefreshData} 
              variant="outline" 
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="engagement">Engagement Metrics</TabsTrigger>
                <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="engagement" className="space-y-6 mt-6">
                <AnalyticsSummaryCards summary={summary} isLoading={isSummaryLoading} />
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold">Recent Learning Sessions</CardTitle>
                      <CardDescription>
                        Details of student learning sessions
                        {filters.dateRange && <span className="ml-2">({dateRangeText})</span>}
                      </CardDescription>
                    </div>
                    <AnalyticsExport 
                      summary={summary} 
                      sessions={sessions}
                      topics={topics}
                      studyTimes={studyTime}
                      dateRangeText={dateRangeText}
                    />
                  </CardHeader>
                  <CardContent>
                    <SessionsTable 
                      sessions={sessions} 
                      title="Recent Learning Sessions" 
                      description="Details of student learning sessions"
                      isLoading={isSessionsLoading}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopicsChart
                    data={topics}
                    title="Most Studied Topics"
                    description="Top 10 topics students are currently studying"
                    isLoading={isTopicsLoading}
                  />
                  <StudyTimeChart
                    data={studyTime}
                    title="Student Study Time"
                    description="Weekly study time per student"
                    isLoading={isStudyTimeLoading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6 mt-6">
                <SchoolPerformancePanel
                  monthlyData={schoolPerformanceData.monthlyData}
                  summary={schoolPerformanceData.summary}
                  isLoading={isSchoolPerformanceLoading}
                />
                <TeacherPerformanceTable
                  data={teacherPerformanceData}
                  isLoading={isTeacherPerformanceLoading}
                />
                <StudentPerformanceTable
                  data={studentPerformanceData}
                  isLoading={isStudentPerformanceLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
