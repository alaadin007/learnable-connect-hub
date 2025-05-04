import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  AnalyticsFilters, 
  TopicsChart, 
  StudyTimeChart, 
  SessionsTable, 
  AnalyticsExport, 
  AnalyticsSummaryCards 
} from "@/components/analytics";
import { AnalyticsFilters as FiltersType } from "@/components/analytics/types";
import { 
  fetchAnalyticsSummary, 
  fetchSessionLogs, 
  fetchTopics, 
  fetchStudyTime,
  getDateRangeText 
} from "@/utils/analyticsUtils";

const TeacherAnalytics = () => {
  const navigate = useNavigate();
  const { user, profile, userRole } = useAuth();
  
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  
  const [summary, setSummary] = useState({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0,
  });
  
  const [sessions, setSessions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [studyTime, setStudyTime] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange,
    schoolId: profile?.organization?.id || "test", 
  });
  
  // Effect to check user role
  useEffect(() => {
    if (userRole && userRole !== "teacher") {
      toast.error("This page is only accessible to teachers");
      navigate("/dashboard");
    }
  }, [userRole, navigate]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // For the sake of the demo, let's use mock data
      setSummary({
        activeStudents: 12,
        totalSessions: 28,
        totalQueries: 76,
        avgSessionMinutes: 22,
      });
      
      setSessions([
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
        },
        {
          id: 'session-3',
          student_name: 'Mike Brown',
          session_date: new Date(Date.now() - 172800000).toISOString(),
          duration_minutes: 32,
          topics: ['History'],
          topic: 'History',
          questions_asked: 10,
        }
      ]);
      
      setTopics([
        { topic: 'Algebra', count: 8, name: 'Algebra', value: 8 },
        { topic: 'Chemistry', count: 6, name: 'Chemistry', value: 6 },
        { topic: 'History', count: 10, name: 'History', value: 10 },
        { topic: 'Biology', count: 5, name: 'Biology', value: 5 },
      ]);
      
      setStudyTime([
        { student_id: 'student-1', student_name: 'John Doe', total_minutes: 180, hours: 3 },
        { student_id: 'student-2', student_name: 'Jane Smith', total_minutes: 120, hours: 2 },
        { student_id: 'student-3', student_name: 'Mike Brown', total_minutes: 210, hours: 3.5 },
      ]);
      
      // In a real application, we would fetch this data from the API
      if (filters.schoolId && !filters.schoolId.startsWith('test')) {
        try {
          const schoolId = filters.schoolId;
          
          // Fetch summary data
          const summaryData = await fetchAnalyticsSummary(schoolId, filters);
          setSummary(summaryData);
          
          // Fetch session logs
          const sessionData = await fetchSessionLogs(schoolId, filters);
          if (sessionData.length > 0) setSessions(sessionData);
          
          // Fetch topic data
          const topicData = await fetchTopics(schoolId, filters);
          if (topicData.length > 0) setTopics(topicData);
          
          // Fetch study time data
          const studyTimeData = await fetchStudyTime(schoolId, filters);
          if (studyTimeData.length > 0) setStudyTime(studyTimeData);
        } catch (fetchError) {
          console.error("Error fetching real data:", fetchError);
          // Keep using mock data if fetch fails
        }
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  // Load data on initial render and when filters change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);
  
  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters({
      ...newFilters,
      schoolId: profile?.organization?.id || "test"
    });
  };
  
  const handleRefreshData = () => {
    loadAnalyticsData();
    toast.success("Data refreshed");
  };
  
  const dateRangeText = getDateRangeText(filters.dateRange);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Teacher Analytics</h1>
            <p className="text-learnable-gray">Monitor student engagement and learning progress</p>
          </div>

          <div className="flex justify-between mb-6 flex-wrap gap-4">
            <AnalyticsFilters 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              showStudentSelector={true}
              showTeacherSelector={false}
            />
            <Button onClick={handleRefreshData} variant="outline" className="flex items-center">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="space-y-6">
            <AnalyticsSummaryCards 
              summary={summary} 
              isLoading={isLoading} 
              dateRange={filters.dateRange}
            />
            
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="topics">Topics</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">Recent Sessions</CardTitle>
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
                      sessions={sessions.slice(0, 5)} 
                      isLoading={isLoading}
                    />
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopicsChart
                    data={topics}
                    title="Popular Topics"
                    description="Most frequently discussed topics"
                    isLoading={isLoading}
                  />
                  <StudyTimeChart
                    data={studyTime}
                    title="Student Study Time"
                    description="Total study time by student (minutes)"
                    isLoading={isLoading}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SessionsTable 
                      sessions={sessions} 
                      isLoading={isLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="topics">
                <Card>
                  <CardHeader>
                    <CardTitle>Topic Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <TopicsChart
                        data={topics}
                        title="All Topics"
                        description="Distribution of topics across sessions"
                        isLoading={isLoading}
                      />
                    </div>
                    
                    <div className="mt-8">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Topic</th>
                            <th className="text-right py-2">Count</th>
                            <th className="text-right py-2">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topics.map((topic, index) => {
                            const totalCount = topics.reduce((sum, t) => sum + t.count, 0);
                            const percentage = totalCount > 0 ? 
                              ((topic.count / totalCount) * 100).toFixed(1) : "0";
                            
                            return (
                              <tr key={index} className="border-b">
                                <td className="py-2">{topic.topic}</td>
                                <td className="py-2 text-right">{topic.count}</td>
                                <td className="py-2 text-right">{percentage}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="students">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <StudyTimeChart
                        data={studyTime}
                        title="Student Study Time"
                        description="Total time spent by each student"
                        isLoading={isLoading}
                      />
                    </div>
                    
                    <div className="mt-8">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Student</th>
                            <th className="text-right py-2">Total Minutes</th>
                            <th className="text-right py-2">Hours</th>
                            <th className="text-right py-2">Sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studyTime.map((student, index) => {
                            // Count sessions for this student
                            const studentSessions = sessions.filter(
                              (s: any) => s.student_name === student.student_name
                            );
                            
                            return (
                              <tr key={index} className="border-b">
                                <td className="py-2">{student.student_name}</td>
                                <td className="py-2 text-right">{student.total_minutes}</td>
                                <td className="py-2 text-right">
                                  {(student.total_minutes / 60).toFixed(1)}
                                </td>
                                <td className="py-2 text-right">{studentSessions.length}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherAnalytics;
