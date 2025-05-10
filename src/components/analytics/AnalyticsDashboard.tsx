import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from './DateRangePicker';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import { AnalyticsExport } from './AnalyticsExport';
import SessionsTable from './SessionsTable';
import StudentPerformanceTable from './StudentPerformancePanel';
import { SchoolPerformancePanel } from './SchoolPerformancePanel';
import { 
  AnalyticsSummary, 
  SessionData, 
  TopicData, 
  StudyTimeData,
  StudentPerformanceData,
  SchoolPerformanceData,
  SchoolPerformanceSummary
} from './types';

interface AnalyticsDashboardProps {
  schoolId?: string;
  teacherId?: string;
  studentId?: string;
  defaultTab?: string;
  showFilters?: boolean;
  showExport?: boolean;
}

export function AnalyticsDashboard({
  schoolId: propSchoolId,
  teacherId,
  studentId,
  defaultTab = 'overview',
  showFilters = true,
  showExport = true
}: AnalyticsDashboardProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTimes, setStudyTimes] = useState<StudyTimeData[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceData[]>([]);
  const [schoolPerformance, setSchoolPerformance] = useState<SchoolPerformanceData[]>([]);
  const [schoolSummary, setSchoolSummary] = useState<SchoolPerformanceSummary>({
    total_assessments: 0,
    total_students: 0,
    students_with_submissions: 0,
    student_participation_rate: 0,
    avg_score: 0,
    completion_rate: 0,
    improvement_rate: 0,
    avg_submissions_per_assessment: 0
  });

  // Fix the profile.organization access with proper type checking
  const schoolId = propSchoolId || profile?.school_id || (profile?.organization && profile.organization.id) || "test-school-0";

  useEffect(() => {
    if (schoolId) {
      loadAnalyticsData();
    }
  }, [schoolId, dateRange, teacherId, studentId]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Prepare filters
      const filters: Record<string, any> = {
        start_date: dateRange?.from?.toISOString(),
        end_date: dateRange?.to?.toISOString(),
      };

      if (teacherId) filters.teacher_id = teacherId;
      if (studentId) filters.student_id = studentId;

      // Load summary data - use normal SQL query instead of RPC
      const { data: summaryData, error: summaryError } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('school_id', schoolId)
        .single();

      if (summaryError) throw summaryError;
      
      if (summaryData) {
        setSummary({
          activeStudents: summaryData.active_students || 0,
          totalSessions: summaryData.total_sessions || 0,
          totalQueries: summaryData.total_queries || 0,
          avgSessionMinutes: summaryData.avg_session_minutes || 0
        });
      }

      // Load sessions data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load topics data
      const { data: topicsData, error: topicsError } = await supabase
        .from('popular_topics')
        .select('*')
        .eq('school_id', schoolId);

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // Load study time data
      const { data: studyTimeData, error: studyTimeError } = await supabase
        .from('student_study_time')
        .select('*')
        .eq('school_id', schoolId);

      if (studyTimeError) throw studyTimeError;
      setStudyTimes(studyTimeData || []);

      // Load student performance data
      const { data: studentPerfData, error: studentPerfError } = await supabase
        .from('student_performance')
        .select('*')
        .eq('school_id', schoolId);

      if (studentPerfError) throw studentPerfError;
      setStudentPerformance(studentPerfData || []);

      // Load school performance data
      const { data: schoolPerfData, error: schoolPerfError } = await supabase
        .from('school_performance')
        .select('*')
        .eq('school_id', schoolId);

      if (schoolPerfError) throw schoolPerfError;
      setSchoolPerformance(schoolPerfData || []);

      // Load school summary data
      const { data: schoolSummaryData, error: schoolSummaryError } = await supabase
        .from('school_performance_summary')
        .select('*')
        .eq('school_id', schoolId)
        .single();

      if (schoolSummaryError) throw schoolSummaryError;
      if (schoolSummaryData) {
        setSchoolSummary(schoolSummaryData);
      }

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const getDateRangeText = () => {
    if (!dateRange?.from) return 'All time';
    
    const fromDate = dateRange.from.toLocaleDateString();
    const toDate = dateRange.to ? dateRange.to.toLocaleDateString() : 'Present';
    
    return `${fromDate} - ${toDate}`;
  };

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
          
          <div className="flex items-center gap-2">
            <AnalyticsFilters dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
            
            {showExport && (
              <AnalyticsExport 
                summary={summary}
                sessions={sessions}
                topics={topics}
                studyTimes={studyTimes}
                dateRangeText={getDateRangeText()}
              />
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-[120px] w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[300px] w-full" />
              </div>
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <AnalyticsSummaryCards 
                summary={summary} 
                isLoading={isLoading}
                dateRange={dateRange}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Topics</CardTitle>
                    <CardDescription>Most frequently studied topics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topics.length === 0 ? (
                      <div className="flex justify-center items-center h-[200px] text-muted-foreground">
                        No topic data available
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        {/* Topic chart would go here */}
                        <pre>{JSON.stringify(topics.slice(0, 5), null, 2)}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Study Time</CardTitle>
                    <CardDescription>Total study time by student (minutes)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studyTimes.length === 0 ? (
                      <div className="flex justify-center items-center h-[200px] text-muted-foreground">
                        No study time data available
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        {/* Study time chart would go here */}
                        <pre>{JSON.stringify(studyTimes.slice(0, 5), null, 2)}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6">
                <SessionsTable 
                  sessions={sessions.slice(0, 5)} 
                  title="Recent Sessions"
                  description="Latest learning sessions"
                  isLoading={isLoading}
                />
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="students" className="pt-6">
          <StudentPerformanceTable 
            data={studentPerformance} 
            isLoading={isLoading} 
          />
        </TabsContent>
        
        <TabsContent value="sessions" className="pt-6">
          <SessionsTable 
            sessions={sessions} 
            title="All Sessions"
            description="Complete history of learning sessions"
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="performance" className="pt-6">
          <SchoolPerformancePanel 
            data={schoolPerformance}
            summary={schoolSummary}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
