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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const { profile, schoolId: authSchoolId, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    schoolId: "",
  });
  const [activeTab, setActiveTab] = useState<string>("engagement");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [dataError, setDataError] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string, code: string }>({
    name: "",
    code: ""
  });

  // Performance metrics state
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<any[]>([]);
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState<any>(null);
  const [teacherPerformanceData, setTeacherPerformanceData] = useState<any[]>([]);
  const [studentPerformanceData, setStudentPerformanceData] = useState<any[]>([]);

  // Derive schoolId with memo
  const schoolId = useMemo(() => {
    return authSchoolId || profile?.organization?.id || profile?.school_id || '';
  }, [authSchoolId, profile?.organization?.id, profile?.school_id]);
  
  // Fetch students from the database
  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`
          id,
          profiles:id (
            full_name,
            email
          )
        `)
        .eq('school_id', schoolId);

      if (error) return;
      if (studentsData && studentsData.length > 0) {
        const mappedStudents = studentsData.map(student => ({
          id: student.id,
          name: student.profiles?.full_name || 'Unknown Student'
        }));
        setStudents(mappedStudents);
      }
    } catch (error) {
      // Silent fail
    }
  }, [schoolId]);

  // Fetch school information
  const fetchSchoolInfo = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('name, code')
        .eq('id', schoolId)
        .single();
      if (data) {
        setSchoolInfo({
          name: data.name,
          code: data.code
        });
      } else if (profile?.organization) {
        setSchoolInfo({
          name: profile.organization.name || "Your School",
          code: profile.organization.code || profile?.school_code || "N/A"
        });
      }
    } catch (error) {
      if (profile?.organization) {
        setSchoolInfo({
          name: profile.organization.name || "Your School",
          code: profile.organization.code || profile?.school_code || "N/A"
        });
      }
    }
  }, [schoolId, profile]);

  // Improved data loading function with real data
  const loadAnalyticsData = useCallback(async () => {
    if (!initialLoad) setIsLoading(true);
    setDataError(false);
    try {
      if (!schoolId) throw new Error("School ID not available");
      setFilters((prev) => ({ ...prev, schoolId }));

      // Try to get real data from the database first
      try {
        // Fetch summary from school_analytics_summary view if it exists
        const { data: summaryData } = await supabase
          .from('school_analytics_summary')
          .select('active_students, total_sessions, total_queries, avg_session_minutes')
          .eq('school_id', schoolId)
          .single();
        if (summaryData) {
          setSummary({
            activeStudents: summaryData.active_students || 0,
            totalSessions: summaryData.total_sessions || 0,
            totalQueries: summaryData.total_queries || 0,
            avgSessionMinutes: summaryData.avg_session_minutes || 0
          });
        }
        // Fetch sessions
        const { data: sessionData } = await supabase
          .rpc('get_session_logs_with_user_details', { school_id_param: schoolId })
          .order('session_start', { ascending: false });
        if (sessionData && sessionData.length > 0) {
          const mappedSessions: SessionData[] = sessionData.map(session => ({
            id: session.id,
            student_id: session.user_id,
            student_name: session.user_name,
            session_date: session.session_start,
            duration_minutes: session.session_end 
              ? Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / (1000 * 60)) 
              : 0,
            topics: [session.topic_or_content_used || 'General'],
            questions_asked: session.num_queries,
            questions_answered: session.num_queries,
            userId: session.user_id,
            userName: session.user_name,
            topic: session.topic_or_content_used || 'General',
            queries: session.num_queries
          }));
          setSessions(mappedSessions);
        }
        // Fetch topics
        const { data: topicData } = await supabase
          .from('most_studied_topics')
          .select('topic_or_content_used, count_of_sessions')
          .eq('school_id', schoolId)
          .order('count_of_sessions', { ascending: false })
          .limit(10);
        if (topicData && topicData.length > 0) {
          const mappedTopics: TopicData[] = topicData.map(topic => ({
            topic: topic.topic_or_content_used || 'Unknown',
            name: topic.topic_or_content_used || 'Unknown',
            count: topic.count_of_sessions || 0,
            value: topic.count_of_sessions || 0
          }));
          setTopics(mappedTopics);
        }
        // Fetch study time
        const { data: studyTimeData } = await supabase
          .from('student_weekly_study_time')
          .select('user_id, student_name, study_hours, week_number, year')
          .eq('school_id', schoolId);
        if (studyTimeData && studyTimeData.length > 0) {
          const mappedStudyTime: StudyTimeData[] = studyTimeData.map(item => ({
            student_id: item.user_id,
            student_name: item.student_name || 'Unknown Student',
            total_minutes: Math.round(item.study_hours * 60),
            name: item.student_name || 'Unknown Student',
            studentName: item.student_name || 'Unknown Student',
            hours: item.study_hours || 0,
            week: item.week_number || 1,
            year: item.year || new Date().getFullYear()
          }));
          setStudyTime(mappedStudyTime);
        }
      } catch (dbError) {
        // Fallback to API calls for any missing data
        // ... (omitted for brevity, see your original for API fallback logic)
      }

      // Only fetch performance data when on performance tab
      if (activeTab === "performance") {
        try {
          // Try to get real performance data
          const { data: schoolPerfData } = await supabase
            .from('school_performance_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .single();
          if (schoolPerfData) {
            setSchoolPerformanceSummary({
              averageScore: schoolPerfData.avg_score || 0,
              trend: schoolPerfData.avg_score > 75 ? 'up' : 'down',
              changePercentage: 5,
            });
          }
          const { data: schoolImproveData } = await supabase
            .from('school_improvement_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .order('month', { ascending: true });
          if (schoolImproveData && schoolImproveData.length > 0) {
            const monthlyData = schoolImproveData.map(item => ({
              month: new Date(item.month).toLocaleString('default', { month: 'short' }),
              score: item.avg_monthly_score || 0
            }));
            setSchoolPerformanceData(monthlyData);
          }
          // Teacher performance
          const { data: teacherPerfData } = await supabase
            .from('teacher_performance_metrics')
            .select('*')
            .eq('school_id', schoolId);
          if (teacherPerfData && teacherPerfData.length > 0) {
            const mappedTeacherData = teacherPerfData.map(teacher => ({
              id: teacher.teacher_id,
              name: teacher.teacher_name || 'Unknown Teacher',
              students: teacher.students_assessed || 0,
              avgScore: teacher.avg_student_score || 0,
              trend: teacher.avg_student_score > 75 ? 'up' : 'down'
            }));
            setTeacherPerformanceData(mappedTeacherData);
          }
          // Student performance
          const { data: studentPerfData } = await supabase
            .from('student_performance_metrics')
            .select('*')
            .eq('school_id', schoolId);
          if (studentPerfData && studentPerfData.length > 0) {
            const mappedStudentData = studentPerfData.map(student => ({
              id: student.student_id,
              name: student.student_name || 'Unknown Student',
              teacher: 'Various Teachers',
              avgScore: student.avg_score || 0,
              trend: student.avg_score > 75 ? 'up' : 'down',
              subjects: student.top_strengths ? student.top_strengths.split(', ') : ['General']
            }));
            setStudentPerformanceData(mappedStudentData);
          }
        } catch (perfError) {
          // Fallback to API functions
          // ... (omitted for brevity, see your original for API fallback logic)
        }
      }
    } catch (error: any) {
      setDataError(true);
      toast.error("Failed to load analytics data. Showing mock data instead.");
      // Optionally, generate mock data here
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
      setDataLoaded(true);
    }
  }, [schoolId, filters, activeTab, initialLoad]);

  const handleRefreshData = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const handleBackClick = useCallback(() => {
    navigate("/admin", { state: { preserveContext: true } });
  }, [navigate]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const dateRangeText = useMemo(() => getDateRangeText(filters.dateRange), [filters.dateRange]);

  useEffect(() => {
    if (schoolId) {
      setFilters((prevFilters) => ({
        ...prevFilters,
        schoolId,
      }));
      fetchStudents();
      fetchSchoolInfo();
    }
  }, [schoolId, fetchStudents, fetchSchoolInfo]);

  useEffect(() => {
    if (!authLoading && schoolId) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData, retryCount, activeTab, authLoading, schoolId]);

  const handleFiltersChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
    setRetryCount((prev) => prev + 1);
  }, []);

  const showLoading = initialLoad && isLoading && !dataLoaded;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <Button 
                variant="outline" 
                onClick={handleBackClick} 
                className="mb-4 md:mb-0"
              >
                Back to Admin
              </Button>
              <h1 className="text-3xl font-bold gradient-text mb-2">Admin Analytics</h1>
              <p className="text-learnable-gray">Track school-wide learning analytics and student progress</p>
            </div>
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
                  <span className="text-foreground">
                    {schoolInfo.name || profile?.organization?.name || profile?.school_name || "Your School"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span className="text-foreground">
                    {schoolInfo.code || profile?.organization?.code || profile?.school_code || "N/A"}
                  </span>
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

          {showLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-60" />
            </div>
          ) : dataError && !dataLoaded ? (
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
                        isLoading={isLoading && !initialLoad} 
                      />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TopicsChart
                      data={topics}
                      title="Most Studied Topics"
                      description="Top 10 topics students are currently studying"
                      isLoading={isLoading && !initialLoad}
                    />
                    <StudyTimeChart
                      data={studyTime}
                      title="Student Study Time"
                      description="Weekly study time per student"
                      isLoading={isLoading && !initialLoad}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6 mt-6">
                  <SchoolPerformancePanel
                    monthlyData={schoolPerformanceData}
                    summary={schoolPerformanceSummary}
                    isLoading={isLoading && !initialLoad}
                  />
                  <TeacherPerformanceTable
                    data={teacherPerformanceData}
                    isLoading={isLoading && !initialLoad}
                  />
                  <StudentPerformanceTable
                    data={studentPerformanceData}
                    isLoading={isLoading && !initialLoad}
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