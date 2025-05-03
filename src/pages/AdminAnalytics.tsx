import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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

const AdminAnalytics = () => {
  const { profile, schoolId: authSchoolId } = useAuth();

  // Explicitly typing states
  const [summary, setSummary] = useState<{
    activeStudents: number;
    totalSessions: number;
    totalQueries: number;
    avgSessionMinutes: number;
  } | null>(null);

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    schoolId: "", // Initialize schoolId in filters
  });
  const [activeTab, setActiveTab] = useState<string>("engagement");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [dataError, setDataError] = useState<boolean>(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);

  // Performance metrics state
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<any[]>([]);
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState<any>(null);
  const [teacherPerformanceData, setTeacherPerformanceData] = useState<any[]>([]);
  const [studentPerformanceData, setStudentPerformanceData] = useState<any[]>([]);

  // Derive schoolId with memo
  const schoolId = useMemo(() => {
    return authSchoolId || profile?.organization?.id || 'test';
  }, [authSchoolId, profile?.organization?.id]);
  
  // Fetch students - mock implementation
  const fetchStudents = useCallback(async () => {
    try {
      const mockStudents = [
        { id: '1', name: 'Student 1' },
        { id: '2', name: 'Student 2' },
        { id: '3', name: 'Student 3' },
      ];
      setStudents(mockStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, []);

  // Generate mock data - only called once after initial load if real data is empty
  const generateMockData = useCallback(() => {
    if (!summary) {
      setSummary({
        activeStudents: 15,
        totalSessions: 42,
        totalQueries: 128,
        avgSessionMinutes: 18,
      });
    }
    if (sessions.length === 0) {
      const mockSessions: SessionData[] = Array(5).fill(null).map((_, i) => ({
        id: `mock-session-${i}`,
        student_id: `student-${i % 3 + 1}`,
        student_name: `Student ${i % 3 + 1}`,
        session_date: new Date(Date.now() - i * 86400000).toISOString(),
        duration_minutes: Math.floor(Math.random() * 45) + 10,
        topics: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5].split(','),
        questions_asked: Math.floor(Math.random() * 10) + 3,
        questions_answered: Math.floor(Math.random() * 8) + 2,
        userId: `student-${i % 3 + 1}`,
        userName: `Student ${i % 3 + 1}`,
        topic: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5],
        queries: Math.floor(Math.random() * 10) + 3,
      }));
      setSessions(mockSessions);
    }
    if (topics.length === 0) {
      setTopics([
        { topic: 'Math', count: 15, name: 'Math', value: 15 },
        { topic: 'Science', count: 12, name: 'Science', value: 12 },
        { topic: 'History', count: 8, name: 'History', value: 8 },
        { topic: 'English', count: 7, name: 'English', value: 7 },
        { topic: 'Geography', count: 5, name: 'Geography', value: 5 },
      ]);
    }
    if (studyTime.length === 0) {
      setStudyTime([
        { student_id: 'student-1', student_name: 'Student 1', total_minutes: 240, name: 'Student 1', studentName: 'Student 1', hours: 4, week: 1, year: 2023 },
        { student_id: 'student-2', student_name: 'Student 2', total_minutes: 180, name: 'Student 2', studentName: 'Student 2', hours: 3, week: 1, year: 2023 },
        { student_id: 'student-3', student_name: 'Student 3', total_minutes: 150, name: 'Student 3', studentName: 'Student 3', hours: 2.5, week: 1, year: 2023 },
      ]);
    }
    if (activeTab === "performance" && schoolPerformanceData.length === 0) {
      setSchoolPerformanceData([
        { month: 'Jan', score: 78 },
        { month: 'Feb', score: 82 },
        { month: 'Mar', score: 85 },
      ]);
      setSchoolPerformanceSummary({
        averageScore: 82,
        trend: 'up',
        changePercentage: 5,
      });
      setTeacherPerformanceData([
        { id: 1, name: 'Teacher 1', students: 10, avgScore: 82, trend: 'up' },
        { id: 2, name: 'Teacher 2', students: 8, avgScore: 78, trend: 'down' },
      ]);
      setStudentPerformanceData([
        { id: 1, name: 'Student 1', teacher: 'Teacher 1', avgScore: 85, trend: 'up', subjects: ['Math', 'Science'] },
        { id: 2, name: 'Student 2', teacher: 'Teacher 1', avgScore: 79, trend: 'steady', subjects: ['English', 'History'] },
      ]);
    }
  }, [summary, sessions, topics, studyTime, activeTab, schoolPerformanceData.length]);

  const loadAnalyticsData = useCallback(async () => {
    if (isLoading && initialLoadComplete) { return; }
    setIsLoading(true);
    setDataError(false);

    try {
      setFilters((prev) => ({
        ...prev,
        schoolId,
      }));

      try {
        const summaryData = await fetchAnalyticsSummary(schoolId, filters);
        setSummary(summaryData);
      } catch (err) {
        console.error("Error fetching summary data:", err);
      }

      try {
        const sessionData = await fetchSessionLogs(schoolId, filters);
        setSessions(Array.isArray(sessionData) ? sessionData : []);
      } catch (err) {
        console.error("Error fetching session data:", err);
        setSessions([]);
      }

      try {
        const topicData = await fetchTopics(schoolId, filters);
        setTopics(Array.isArray(topicData) ? topicData : []);
      } catch (err) {
        console.error("Error fetching topic data:", err);
        setTopics([]);
      }

      try {
        const studyTimeData = await fetchStudyTime(schoolId, filters);
        setStudyTime(Array.isArray(studyTimeData) ? studyTimeData : []);
      } catch (err) {
        console.error("Error fetching study time data:", err);
        setStudyTime([]);
      }

      if (activeTab === "performance") {
        try {
          const schoolPerformance = await fetchSchoolPerformance(schoolId, filters);
          setSchoolPerformanceData(Array.isArray(schoolPerformance?.monthlyData) ? schoolPerformance.monthlyData : []);
          setSchoolPerformanceSummary(schoolPerformance?.summary || null);
        } catch (err) {
          console.error("Error fetching school performance:", err);
          setSchoolPerformanceData([]);
          setSchoolPerformanceSummary(null);
        }

        try {
          const teacherPerformance = await fetchTeacherPerformance(schoolId, filters);
          setTeacherPerformanceData(Array.isArray(teacherPerformance) ? teacherPerformance : []);
        } catch (err) {
          console.error("Error fetching teacher performance:", err);
          setTeacherPerformanceData([]);
        }

        try {
          const studentPerformance = await fetchStudentPerformance(schoolId, filters);
          setStudentPerformanceData(Array.isArray(studentPerformance) ? studentPerformance : []);
        } catch (err) {
          console.error("Error fetching student performance:", err);
          setStudentPerformanceData([]);
        }
      }
    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      setDataError(true);
      toast.error("Failed to load analytics data. Showing mock data instead.");
    } finally {
      setIsLoading(false);
      setInitialLoadComplete(true);
    }
  }, [schoolId, filters, activeTab, initialLoadComplete, isLoading]);

  // Only call generateMockData once after initial load if needed
  useEffect(() => {
    if (initialLoadComplete && !dataError) {
      generateMockData();
    }
  }, [initialLoadComplete, dataError, generateMockData]);

  const handleRefreshData = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (schoolId) {
      setFilters((prevFilters) => ({
        ...prevFilters,
        schoolId,
      }));
      fetchStudents();
    }
  }, [schoolId, fetchStudents]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData, retryCount, activeTab]);

  const handleFiltersChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
    setRetryCount((prev) => prev + 1);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setRetryCount((prev) => prev + 1);
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
            <Button onClick={handleRefreshData} variant="outline" className="flex items-center" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isLoading && !initialLoadComplete ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-60" />
            </div>
          ) : dataError && !initialLoadComplete ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>
                Failed to load analytics data. Please try again or check your connection.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="engagement">Engagement Metrics</TabsTrigger>
                  <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement" className="space-y-6 mt-6">
                  <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />
                  
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
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TopicsChart
                      data={topics}
                      title="Most Studied Topics"
                      description="Top 10 topics students are currently studying"
                      isLoading={isLoading}
                    />
                    <StudyTimeChart
                      data={studyTime}
                      title="Student Study Time"
                      description="Weekly study time per student"
                      isLoading={isLoading}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6 mt-6">
                  <SchoolPerformancePanel
                    monthlyData={schoolPerformanceData}
                    summary={schoolPerformanceSummary}
                    isLoading={isLoading}
                  />
                  <TeacherPerformanceTable
                    data={teacherPerformanceData}
                    isLoading={isLoading}
                  />
                  <StudentPerformanceTable
                    data={studentPerformanceData}
                    isLoading={isLoading}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;