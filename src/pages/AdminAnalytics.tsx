
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { getMockAnalyticsData } from "@/utils/analyticsUtils";
import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { TeacherSelector } from "@/components/analytics/TeacherSelector";
import { AnalyticsSummary } from "@/components/analytics/types";

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
    // Replace with actual API call
    const mockData = getMockAnalyticsData();
    setSummary(mockData);
    setIsLoading(false);
  };

  const handleRefresh = () => {
    fetchAnalyticsSummary();
  };

  return (
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
            {/* Analytics export implementation will go here */}
            <Card>
              <CardHeader>
                <CardTitle>Export Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Export functionality is coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAnalytics;
