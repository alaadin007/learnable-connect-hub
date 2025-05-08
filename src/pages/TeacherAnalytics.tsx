
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import StatsCard from '@/components/analytics/StatsCard';
import StudentSelector from '@/components/analytics/StudentSelector';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsSummaryCards } from '@/components/analytics/AnalyticsSummaryCards';
import SessionsTable from '@/components/analytics/SessionsTable';
import TopicsChart from '@/components/analytics/TopicsChart';
import StudyTimeChart from '@/components/analytics/StudyTimeChart';
import { Student, AnalyticsSummary, SessionData, TopicData } from '@/components/analytics/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

const TeacherAnalytics = () => {
  const { schoolId } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topTopics, setTopTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<any[]>([]);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
      fetchAnalyticsSummary();
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchSessions();
      fetchTopTopics();
      fetchStudyTime();
    }
  }, [schoolId, selectedStudentId, dateRange]);

  const fetchStudents = async () => {
    try {
      const { data: userSchoolId } = await supabase.rpc("get_user_school_id");
      
      if (!userSchoolId) {
        console.error('Error: Could not determine school ID');
        toast.error("Could not load students - school ID not found");
        return;
      }
      
      // Use the Edge Function to get students with their profile data
      const { data, error } = await supabase.functions.invoke("get-students", {
        body: { school_id: userSchoolId }
      });

      if (error) {
        console.error('Error fetching students:', error);
        toast.error("Could not load students");
        return;
      }

      if (data) {
        const formattedStudents: Student[] = data.map((student: any) => ({
          id: student.id,
          name: student.full_name || 'Unknown Student'
        }));
        
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error("Failed to load students");
    }
  };

  const fetchAnalyticsSummary = async () => {
    try {
      setIsLoading(true);
      
      // This would be replaced with a real API call to get summary data
      const mockSummary = {
        activeStudents: 24,
        totalSessions: 156,
        totalQueries: 1203,
        avgSessionMinutes: 18.5
      };
      
      setSummary(mockSummary);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      setIsLoading(false);
    }
  };

  const fetchSessions = async () => {
    // This would be replaced with an actual API call
    const mockSessions: SessionData[] = [];
    setSessions(mockSessions);
  };

  const fetchTopTopics = async () => {
    // This would be replaced with an actual API call
    const mockTopics: TopicData[] = [];
    setTopTopics(mockTopics);
  };

  const fetchStudyTime = async () => {
    // This would be replaced with an actual API call
    const mockStudyTime: any[] = [];
    setStudyTime(mockStudyTime);
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <Button variant="outline" onClick={fetchAnalyticsSummary}>
            Refresh Data
          </Button>
        </div>

        <StudentSelector
          students={students}
          selectedStudentId={selectedStudentId}
          onStudentChange={setSelectedStudentId}
        />
        
        <AnalyticsFilters
          dateRange={dateRange}
          onDateRangeChange={(range) => setDateRange(range as DateRange)}
        />

        <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Topics</CardTitle>
                  <CardDescription>Most studied topics</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopicsChart data={topTopics} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Study Time</CardTitle>
                  <CardDescription>Hours spent studying</CardDescription>
                </CardHeader>
                <CardContent>
                  <StudyTimeChart data={studyTime} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <CardDescription>
                  {selectedStudentId 
                    ? `Sessions for selected student from ${format(dateRange.from!, 'PPP')} to ${format(dateRange.to!, 'PPP')}`
                    : `All student sessions from ${format(dateRange.from!, 'PPP')} to ${format(dateRange.to!, 'PPP')}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionsTable sessions={sessions} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="topics">
            <Card>
              <CardHeader>
                <CardTitle>Top Topics</CardTitle>
                <CardDescription>Most frequently studied subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <TopicsChart data={topTopics} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherAnalytics;
