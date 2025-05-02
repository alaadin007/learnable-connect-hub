
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { StudentPerformanceTable } from "@/components/analytics/StudentPerformanceTable";

const AdminAnalytics = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [students, setStudents] = useState<Student[]>([]); // Add students state
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: undefined,
      to: undefined
    },
    schoolId: "" // Initialize schoolId in filters
  });
  const [activeTab, setActiveTab] = useState<string>("engagement");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Performance metrics state
  const [schoolPerformanceData, setSchoolPerformanceData] = useState([]);
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState(null);
  const [teacherPerformanceData, setTeacherPerformanceData] = useState([]);
  const [studentPerformanceData, setStudentPerformanceData] = useState([]);

  // Get the schoolId properly, checking both profile structures and the schoolId from AuthContext
  const { schoolId: authSchoolId } = useAuth();
  const schoolId = authSchoolId || '';

  // Fetch students for the school
  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      // Mock data for students - in a real app, this would be an API call
      // You should replace this with your actual API call
      const mockStudents = [
        { id: '1', name: 'Student 1' },
        { id: '2', name: 'Student 2' },
        { id: '3', name: 'Student 3' },
      ];
      
      setStudents(mockStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, [schoolId]);

  // Memoized loadAnalyticsData function to prevent unnecessary re-renders
  const loadAnalyticsData = useCallback(async () => {
    if (!schoolId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Engagement metrics
      const summaryData = await fetchAnalyticsSummary(schoolId, filters);
      setSummary(summaryData);
      
      const sessionData = await fetchSessionLogs(schoolId, filters);
      // Ensure we always set an array, even if the data is undefined
      setSessions(Array.isArray(sessionData) ? sessionData : []);
      
      const topicData = await fetchTopics(schoolId, filters);
      // Ensure we always set an array, even if the data is undefined
      setTopics(Array.isArray(topicData) ? topicData : []);
      
      const studyTimeData = await fetchStudyTime(schoolId, filters);
      // Ensure we always set an array, even if the data is undefined
      setStudyTime(Array.isArray(studyTimeData) ? studyTimeData : []);
      
      // Performance metrics (only load when on performance tab)
      if (activeTab === "performance") {
        const performanceFilters = {
          ...filters
        };
        
        const schoolPerformance = await fetchSchoolPerformance(schoolId, performanceFilters);
        // Ensure we always set arrays or objects, even if data is undefined
        setSchoolPerformanceData(Array.isArray(schoolPerformance.monthlyData) ? schoolPerformance.monthlyData : []);
        setSchoolPerformanceSummary(schoolPerformance.summary || null);
        
        const teacherPerformance = await fetchTeacherPerformance(schoolId, performanceFilters);
        // Ensure we always set an array, even if the data is undefined
        setTeacherPerformanceData(Array.isArray(teacherPerformance) ? teacherPerformance : []);
        
        const studentPerformance = await fetchStudentPerformance(schoolId, performanceFilters);
        // Ensure we always set an array, even if the data is undefined
        setStudentPerformanceData(Array.isArray(studentPerformance) ? studentPerformance : []);
      }
    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, filters, activeTab, toast]);

  useEffect(() => {
    if (schoolId) {
      // Update the filters with the schoolId
      setFilters(prevFilters => ({
        ...prevFilters,
        schoolId: schoolId
      }));
      
      // Fetch students when component mounts or schoolId changes
      fetchStudents();
    }
  }, [schoolId, fetchStudents]);

  // Separate effect for loading data to prevent infinite loops
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Get the date range text for display
  const dateRangeText = getDateRangeText(filters.dateRange);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Admin Analytics</h1>
            <p className="text-learnable-gray">
              Track school-wide learning analytics and student progress
            </p>
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
                  <span className="text-foreground">{profile?.school_name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span className="text-foreground">{profile?.school_code || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AnalyticsFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showStudentSelector={true}
            showTeacherSelector={true}
            students={students} // Pass students array to AnalyticsFilters
          />
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-60" />
            </div>
          ) : !summary ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>
                Failed to load analytics data. Please try again.
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
                        <CardTitle className="text-xl font-bold">
                          Recent Learning Sessions
                        </CardTitle>
                        <CardDescription>
                          Details of student learning sessions
                          {filters.dateRange && (
                            <span className="ml-2">
                              ({getDateRangeText(filters.dateRange)})
                            </span>
                          )}
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
