import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; 
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getMockAnalyticsData } from '@/utils/sessionLogger';
import { DateRange, AnalyticsSummary, SessionData, TopicData, StudyTimeData } from '@/components/analytics/types';
import { AnalyticsSummaryCards } from '@/components/analytics/AnalyticsSummaryCards';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface School {
  id: string;
  name: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  sessions: SessionData[];
  topics: TopicData[];
  studyTime: StudyTimeData[];
}

interface SessionLog {
  id: string;
  user_id: string;
  topic_or_content_used: string;
  session_start: string;
  session_end: string | null;
  num_queries: number;
  profiles: {
    full_name: string;
  };
}

interface TopicLog {
  topic_or_content_used: string;
  count_of_sessions: number;
}

interface StudyTimeLog {
  student_name: string;
  user_id: string;
  study_hours: number;
  week_number: number;
  year: number;
}

const AdminAnalytics: React.FC = () => {
  const { user, schoolId, userRole } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch schools for super admin
  useEffect(() => {
    const fetchSchools = async (): Promise<void> => {
      if (userRole !== 'school') return;

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name');

        if (error) throw error;
        
        if (data) {
          setSchoolOptions(data);
          setSelectedSchoolId(schoolId || (data.length > 0 ? data[0].id : null));
        }
      } catch (error) {
        console.error('Fetching schools error:', error);
      }
    };

    void fetchSchools();
  }, [userRole, schoolId]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async (): Promise<void> => {
      setIsLoading(true);
      
      try {
        if (process.env.NODE_ENV === 'development' || !selectedSchoolId) {
          const mockData = getMockAnalyticsData(selectedSchoolId || 'mock-school-id', {
            startDate: format(dateRange.from || new Date(), 'yyyy-MM-dd'),
            endDate: format(dateRange.to || new Date(), 'yyyy-MM-dd')
          });
          setAnalyticsData(mockData);
          setIsLoading(false);
          return;
        }

        const startDate = format(dateRange.from || new Date(), 'yyyy-MM-dd');
        const endDate = format(dateRange.to || new Date(), 'yyyy-MM-dd');

        const { data: summaryData, error: summaryError } = await supabase
          .from('school_analytics_summary')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .single();

        if (summaryError) throw summaryError;

        const formattedSummary: AnalyticsSummary = {
          activeStudents: summaryData?.active_students || 0,
          totalSessions: summaryData?.total_sessions || 0,
          totalQueries: summaryData?.total_queries || 0,
          avgSessionMinutes: summaryData?.avg_session_minutes || 0
        };

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('session_logs')
          .select(`
            id, 
            user_id,
            topic_or_content_used,
            session_start,
            session_end,
            num_queries,
            profiles:user_id (full_name)
          `)
          .eq('school_id', selectedSchoolId)
          .gte('session_start', startDate)
          .lte('session_start', endDate)
          .order('session_start', { ascending: false });

        if (sessionsError) throw sessionsError;

        const formattedSessions: SessionData[] = (sessionsData as SessionLog[]).map(session => ({
          id: session.id,
          student_id: session.user_id,
          student_name: session.profiles?.full_name || 'Unknown',
          session_date: session.session_start,
          duration_minutes: session.session_end ? 
            Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) : 
            0,
          topics: [session.topic_or_content_used || 'General'],
          questions_asked: session.num_queries ?? 0,
          questions_answered: session.num_queries ?? 0,
          userId: session.user_id,
          userName: session.profiles?.full_name || 'Unknown',
          startTime: session.session_start,
          endTime: session.session_end,
          duration: session.session_end ? 
            Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) : 
            0,
          topicOrContent: session.topic_or_content_used || 'General',
          numQueries: session.num_queries ?? 0,
          queries: session.num_queries ?? 0
        }));

        const { data: topicsData, error: topicsError } = await supabase
          .from('most_studied_topics')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .order('count_of_sessions', { ascending: false })
          .limit(10);

        if (topicsError) throw topicsError;

        const formattedTopics: TopicData[] = (topicsData as TopicLog[]).map(topic => ({
          topic: topic.topic_or_content_used || 'Unknown',
          count: topic.count_of_sessions || 0,
          name: topic.topic_or_content_used || 'Unknown',
          value: topic.count_of_sessions || 0
        }));

        const { data: studyTimeData, error: studyTimeError } = await supabase
          .from('student_weekly_study_time')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .order('study_hours', { ascending: false })
          .limit(10);

        if (studyTimeError) throw studyTimeError;

        const formattedStudyTime: StudyTimeData[] = (studyTimeData as StudyTimeLog[]).map(item => ({
          student_name: item.student_name || 'Unknown',
          student_id: item.user_id || '',
          total_minutes: (item.study_hours || 0) * 60,
          studentName: item.student_name || 'Unknown',
          name: item.student_name || 'Unknown',
          hours: item.study_hours || 0,
          week: item.week_number || 0,
          year: item.year || new Date().getFullYear()
        }));

        setAnalyticsData({
          summary: formattedSummary,
          sessions: formattedSessions,
          topics: formattedTopics,
          studyTime: formattedStudyTime
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedSchoolId) {
      void fetchAnalyticsData();
    }
  }, [selectedSchoolId, dateRange]);

  const handleSchoolChange = (schoolId: string): void => {
    setSelectedSchoolId(schoolId);
  };

  const handleDateRangeChange = (range: DateRange): void => {
    setDateRange(range);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-learnable-blue"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {schoolOptions.length > 0 && (
          <div className="w-full md:w-1/3">
            <Select value={selectedSchoolId || ''} onValueChange={handleSchoolChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                {schoolOptions.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="w-full md:w-2/3">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={handleDateRangeChange}
          />
        </div>
      </div>
      
      {/* Rest of the JSX remains the same */}
      {/* ... */}
    </div>
  );
};

export default AdminAnalytics;