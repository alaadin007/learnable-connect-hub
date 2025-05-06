import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, LineChart, PieChart } from "@/components/ui/charts";
import { Loader2, Download, Users, Clock, BookOpen, Search, RefreshCw, AlertCircle } from "lucide-react";
import { 
  fetchAnalyticsSummary, 
  fetchSessionLogs, 
  fetchTopics, 
  fetchStudyTime,
  getDateRangeText,
  exportAnalyticsToCSV
} from "@/utils/analyticsUtils";
import { DateRange } from "react-day-picker";
import { 
  AnalyticsFilters, 
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData
} from "@/components/analytics/types";
import SessionsTable from "@/components/analytics/SessionsTable";
import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { AnalyticsExport } from "@/components/analytics/AnalyticsExport";
import { isValidUUID } from "@/integrations/supabase/client";

const TeacherAnalytics = () => {
  const { user, profile, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  // Fix: Make the to property non-optional
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [retryCount, setRetryCount] = useState(0);
  const [dataError, setDataError] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataFetchDisabled, setDataFetchDisabled] = useState(false);
  
  // Get teacher's school ID with memoization
  const schoolId = useMemo(() => profile?.organization?.id || "test-school-0", [profile?.organization?.id]);
  const teacherId = useMemo(() => user?.id || "test-teacher-0", [user?.id]);
  
  // Check if we're using a test account
  const isTestAccount = useMemo(() => {
    return Boolean(
      (user?.email && user.email.includes(".test@learnable.edu")) || 
      (user?.id && user.id.startsWith("test-")) ||
      teacherId.startsWith("test-")
    );
  }, [user?.email, user?.id, teacherId]);

  // Generate mock data for test accounts immediately without API calls
  const generateMockData = useCallback(() => {
    // Skip if we already have data
    if (dataLoaded && summary.activeStudents > 0 && sessions.length > 0) {
      return;
    }
    
    // Set mock summary data
    const mockSummary = {
      activeStudents: 12,
      totalSessions: 35,
      totalQueries: 105,
      avgSessionMinutes: 22
    };
    
    // Set mock sessions data
    const mockSessions: SessionData[] = Array(15).fill(null).map((_, i) => ({
      id: `mock-session-${i}`,
      student_id: `student-${i % 5 + 1}`,
      student_name: `Student ${i % 5 + 1}`,
      session_date: new Date(Date.now() - (i * 86400000)).toISOString(),
      duration_minutes: Math.floor(Math.random() * 45) + 10,
      topics: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5].split(','),
      questions_asked: Math.floor(Math.random() * 10) + 3,
      questions_answered: Math.floor(Math.random() * 8) + 2,
      userId: `student-${i % 5 + 1}`,
      userName: `Student ${i % 5 + 1}`,
      topic: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5],
      queries: Math.floor(Math.random() * 10) + 3
    }));
    
    // Set mock topics data
    const mockTopics: TopicData[] = [
      { topic: 'Math', count: 15, name: 'Math', value: 15 },
      { topic: 'Science', count: 12, name: 'Science', value: 12 },
      { topic: 'History', count: 8, name: 'History', value: 8 },
      { topic: 'English', count: 7, name: 'English', value: 7 },
      { topic: 'Geography', count: 5, name: 'Geography', value: 5 }
    ];
    
    // Set mock study time data
    const mockStudyTime: StudyTimeData[] = [
      { student_id: 'student-1', student_name: 'Student 1', total_minutes: 240, name: 'Student 1', studentName: 'Student 1', hours: 4, week: 1, year: 2023 },
      { student_id: 'student-2', student_name: 'Student 2', total_minutes: 180, name: 'Student 2', studentName: 'Student 2', hours: 3, week: 1, year: 2023 },
      { student_id: 'student-3', student_name: 'Student 3', total_minutes: 150, name: 'Student 3', studentName: 'Student 3', hours: 2.5, week: 1, year: 2023 },
      { student_id: 'student-4', student_name: 'Student 4', total_minutes: 120, name: 'Student 4', studentName: 'Student 4', hours: 2, week: 1, year: 2023 },
      { student_id: 'student-5', student_name: 'Student 5', total_minutes: 90, name: 'Student 5', studentName: 'Student 5', hours: 1.5, week: 1, year: 2023 },
    ];
    
    // Update state all at once to minimize re-renders
    setSummary(mockSummary);
    setSessions(mockSessions);
    setTopics(mockTopics);
    setStudyTime(mockStudyTime);
    setDataLoaded(true);
    setIsLoading(false);
    setInitialLoad(false);
    
  }, [dataLoaded, summary.activeStudents, sessions.length]);

  // Effect for immediate mock data if test account
  useEffect(() => {
    if (isTestAccount) {
      console.log("Test account detected, using mock data immediately");
      generateMockData();
      setDataFetchDisabled(true); // Disable real API calls for test accounts
    } else {
      setDataFetchDisabled(false);
    }
  }, [isTestAccount, generateMockData]);

  // Improved data loading function with debounce to prevent flickering
  const loadAnalyticsData = useCallback(async () => {
    // Skip data loading for test accounts
    if (dataFetchDisabled || isTestAccount) {
      console.log("Data fetch disabled or test account detected, using mock data");
      generateMockData();
      return;
    }
    
    // Don't show loading state on subsequent data loads after initial
    if (!initialLoad) {
      setIsLoading(true);
    }
    
    setDataError(false);
    try {
      // Ensure schoolId is a valid UUID
      if (!schoolId || !isValidUUID(schoolId)) {
        console.warn("Invalid school ID, using mock data instead");
        generateMockData();
        return;
      }
      
      const filters: AnalyticsFilters = {
        dateRange,
        teacherId: isValidUUID(teacherId) ? teacherId : undefined,
      };

      // Fetch all analytics data in parallel with individual try/catch blocks
      const promises = [];
      
      // Fetch summary
      promises.push(fetchAnalyticsSummary(schoolId, filters)
        .then(summaryData => setSummary(summaryData))
        .catch(error => {
          console.error("Error loading summary data:", error);
          // Don't set error flag here, continue with other data
        }));

      // Fetch sessions
      promises.push(fetchSessionLogs(schoolId, filters)
        .then(sessionsData => {
          setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        })
        .catch(error => {
          console.error("Error loading sessions data:", error);
          // Don't clear sessions here to prevent flickering
        }));

      // Fetch topics
      promises.push(fetchTopics(schoolId, filters)
        .then(topicsData => {
          setTopics(Array.isArray(topicsData) ? topicsData : []);
        })
        .catch(error => {
          console.error("Error loading topics data:", error);
          // Don't clear topics here to prevent flickering
        }));

      // Fetch study time
      promises.push(fetchStudyTime(schoolId, filters)
        .then(studyTimeData => {
          setStudyTime(Array.isArray(studyTimeData) ? studyTimeData : []);
        })
        .catch(error => {
          console.error("Error loading study time data:", error);
          // Don't clear study time here to prevent flickering
        }));

      // Wait for all promises to resolve or reject
      await Promise.allSettled(promises);
      
      // Generate mock data if needed (when real data fetch fails)
      if (summary.activeStudents === 0 || sessions.length === 0) {
        generateMockData();
      }
      
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setDataError(true);
      toast.error("Failed to load analytics data. Using demo data instead.");
      
      // Generate mock data on error
      generateMockData();
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
      setDataLoaded(true);
    }
  }, [schoolId, dateRange, teacherId, initialLoad, generateMockData, dataFetchDisabled, isTestAccount, summary.activeStudents, sessions.length]);

  // Handler functions
  const handleRefreshData = useCallback(() => {
    // For test accounts, just regenerate mock data
    if (isTestAccount) {
      generateMockData();
      return;
    }
    setRetryCount(prev => prev + 1);
  }, [isTestAccount, generateMockData]);

  // Fix type issue with handleExport function to properly handle DateRange
  const handleExport = useCallback(() => {
    try {
      if (!dateRange || !dateRange.from) {
        toast.error("Please select a date range first");
        return;
      }
      
      const dateRangeStr = dateRange.to 
        ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
        : format(dateRange.from, "MMM d, yyyy");
        
      exportAnalyticsToCSV(summary, sessions, topics, studyTime, dateRangeStr);
      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export analytics data");
    }
  }, [summary, sessions, topics, studyTime, dateRange]);
  
  const handleDateRangeChange = useCallback((newDateRange: DateRange | undefined) => {
    // Ensure that the dateRange always has a 'to' value
    if (newDateRange && newDateRange.from) {
      setDateRange({
        from: newDateRange.from,
        to: newDateRange.to || newDateRange.from,
      });
    }
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  // Effect for initial data loading and refresh
  useEffect(() => {
    if (user) {
      // Skip the real data loading for test accounts
      if (isTestAccount) {
        if (!dataLoaded) {
          generateMockData();
        }
      } else {
        loadAnalyticsData();
      }
    }
  }, [user, dateRange, retryCount, loadAnalyticsData, isTestAccount, dataLoaded, generateMockData]);

  // Custom components that adapt to the expected props for the analytics components
  const TopicsChart = ({ data }: { data: TopicData[] }) => {
    // Transform the data to match what the chart expects
    const chartData = useMemo(() => data.map(t => ({
      name: t.topic,
      value: t.count
    })), [data]);

    return <PieChart data={chartData} />;
  };

  const StudyTimeChart = ({ data }: { data: StudyTimeData[] }) => {
    // Transform the data to match what the chart expects
    const chartData = useMemo(() => data.map(s => ({
      name: s.student_name,
      value: s.total_minutes
    })), [data]);

    return <BarChart data={chartData} />;
  };

  // Determine if we should show loading state - only on the first load
  const showLoading = initialLoad && isLoading && !dataLoaded;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">Analytics Dashboard</h1>
              <p className="text-learnable-gray">
                Track student engagement and learning progress
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRefreshData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <AnalyticsExport 
                  summary={summary}
                  sessions={sessions}
                  topics={topics}
                  studyTime={studyTime}
                  dateRangeText={getDateRangeText(dateRange)} 
                />
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {showLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                </div>
              ) : dataError && !dataLoaded ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Failed to load data</h3>
                      <p className="text-muted-foreground mb-4">
                        There was an error loading the analytics data. Using demo data instead.
                      </p>
                      <Button onClick={handleRefreshData}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <AnalyticsSummaryCards 
                    summary={summary}
                    isLoading={false} // Never show loading after initial load
                    dateRange={dateRange}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Popular Topics</CardTitle>
                        <CardDescription>
                          Most frequently discussed topics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TopicsChart data={topics.slice(0, 5)} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Study Time</CardTitle>
                        <CardDescription>
                          Total study time by student (minutes)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <StudyTimeChart data={studyTime.slice(0, 5)} />
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Sessions</CardTitle>
                      <CardDescription>
                        Latest learning sessions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SessionsTable 
                        sessions={sessions.slice(0, 5)} 
                        title="Recent Sessions"
                        description="Latest learning sessions"
                        isLoading={false} // Never show loading after initial load
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Sessions</CardTitle>
                  <CardDescription>
                    Complete history of learning sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <SessionsTable 
                      sessions={sessions} 
                      title="All Sessions"
                      description="Complete history of learning sessions"
                      isLoading={false} // Never show loading after initial load
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Topic Analysis</CardTitle>
                  <CardDescription>
                    Breakdown of topics discussed during learning sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading && !dataLoaded ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="h-80">
                        <TopicsChart data={topics} />
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Topic</th>
                              <th className="text-right py-2 px-4">Sessions</th>
                              <th className="text-right py-2 px-4">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topics.map((topic, index) => {
                              const totalCount = topics.reduce((sum, t) => sum + t.count, 0);
                              const percentage = totalCount > 0 
                                ? ((topic.count / totalCount) * 100).toFixed(1) 
                                : "0";
                                
                              return (
                                <tr key={index} className="border-b">
                                  <td className="py-2 px-4">{topic.topic}</td>
                                  <td className="py-2 px-4 text-right">{topic.count}</td>
                                  <td className="py-2 px-4 text-right">{percentage}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Engagement</CardTitle>
                  <CardDescription>
                    Study time and activity by student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading && !dataLoaded ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="h-80">
                        <StudyTimeChart data={studyTime} />
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Student</th>
                              <th className="text-right py-2 px-4">Sessions</th>
                              <th className="text-right py-2 px-4">Total Time (min)</th>
                              <th className="text-right py-2 px-4">Avg. Session (min)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studyTime.map((student, index) => {
                              // Count sessions for this student
                              const studentSessions = sessions.filter(
                                s => s.student_name === student.student_name
                              );
                              
                              const sessionCount = studentSessions.length;
                              const avgSessionTime = sessionCount > 0
                                ? Math.round(student.total_minutes / sessionCount)
                                : 0;
                                
                              return (
                                <tr key={index} className="border-b">
                                  <td className="py-2 px-4">{student.student_name}</td>
                                  <td className="py-2 px-4 text-right">{sessionCount}</td>
                                  <td className="py-2 px-4 text-right">{student.total_minutes}</td>
                                  <td className="py-2 px-4 text-right">{avgSessionTime}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherAnalytics;
