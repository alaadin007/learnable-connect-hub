import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart, LineChart, PieChart } from "@/components/ui/charts";
import { Loader2, Download, Users, Clock, BookOpen, Search } from "lucide-react";
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
import TopicsChart from "@/components/analytics/TopicsChart";
import StudyTimeChart from "@/components/analytics/StudyTimeChart";
import AnalyticsSummaryCards from "@/components/analytics/AnalyticsSummaryCards";

const TeacherAnalytics = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
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
  
  // Get teacher's school ID
  const schoolId = profile?.organization?.id || "test";
  const userRole = profile?.user_type || "teacher";

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, dateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const filters: AnalyticsFilters = {
        dateRange,
        teacherId: user?.id,
      };

      // Fetch all analytics data in parallel
      const [summaryData, sessionsData, topicsData, studyTimeData] = await Promise.all([
        fetchAnalyticsSummary(schoolId, filters),
        fetchSessionLogs(schoolId, filters),
        fetchTopics(schoolId, filters),
        fetchStudyTime(schoolId, filters),
      ]);

      setSummary(summaryData);
      setSessions(sessionsData);
      setTopics(topicsData);
      setStudyTime(studyTimeData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const dateRangeText = getDateRangeText(dateRange);
    exportAnalyticsToCSV(summary, sessions, topics, studyTime, dateRangeText);
    toast.success("Analytics data exported successfully");
  };

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
                onDateChange={setDateRange}
              />
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                </div>
              ) : (
                <>
                  <AnalyticsSummaryCards 
                    summary={summary} 
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
                        <TopicsChart topics={topics.slice(0, 5)} />
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
                        <StudyTimeChart studyTime={studyTime.slice(0, 5)} />
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
                        userRole={userRole}
                        isLoading={isLoading}
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
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <SessionsTable 
                      sessions={sessions} 
                      userRole={userRole}
                      isLoading={isLoading}
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
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="h-80">
                        <TopicsChart topics={topics} />
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
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="h-80">
                        <StudyTimeChart studyTime={studyTime} />
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
