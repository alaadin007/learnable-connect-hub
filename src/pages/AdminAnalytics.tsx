
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
  const [students, setStudents] = useState<Student[]>([]);

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

  // Fetch students - mock implementation
  useEffect(() => {
    const mockStudents = [
      { id: '1', name: 'Student 1' },
      { id: '2', name: 'Student 2' },
      { id: '3', name: 'Student 3' },
    ];
    setStudents(mockStudents);
  }, []);

  // Use React Query for analytics summary data - optimized with caching
  const { 
    data: summary,
    isLoading: loadingSummary,
    isError: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['analytics-summary', schoolId, filters.dateRange],
    queryFn: () => fetchAnalyticsSummary(schoolId, filters),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!schoolId,
    initialData: {
      activeStudents: 15,
      totalSessions: 42,
      totalQueries: 128,
      avgSessionMinutes: 18,
    }
  });

  // Use React Query for session logs - optimized with caching
  const {
    data: sessions = [],
    isLoading: loadingSessions,
    isError: sessionsError,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['session-logs', schoolId, filters],
    queryFn: () => fetchSessionLogs(schoolId, filters),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!schoolId
  });

  // Use React Query for topics data - optimized with caching
  const {
    data: topics = [],
    isLoading: loadingTopics,
    isError: topicsError,
    refetch: refetchTopics
  } = useQuery({
    queryKey: ['topics', schoolId, filters],
    queryFn: () => fetchTopics(schoolId, filters),
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    enabled: !!schoolId
  });

  // Use React Query for study time data - optimized with caching
  const {
    data: studyTime = [],
    isLoading: loadingStudyTime,
    isError: studyTimeError,
    refetch: refetchStudyTime
  } = useQuery({
    queryKey: ['study-time', schoolId, filters],
    queryFn: () => fetchStudyTime(schoolId, filters),
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    enabled: !!schoolId
  });

  // Use React Query for performance data - load only when needed
  const {
    data: schoolPerformanceData = { monthlyData: [], summary: null },
    isLoading: loadingSchoolPerformance,
    isError: schoolPerformanceError,
    refetch: refetchSchoolPerformance
  } = useQuery({
    queryKey: ['school-performance', schoolId, filters],
    queryFn: () => fetchSchoolPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    enabled: !!schoolId && activeTab === "performance" // Only load when on performance tab
  });

  // Use React Query for teacher performance data - load only when needed
  const {
    data: teacherPerformanceData = [],
    isLoading: loadingTeacherPerformance,
    isError: teacherPerformanceError,
    refetch: refetchTeacherPerformance
  } = useQuery({
    queryKey: ['teacher-performance', schoolId, filters],
    queryFn: () => fetchTeacherPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    enabled: !!schoolId && activeTab === "performance" // Only load when on performance tab
  });

  // Use React Query for student performance data - load only when needed
  const {
    data: studentPerformanceData = [],
    isLoading: loadingStudentPerformance,
    isError: studentPerformanceError,
    refetch: refetchStudentPerformance
  } = useQuery({
    queryKey: ['student-performance', schoolId, filters],
    queryFn: () => fetchStudentPerformance(schoolId, filters),
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    enabled: !!schoolId && activeTab === "performance" // Only load when on performance tab
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

  // Check if there's any error or loading state for the active tab
  const isLoading = activeTab === "engagement" 
    ? loadingSummary || loadingSessions || loadingTopics || loadingStudyTime
    : loadingSchoolPerformance || loadingTeacherPerformance || loadingStudentPerformance;

  const hasError = activeTab === "engagement"
    ? summaryError || sessionsError || topicsError || studyTimeError
    : schoolPerformanceError || teacherPerformanceError || studentPerformanceError;

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
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {hasError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>
                Failed to load analytics data. Using default data instead.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="engagement">Engagement Metrics</TabsTrigger>
                <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="engagement" className="space-y-6 mt-6">
                <AnalyticsSummaryCards summary={summary} isLoading={loadingSummary} />
                
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
                      isLoading={loadingSessions}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopicsChart
                    data={topics}
                    title="Most Studied Topics"
                    description="Top 10 topics students are currently studying"
                    isLoading={loadingTopics}
                  />
                  <StudyTimeChart
                    data={studyTime}
                    title="Student Study Time"
                    description="Weekly study time per student"
                    isLoading={loadingStudyTime}
                  />
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6 mt-6">
                <SchoolPerformancePanel
                  monthlyData={schoolPerformanceData.monthlyData}
                  summary={schoolPerformanceData.summary}
                  isLoading={loadingSchoolPerformance}
                />
                <TeacherPerformanceTable
                  data={teacherPerformanceData}
                  isLoading={loadingTeacherPerformance}
                />
                <StudentPerformanceTable
                  data={studentPerformanceData}
                  isLoading={loadingStudentPerformance}
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
