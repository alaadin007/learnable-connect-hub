
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

  // Explicitly typing states
  const [summary, setSummary] = useState<{
    activeStudents: number;
    totalSessions: number;
    totalQueries: number;
    avgSessionMinutes: number;
  }>({
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
    schoolId: "", // Initialize schoolId in filters
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
      // Get real students data from the database
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

      if (error) {
        console.error("Error fetching students:", error);
        return;
      }
      
      if (studentsData && studentsData.length > 0) {
        const mappedStudents = studentsData.map(student => ({
          id: student.id,
          name: student.profiles?.full_name || 'Unknown Student'
        }));
        setStudents(mappedStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
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
        
      if (error) {
        console.error("Error fetching school info:", error);
        // Fallback to profile data
        if (profile?.organization) {
          setSchoolInfo({
            name: profile.organization.name || "Your School",
            code: profile.organization.code || profile?.school_code || "N/A"
          });
        }
        return;
      }
      
      if (data) {
        setSchoolInfo({
          name: data.name,
          code: data.code
        });
      }
    } catch (error) {
      console.error("Error fetching school info:", error);
      // Fallback to profile data
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
    // Don't show loading state on subsequent data loads after initial
    if (!initialLoad) {
      setIsLoading(true);
    }
    
    setDataError(false);
    try {
      if (!schoolId) {
        throw new Error("School ID not available");
      }
      
      setFilters((prev) => ({
        ...prev,
        schoolId,
      }));

      // Try to get real data from the database first
      try {
        // Fetch summary from school_analytics_summary view if it exists
        const { data: summaryData, error: summaryError } = await supabase
          .from('school_analytics_summary')
          .select('active_students, total_sessions, total_queries, avg_session_minutes')
          .eq('school_id', schoolId)
          .single();
          
        if (!summaryError && summaryData) {
          setSummary({
            activeStudents: summaryData.active_students || 0,
            totalSessions: summaryData.total_sessions || 0,
            totalQueries: summaryData.total_queries || 0,
            avgSessionMinutes: summaryData.avg_session_minutes || 0
          });
        } else {
          // Fallback: Count sessions directly
          const { data: sessionCountData, error: sessionCountError } = await supabase
            .from('session_logs')
            .select('id', { count: 'exact' })
            .eq('school_id', schoolId);
            
          const { data: studentsCountData } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('school_id', schoolId);
            
          const { data: queriesData } = await supabase
            .from('session_logs')
            .select('num_queries')
            .eq('school_id', schoolId);
            
          const { data: sessionDurations } = await supabase
            .from('session_logs')
            .select('session_start, session_end')
            .eq('school_id', schoolId)
            .not('session_end', 'is', null);
            
          if (!sessionCountError) {
            const totalSessions = sessionCountData?.length || 0;
            const activeStudents = studentsCountData?.length || 0;
            
            // Calculate total queries
            const totalQueries = queriesData?.reduce((sum, session) => sum + (session.num_queries || 0), 0) || 0;
            
            // Calculate average session duration
            let avgMinutes = 0;
            if (sessionDurations && sessionDurations.length > 0) {
              const totalMinutes = sessionDurations.reduce((sum, session) => {
                if (session.session_start && session.session_end) {
                  const start = new Date(session.session_start);
                  const end = new Date(session.session_end);
                  const durationMs = end.getTime() - start.getTime();
                  return sum + (durationMs / (1000 * 60)); // Convert ms to minutes
                }
                return sum;
              }, 0);
              
              avgMinutes = totalMinutes / sessionDurations.length;
            }
            
            setSummary({
              activeStudents,
              totalSessions,
              totalQueries,
              avgSessionMinutes: avgMinutes
            });
          }
        }
        
        // Fetch sessions
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('get_session_logs_with_user_details', { school_id_param: schoolId })
          .order('session_start', { ascending: false });
          
        if (!sessionError && sessionData && sessionData.length > 0) {
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
        const { data: topicData, error: topicError } = await supabase
          .from('most_studied_topics')
          .select('topic_or_content_used, count_of_sessions')
          .eq('school_id', schoolId)
          .order('count_of_sessions', { ascending: false })
          .limit(10);
          
        if (!topicError && topicData && topicData.length > 0) {
          const mappedTopics: TopicData[] = topicData.map(topic => ({
            topic: topic.topic_or_content_used || 'Unknown',
            name: topic.topic_or_content_used || 'Unknown',
            count: topic.count_of_sessions || 0,
            value: topic.count_of_sessions || 0
          }));
          
          setTopics(mappedTopics);
        }
        
        // Fetch study time
        const { data: studyTimeData, error: studyTimeError } = await supabase
          .from('student_weekly_study_time')
          .select('user_id, student_name, study_hours, week_number, year')
          .eq('school_id', schoolId);
          
        if (!studyTimeError && studyTimeData && studyTimeData.length > 0) {
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
        console.error("Database error, falling back to API calls:", dbError);
        
        // Proceed with API calls for any missing data
        const promises = [];

        // Summary data (if needed)
        if (summary.activeStudents === 0) {
          promises.push(
            fetchAnalyticsSummary(schoolId, filters)
              .then(summaryData => setSummary(summaryData))
              .catch(err => console.error("Error fetching summary data:", err))
          );
        }

        // Session data (if needed)
        if (sessions.length === 0) {
          promises.push(
            fetchSessionLogs(schoolId, filters)
              .then(sessionData => {
                if (Array.isArray(sessionData) && sessionData.length > 0) {
                  setSessions(sessionData);
                }
              })
              .catch(err => console.error("Error fetching session data:", err))
          );
        }

        // Topic data (if needed)
        if (topics.length === 0) {
          promises.push(
            fetchTopics(schoolId, filters)
              .then(topicData => {
                if (Array.isArray(topicData) && topicData.length > 0) {
                  setTopics(topicData);
                }
              })
              .catch(err => console.error("Error fetching topic data:", err))
          );
        }

        // Study time data (if needed)
        if (studyTime.length === 0) {
          promises.push(
            fetchStudyTime(schoolId, filters)
              .then(studyTimeData => {
                if (Array.isArray(studyTimeData) && studyTimeData.length > 0) {
                  setStudyTime(studyTimeData);
                }
              })
              .catch(err => console.error("Error fetching study time data:", err))
          );
        }

        await Promise.allSettled(promises);
      }

      // Only fetch performance data when on performance tab
      if (activeTab === "performance") {
        try {
          // Try to get real performance data
          const { data: schoolPerfData, error: schoolPerfError } = await supabase
            .from('school_performance_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .single();
            
          if (!schoolPerfError && schoolPerfData) {
            setSchoolPerformanceSummary({
              averageScore: schoolPerfData.avg_score || 0,
              trend: schoolPerfData.avg_score > 75 ? 'up' : 'down',
              changePercentage: 5, // Mock change percentage
            });
          }
            
          const { data: schoolImproveData, error: schoolImproveError } = await supabase
            .from('school_improvement_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .order('month', { ascending: true });
            
          if (!schoolImproveError && schoolImproveData && schoolImproveData.length > 0) {
            const monthlyData = schoolImproveData.map(item => ({
              month: new Date(item.month).toLocaleString('default', { month: 'short' }),
              score: item.avg_monthly_score || 0
            }));
            
            setSchoolPerformanceData(monthlyData);
          }
            
          // Teacher performance
          const { data: teacherPerfData, error: teacherPerfError } = await supabase
            .from('teacher_performance_metrics')
            .select('*')
            .eq('school_id', schoolId);
            
          if (!teacherPerfError && teacherPerfData && teacherPerfData.length > 0) {
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
          const { data: studentPerfData, error: studentPerfError } = await supabase
            .from('student_performance_metrics')
            .select('*')
            .eq('school_id', schoolId);
            
          if (!studentPerfError && studentPerfData && studentPerfData.length > 0) {
            const mappedStudentData = studentPerfData.map(student => ({
              id: student.student_id,
              name: student.student_name || 'Unknown Student',
              teacher: 'Various Teachers', // This would need to be joined from another table
              avgScore: student.avg_score || 0,
              trend: student.avg_score > 75 ? 'up' : 'down',
              subjects: student.top_strengths ? student.top_strengths.split(', ') : ['General']
            }));
            
            setStudentPerformanceData(mappedStudentData);
          }
            
        } catch (perfError) {
          console.error("Error fetching performance data:", perfError);
          
          // Fallback to API functions
          const perfPromises = [];
          
          // School performance
          perfPromises.push(
            fetchSchoolPerformance(schoolId, filters)
              .then(schoolPerformance => {
                if (schoolPerformance?.monthlyData && Array.isArray(schoolPerformance.monthlyData)) {
                  setSchoolPerformanceData(schoolPerformance.monthlyData);
                  setSchoolPerformanceSummary(schoolPerformance?.summary || null);
                }
              })
              .catch(err => console.error("Error fetching school performance:", err))
          );

          // Teacher performance
          perfPromises.push(
            fetchTeacherPerformance(schoolId, filters)
              .then(teacherPerformance => {
                if (Array.isArray(teacherPerformance) && teacherPerformance.length > 0) {
                  setTeacherPerformanceData(teacherPerformance);
                }
              })
              .catch(err => console.error("Error fetching teacher performance:", err))
          );

          // Student performance
          perfPromises.push(
            fetchStudentPerformance(schoolId, filters)
              .then(studentPerformance => {
                if (Array.isArray(studentPerformance) && studentPerformance.length > 0) {
                  setStudentPerformanceData(studentPerformance);
                }
              })
              .catch(err => console.error("Error fetching student performance:", err))
          );
            
          await Promise.allSettled(perfPromises);
        }
      }

      // Generate mock data if no data is available after all attempts
      if (summary.activeStudents === 0 || sessions.length === 0 || topics.length === 0 || studyTime.length === 0) {
        generateMockData();
      }
      
    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      setDataError(true);
      toast.error("Failed to load analytics data. Showing mock data instead.");
      
      // Generate mock data on error
      generateMockData();
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
      setDataLoaded(true);
    }
  }, [schoolId, filters, activeTab, initialLoad, summary.activeStudents, sessions.length, topics.length, studyTime.length]);

  // Generate mock data - only called once after initial load if real data is empty
  const generateMockData = useCallback(() => {
    if (!summary || (summary.activeStudents === 0 && summary.totalSessions === 0)) {
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
    
    // Mark data as loaded
    setDataLoaded(true);
  }, [summary, sessions, topics, studyTime, activeTab, schoolPerformanceData.length]);

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

  // Effect for initial setup
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

  // Effect to load analytics data when filters change or on retry
  useEffect(() => {
    if (!authLoading && schoolId) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData, retryCount, activeTab, authLoading, schoolId]);

  const handleFiltersChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
    setRetryCount((prev) => prev + 1);
  }, []);

  // Show loading state only on initial load
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
