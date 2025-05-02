import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AnalyticsFilters, 
  AnalyticsExport, 
  AnalyticsSummaryCards 
} from "@/components/analytics";
import StudyTimeChart from "@/components/analytics/StudyTimeChart";
import TopicsChart from "@/components/analytics/TopicsChart";
import SessionsTable from "@/components/analytics/SessionsTable";
import { 
  fetchAnalyticsSummary, 
  fetchSessionLogs, 
  fetchTopics, 
  fetchStudyTime,
  getDateRangeText
} from "@/utils/analyticsUtils";
import { 
  AnalyticsFilters as FiltersType, 
  SessionData, 
  TopicData, 
  StudyTimeData, 
  AnalyticsSummary 
} from "@/components/analytics/types";
import { School, BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays } from "date-fns";
import { toast } from "sonner";

const AdminAnalytics = () => {
  const { profile, schoolId } = useAuth();
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: subDays(new Date(), 30), // Last 30 days by default
      to: new Date()
    }
  });
  
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date range text for display and export
  const dateRangeText = getDateRangeText(filters.dateRange);
  
  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [summaryData, sessionsData, topicsData, studyTimeData] = await Promise.all([
          fetchAnalyticsSummary(schoolId, filters),
          fetchSessionLogs(schoolId, filters),
          fetchTopics(schoolId, filters),
          fetchStudyTime(schoolId, filters)
        ]);
        
        // Update state with fetched data
        if (summaryData) setSummary(summaryData);
        setSessions(sessionsData);
        setTopics(topicsData);
        setStudyTime(studyTimeData);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        toast.error("Failed to load analytics data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId, filters]);
  
  // Handle filters change
  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">School Analytics Dashboard</h1>
              <p className="text-learnable-gray">
                Comprehensive analytics for {profile?.school_name || "your school"}
              </p>
            </div>
            
            <div className="flex items-center">
              <School className="w-5 h-5 mr-2 text-learnable-blue" />
              <span className="font-medium">School Code: </span>
              <span className="font-mono ml-1">{profile?.school_code || "Not available"}</span>
            </div>
          </div>
          
          {/* Filters and Export */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <BarChart2 className="w-5 h-5 mr-2 text-learnable-blue" />
                Analytics Overview
              </h2>
              
              <AnalyticsExport
                summary={summary}
                sessions={sessions}
                topics={topics}
                studyTimes={studyTime}
                dateRangeText={dateRangeText}
              />
            </div>
            
            <AnalyticsFilters 
              filters={filters} 
              onFiltersChange={handleFiltersChange} 
            />
            
            <div className="text-sm text-muted-foreground mb-4">
              Showing data for: <strong>{dateRangeText}</strong>
            </div>
          </div>
          
          {/* Summary Cards */}
          <AnalyticsSummaryCards summary={summary} isLoading={loading} />
          
          {/* Analytics Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  <>
                    <Skeleton className="h-[350px] w-full" />
                    <Skeleton className="h-[350px] w-full" />
                  </>
                ) : (
                  <>
                    <TopicsChart 
                      data={topics} 
                      title="Most Studied Topics" 
                      description="Most frequently accessed topics at your school"
                    />
                    
                    <StudyTimeChart 
                      data={studyTime} 
                      title="Student Study Time" 
                      description="Hours studied per student this week"
                    />
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="sessions">
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <SessionsTable 
                  sessions={sessions} 
                  title="Recent Learning Sessions" 
                  description="Details of student learning sessions"
                />
              )}
            </TabsContent>
            
            <TabsContent value="students">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <StudyTimeChart 
                    data={studyTime} 
                    title="Student Engagement" 
                    description="Hours studied per student this week"
                  />
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Student Performance</CardTitle>
                    <CardDescription>
                      Detailed student performance analytics will be available in a future update.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      This feature is coming soon. You'll be able to see detailed analytics on individual student performance,
                      including strengths, areas for improvement, and comparison to class averages.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
