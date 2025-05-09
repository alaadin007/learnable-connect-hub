
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  AnalyticsFilters,
  TopicsChart,
  StudyTimeChart,
  SessionsTable,
  AnalyticsExport,
  AnalyticsSummaryCards
} from "@/components/analytics";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import { toast } from "sonner";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { StudentPerformanceTable } from "@/components/analytics/StudentPerformancePanel";
import { getMockAnalyticsData } from "@/components/analytics/AnalyticsDashboard";

const AdminAnalytics = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Use derived school ID with fallback
  const schoolId = useMemo(() => {
    return getSchoolIdWithFallback();
  }, []);
  
  const [summary, setSummary] = useState({
    activeStudents: 12,
    totalSessions: 35,
    totalQueries: 105,
    avgSessionMinutes: 22
  });
  
  const [sessions, setSessions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [studyTime, setStudyTime] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    schoolId,
  });
  const [activeTab, setActiveTab] = useState("engagement");
  const [schoolInfo, setSchoolInfo] = useState({
    name: profile?.organization?.name || "Your School",
    code: profile?.organization?.code || profile?.school_code || "DEMO-CODE"
  });

  // Performance metrics state with mock data
  const [schoolPerformanceData, setSchoolPerformanceData] = useState([
    { month: "Jan", score: 78 },
    { month: "Feb", score: 80 },
    { month: "Mar", score: 82 },
    { month: "Apr", score: 85 },
    { month: "May", score: 87 }
  ]);
  
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState({
    averageScore: 85,
    trend: 'up',
    changePercentage: 5,
  });
  
  const [teacherPerformanceData, setTeacherPerformanceData] = useState([
    { id: '1', name: 'Teacher 1', students: 25, avgScore: 82, trend: 'up' },
    { id: '2', name: 'Teacher 2', students: 18, avgScore: 79, trend: 'up' },
    { id: '3', name: 'Teacher 3', students: 30, avgScore: 88, trend: 'up' }
  ]);
  
  const [studentPerformanceData, setStudentPerformanceData] = useState([
    { id: '1', name: 'Student 1', teacher: 'Various Teachers', avgScore: 85, trend: 'up', subjects: ['Math', 'Science'] },
    { id: '2', name: 'Student 2', teacher: 'Various Teachers', avgScore: 78, trend: 'down', subjects: ['English', 'History'] },
    { id: '3', name: 'Student 3', teacher: 'Various Teachers', avgScore: 92, trend: 'up', subjects: ['Art', 'Music'] }
  ]);

  // Load analytics data immediately
  useEffect(() => {
    // Get mock data for instant loading without API calls
    const analyticsData = getMockAnalyticsData(schoolId);
    
    // Set all states at once with mock data
    setSummary(analyticsData.summary);
    setSessions(analyticsData.sessions);
    setTopics(analyticsData.topics);
    setStudyTime(analyticsData.studyTime);
    
    // Mock student data
    const mockStudents = Array(12).fill(null).map((_, i) => ({
      id: `student-${i+1}`,
      name: `Student ${i+1}`
    }));
    setStudents(mockStudents);
    
    // Set school info from profile or defaults
    if (profile?.organization) {
      setSchoolInfo({
        name: profile.organization.name || "Your School",
        code: profile.organization.code || profile?.school_code || "DEMO-CODE"
      });
    }
  }, [schoolId, profile]);

  const handleRefreshData = useCallback(() => {
    toast.success("Analytics data refreshed");
    
    // Get new mock data for instant refresh
    const refreshedData = getMockAnalyticsData(schoolId);
    setSummary(refreshedData.summary);
    setSessions(refreshedData.sessions);
    setTopics(refreshedData.topics);
    setStudyTime(refreshedData.studyTime);
  }, [schoolId]);

  const handleBackClick = useCallback(() => {
    navigate("/admin", { state: { preserveContext: true } });
  }, [navigate]);

  const handleTabChange = useCallback((value) => {
    setActiveTab(value);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    // Get filtered mock data
    const filteredData = getMockAnalyticsData(schoolId);
    setSummary(filteredData.summary);
    setSessions(filteredData.sessions);
    setTopics(filteredData.topics);
    setStudyTime(filteredData.studyTime);
  }, [schoolId]);

  const dateRangeText = useMemo(() => {
    const { from, to } = filters.dateRange;
    if (!from) return "";
    const fromDate = from.toLocaleDateString();
    const toDate = to ? to.toLocaleDateString() : "Present";
    return `${fromDate} - ${toDate}`;
  }, [filters.dateRange]);

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
                    {schoolInfo.name}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span className="text-foreground">
                    {schoolInfo.code}
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
            <Button onClick={handleRefreshData} variant="outline" className="flex items-center">
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
                  monthlyData={schoolPerformanceData}
                  summary={schoolPerformanceSummary}
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
