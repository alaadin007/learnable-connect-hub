
import React, { useState, useEffect } from "react";
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
import { AnalyticsFilters as FiltersType, SessionData, TopicData, StudyTimeData } from "@/components/analytics/types";
import { useToast } from "@/components/ui/use-toast";

const AdminAnalytics = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      from: undefined,
      to: undefined
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Get the school_id from the profile, handling both profile structures
  const schoolId = profile?.school_id || (profile as any)?.school?.id;

  useEffect(() => {
    if (schoolId) {
      loadAnalyticsData();
    }
  }, [schoolId, filters]);

  const loadAnalyticsData = async () => {
    if (!schoolId) return;
    setIsLoading(true);
    
    try {
      const summaryData = await fetchAnalyticsSummary(schoolId, filters);
      setSummary(summaryData);
      
      const sessionData = await fetchSessionLogs(schoolId, filters);
      setSessions(sessionData);
      
      const topicData = await fetchTopics(schoolId, filters);
      setTopics(topicData);
      
      const studyTimeData = await fetchStudyTime(schoolId, filters);
      setStudyTime(studyTimeData);
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
  };

  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
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
                  <span>{profile?.school_name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Code:</span>
                  <span>{profile?.school_code || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AnalyticsFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showStudentSelector={true}
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
              <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />
              
              <Card>
                <CardHeader className="flex items-center justify-between">
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
                  />
                </CardContent>
              </Card>
              
              <Tabs defaultValue="topics" className="w-full">
                <TabsList>
                  <TabsTrigger value="topics">Most Studied Topics</TabsTrigger>
                  <TabsTrigger value="studytime">Student Study Time</TabsTrigger>
                </TabsList>
                <TabsContent value="topics">
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Studied Topics</CardTitle>
                      <CardDescription>
                        Top 10 topics students are currently studying
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TopicsChart data={topics} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="studytime">
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Study Time</CardTitle>
                      <CardDescription>
                        Weekly study time per student
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StudyTimeChart data={studyTime} />
                    </CardContent>
                  </Card>
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
