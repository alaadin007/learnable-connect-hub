
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

const AdminAnalytics = () => {
  const { profile, schoolId: authSchoolId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("engagement");
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    schoolId: "", 
  });
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Student 1' },
    { id: '2', name: 'Student 2' },
    { id: '3', name: 'Student 3' }
  ]);

  // Attempt to fetch real students data in background
  useEffect(() => {
    if (schoolId) {
      supabase
        .from('students')
        .select('id, profiles:profiles(full_name)')
        .eq('school_id', schoolId)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const formattedStudents = data.map(student => ({
              id: student.id,
              name: student.profiles?.full_name || `Student ${student.id.substring(0, 4)}`
            }));
            setStudents(formattedStudents);
          }
        });
    }
  }, [schoolId]);

  // Derive schoolId with memo
  const schoolId = useMemo(() => {
    return authSchoolId || profile?.organization?.id || 'test';
  }, [authSchoolId, profile?.organization?.id]);
  
  // Update filters when schoolId changes
  useEffect(() => {
    if (schoolId) {
      setFilters(prevFilters => ({
        ...prevFilters,
        schoolId,
      }));
    }
  }, [schoolId]);

  // Use React Query for analytics summary data - start with initial data
  const { 
    data: summary = initialSummaryData,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['analytics-summary', schoolId, filters.dateRange],
    queryFn: () => fetchAnalyticsSummary(schoolId, filters),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!schoolId,
    initialData: initialSummaryData
  });

  // Use React Query for session logs - start with initial data
  const {
    data: sessions = initialSessionData,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['session-logs', schoolId, filters],
    queryFn: () => fetchSessionLogs(schoolId, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId,
    initialData: initialSessionData
  });

  // Use React Query for topics data - start with initial data
  const {
    data: topics = initialTopicsData,
    refetch: refetchTopics
  } = useQuery({
    queryKey: ['topics', schoolId, filters],
    queryFn: () => fetchTopics(schoolId, filters),
    staleTime: 10 * 60 * 1000,
    enabled: !!schoolId,
    initialData: initialTopicsData
  });

  // Use React Query for study time data - start with initial data
  const {
    data: studyTime = initialStudyTimeData,
    refetch: refetchStudyTime
  } = useQuery({
    queryKey: ['study-time', schoolId, filters],
    queryFn: () => fetchStudyTime(schoolId, filters),
    staleTime: 10 * 60 * 1000,
    enabled: !!schoolId,
    initialData: initialStudyTimeData
  });

  // Initial performance data
  const initialPerformanceData = {
    monthlyData: [
      { month: new Date().toISOString().split('T')[0], avg_monthly_score: 85, monthly_completion_rate: 78 },
      { month: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], avg_monthly_score: 82, monthly_completion_rate: 75 }
    ],
    summary: {
      school_id: schoolId,
      school_name: profile?.organization?.name || 'Test School',
      total_assessments: 24,
      students_with_submissions: 12,
      total_students: 15,
      avg_submissions_per_assessment: 3.5,
      avg_score: 83,
      completion_rate: 78,
      student_participation_rate: 80
    }
  };

  // Initial teacher performance data
  const initialTeacherData = [
    { 
      teacher_id: 'teacher-1',
      teacher_name: 'Ms. Johnson',
      assessments_created: 12,
      students_assessed: 8,
      avg_submissions_per_assessment: 4.2,
      avg_student_score: 86,
      completion_rate: 82
    },
    { 
      teacher_id: 'teacher-2',
      teacher_name: 'Mr. Smith',
      assessments_created: 8,
      students_assessed: 10,
      avg_submissions_per_assessment: 3.8,
      avg_student_score: 79,
      completion_rate: 75
    }
  ];

  // Initial student performance data
  const initialStudentData = [
    {
      student_id: 'student-1',
      student_name: 'John Doe',
      assessments_taken: 8,
      avg_score: 88,
      avg_time_spent_seconds: 1200,
      assessments_completed: 7,
      completion_rate: 87.5,
      top_strengths: 'Algebra, Geometry',
      top_weaknesses: 'Calculus'
    },
    {
      student_id: 'student-2',
      student_name: 'Jane Smith',
      assessments_taken: 7,
      avg_score: 92,
      avg_time_spent_seconds: 950,
      assessments_completed: 7,
      completion_rate: 100,
      top_strengths: 'Chemistry, Biology',
      top_weaknesses: 'Physics'
    }
  ];

  // Use React Query for performance data - load only when needed
  const {
    data: schoolPerformanceData = initialPerformanceData,
    refetch: refetchSchoolPerformance
  } = useQuery({
    queryKey: ['school-performance', schoolId, filters],
    queryFn: () => fetchSchoolPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialPerformanceData
  });

  // Use React Query for teacher performance data - load only when needed
  const {
    data: teacherPerformanceData = initialTeacherData,
    refetch: refetchTeacherPerformance
  } = useQuery({
    queryKey: ['teacher-performance', schoolId, filters],
    queryFn: () => fetchTeacherPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialTeacherData
  });

  // Use React Query for student performance data - load only when needed
  const {
    data: studentPerformanceData = initialStudentData,
    refetch: refetchStudentPerformance
  } = useQuery({
    queryKey: ['student-performance', schoolId, filters],
    queryFn: () => fetchStudentPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000,
    enabled: !!schoolId && activeTab === "performance",
    initialData: initialStudentData
  });

  const handleRefreshData = () => {
    refetchSummary();
    refetchSessions();
    refetchTopics();
    refetchStudyTime();
    
    if (activeTab === "performance") {
      refetchSchoolPerformance();
      refetchTeacherPerformance();
      refetchStudentPerformance();
    }
    
    toast.success("Analytics data refreshed");
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
                  <span className="text-foreground">{profile?.organization?.name || "Test School"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span className="text-foreground">{profile?.organization?.code || "TEST123"}</span>
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
                <AnalyticsSummaryCards summary={summary} isLoading={false} />
                
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
                      isLoading={false}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopicsChart
                    data={topics}
                    title="Most Studied Topics"
                    description="Top 10 topics students are currently studying"
                    isLoading={false}
                  />
                  <StudyTimeChart
                    data={studyTime}
                    title="Student Study Time"
                    description="Weekly study time per student"
                    isLoading={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6 mt-6">
                <SchoolPerformancePanel
                  monthlyData={schoolPerformanceData.monthlyData}
                  summary={schoolPerformanceData.summary}
                  isLoading={false}
                />
                <TeacherPerformanceTable
                  data={teacherPerformanceData}
                  isLoading={false}
                />
                <StudentPerformanceTable
                  data={studentPerformanceData}
                  isLoading={false}
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
