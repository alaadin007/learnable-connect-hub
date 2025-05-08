
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { getMockAnalyticsData } from "@/utils/analyticsUtils";
import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { TeacherSelector } from "@/components/analytics/TeacherSelector";
import Navbar from "@/components/layout/Navbar";
import { AnalyticsSummary } from "@/components/analytics/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminAnalytics = () => {
  const { schoolId } = useAuth();
  
  // State for analytics
  const [activeTab, setActiveTab] = useState("school");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  
  // Analytics data
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchAnalyticsSummary();
    }
  }, [schoolId]);

  const fetchAnalyticsSummary = async () => {
    setIsLoading(true);
    try {
      // Try to fetch real data from the database
      const { data, error } = await supabase.from("school_analytics_summary")
        .select("*")
        .eq("school_id", schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching analytics summary:', error);
        // Fallback to mock data
        const mockData = getMockAnalyticsData();
        setSummary(mockData);
      } else if (data) {
        setSummary({
          activeStudents: data.active_students || 0,
          totalSessions: data.total_sessions || 0,
          totalQueries: data.total_queries || 0,
          avgSessionMinutes: data.avg_session_minutes || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      // Use mock data as fallback
      const mockData = getMockAnalyticsData();
      setSummary(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalyticsSummary();
  };

  return (
    <>
      <Navbar />
      <div className="container py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">School Analytics</h1>
            <Button variant="outline" onClick={handleRefresh}>
              Refresh Data
            </Button>
          </div>

          <AnalyticsFilters 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedTeacherId={selectedTeacherId}
          />

          <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
              <TabsTrigger value="school">School</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="export">Export Data</TabsTrigger>
            </TabsList>

            <TabsContent value="school" className="space-y-4">
              <SchoolPerformancePanel 
                schoolId={schoolId || ''} 
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="teachers" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Teacher Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <TeacherSelector
                      schoolId={schoolId || ''}
                      selectedTeacherId={selectedTeacherId}
                      onTeacherChange={setSelectedTeacherId}
                    />
                  </div>
                  <TeacherPerformanceTable 
                    schoolId={schoolId || ''} 
                    teacherId={selectedTeacherId}
                    dateRange={dateRange}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Export Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">Select data to export as CSV:</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button variant="outline">Export Session Data</Button>
                      <Button variant="outline">Export Student Performance</Button>
                      <Button variant="outline">Export Teacher Performance</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminAnalytics;
