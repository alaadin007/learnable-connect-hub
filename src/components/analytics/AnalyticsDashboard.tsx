
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
  getAnalyticsSummary,
  getSessionLogs,
  getPopularTopics,
  getStudentStudyTime,
  getStudentPerformance,
  getSchoolPerformance,
  getSchoolPerformanceSummary,
  getUserSchoolId
} from '@/utils/apiHelpers';
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
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(propSchoolId || null);

  // Fix the profile.school_id access with proper type checking
  useEffect(() => {
    const fetchSchoolId = async () => {
      // Use prop schoolId if provided
      if (propSchoolId) {
        setCurrentSchoolId(propSchoolId);
        return;
      }
      
      // Try to get school ID from profile
      if (profile?.school_id) {
        setCurrentSchoolId(profile.school_id);
        return;
      }
      
      // Try to get from organization object if it exists
      if (profile?.organization?.id) {
        setCurrentSchoolId(profile.organization.id);
        return;
      }
      
      // Try to get from database as last resort
      if (profile?.id) {
        const schoolId = await getUserSchoolId(profile.id);
        if (schoolId) {
          setCurrentSchoolId(schoolId);
          return;
        }
      }
      
      // Set to test school ID as fallback
      setCurrentSchoolId("test-school-0");
    };
    
    fetchSchoolId();
  }, [propSchoolId, profile]);

  useEffect(() => {
    if (currentSchoolId) {
      loadAnalyticsData();
    }
  }, [currentSchoolId, dateRange, teacherId, studentId]);

  const loadAnalyticsData = async () => {
    if (!currentSchoolId) return;
    
    setIsLoading(true);
    try {
      // Load summary data
      const summaryData = await getAnalyticsSummary(currentSchoolId);
      
      if (summaryData) {
        setSummary({
          activeStudents: summaryData.active_students || 0,
          totalSessions: summaryData.total_sessions || 0,
          totalQueries: summaryData.total_queries || 0,
          avgSessionMinutes: summaryData.avg_session_minutes || 0
        });
      }

      // Load sessions data
      const sessionsData = await getSessionLogs(currentSchoolId);
      
      // Map session_logs to SessionData format
      const mappedSessions: SessionData[] = sessionsData.map(session => ({
        id: session.id,
        student_id: session.user_id,
        student_name: "Student", // We'd need to fetch this separately
        start_time: session.session_start,
        end_time: session.session_end || new Date().toISOString(),
        duration_minutes: session.session_end ? 
          Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) :
          0,
        queries_count: session.num_queries || 0,
        topic: session.topic_or_content_used
      }));
      
      setSessions(mappedSessions);

      // Load topics data
      const topicsData = await getPopularTopics(currentSchoolId);
      setTopics(topicsData);

      // Load study time data
      const studyTimeData = await getStudentStudyTime(currentSchoolId);
      setStudyTimes(studyTimeData);

      // Load student performance data
      const studentPerfData = await getStudentPerformance(currentSchoolId);
      setStudentPerformance(studentPerfData);

      // Load school performance data
      const schoolPerfData = await getSchoolPerformance(currentSchoolId);
      setSchoolPerformance(schoolPerfData);

      // Load school summary data
      const schoolSummaryData = await getSchoolPerformanceSummary(currentSchoolId);
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
