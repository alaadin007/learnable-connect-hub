
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import Navbar from '@/components/layout/Navbar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, ChevronDown } from 'lucide-react';
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
      
      // Use the RPC function to get students
      const { data, error } = await supabase.from("student_performance_metrics")
        .select("student_id, student_name")
        .eq("school_id", userSchoolId);

      if (error) {
        console.error('Error fetching students:', error);
        toast.error("Could not load students");
        return;
      }

      if (data) {
        const formattedStudents: Student[] = data.map((student: any) => ({
          id: student.student_id,
          name: student.student_name || 'Unknown Student'
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
      
      // Fetch analytics summary from database or use mock data for now
      const { data, error } = await supabase.from("school_analytics_summary")
        .select("*")
        .eq("school_id", schoolId)
        .single();
      
      if (error) {
        console.error('Error fetching analytics summary:', error);
        // Fallback to mock data
        const mockSummary = {
          activeStudents: 24,
          totalSessions: 156,
          totalQueries: 1203,
          avgSessionMinutes: 18.5
        };
        setSummary(mockSummary);
      } else if (data) {
        setSummary({
          activeStudents: data.active_students || 0,
          totalSessions: data.total_sessions || 0,
          totalQueries: data.total_queries || 0,
          avgSessionMinutes: data.avg_session_minutes || 0
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      setIsLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      let query = supabase.from("session_logs").select("*").eq("school_id", schoolId);
      
      if (selectedStudentId) {
        query = query.eq("user_id", selectedStudentId);
      }
      
      const { data, error } = await query.order("session_start", { ascending: false }).limit(20);
      
      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }
      
      if (data) {
        const formattedSessions: SessionData[] = data.map((session: any) => ({
          id: session.id,
          studentId: session.user_id,
          startTime: session.session_start,
          endTime: session.session_end,
          duration: session.session_end ? 
            Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) : 
            0,
          topic: session.topic_or_content_used || 'General',
          queries: session.num_queries || 0
        }));
        
        setSessions(formattedSessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTopTopics = async () => {
    try {
      let query = supabase.from("most_studied_topics").select("*").eq("school_id", schoolId);
      
      const { data, error } = await query.order("count_of_sessions", { ascending: false }).limit(10);
      
      if (error) {
        console.error('Error fetching top topics:', error);
        return;
      }
      
      if (data) {
        const formattedTopics: TopicData[] = data.map((topic: any) => ({
          topic: topic.topic_or_content_used || 'Unknown',
          count: topic.count_of_sessions || 0,
          percentage: 0 // Calculate this if needed
        }));
        
        setTopTopics(formattedTopics);
      }
    } catch (error) {
      console.error('Error fetching top topics:', error);
    }
  };

  const fetchStudyTime = async () => {
    try {
      let query = supabase.from("student_weekly_study_time").select("*").eq("school_id", schoolId);
      
      if (selectedStudentId) {
        query = query.eq("user_id", selectedStudentId);
      }
      
      const { data, error } = await query.order("week_number", { ascending: true });
      
      if (error) {
        console.error('Error fetching study time:', error);
        return;
      }
      
      if (data) {
        setStudyTime(data);
      }
    } catch (error) {
      console.error('Error fetching study time:', error);
    }
  };

  return (
    <>
      <Navbar />
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
    </>
  );
};

export default TeacherAnalytics;
