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

const AdminAnalytics: React.FC = () => {
  const { user, schoolId, userRole } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<{
    summary: AnalyticsSummary;
    sessions: SessionData[];
    topics: TopicData[];
    studyTime: StudyTimeData[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [schoolOptions, setSchoolOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch schools for super admin
  useEffect(() => {
    const fetchSchools = async () => {
      if (userRole !== 'school') return;

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name');

        if (error) throw error;
        
        if (data) {
          setSchoolOptions(data);
          // Set default selected school to the user's school or the first one
          setSelectedSchoolId(schoolId || (data.length > 0 ? data[0].id : null));
        }
      } catch (error) {
        console.error('Fetching schools error:', error);
      }
    };

    fetchSchools();
  }, [userRole, schoolId]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        // For demo/development, use mock data
        if (process.env.NODE_ENV === 'development' || !selectedSchoolId) {
          const mockData = getMockAnalyticsData(selectedSchoolId || 'mock-school-id', {
            startDate: format(dateRange.from || new Date(), 'yyyy-MM-dd'),
            endDate: format(dateRange.to || new Date(), 'yyyy-MM-dd')
          });
          setAnalyticsData(mockData);
          setIsLoading(false);
          return;
        }

        // In production, fetch real data from Supabase
        const startDate = format(dateRange.from || new Date(), 'yyyy-MM-dd');
        const endDate = format(dateRange.to || new Date(), 'yyyy-MM-dd');

        // Fetch summary data from the school_analytics_summary view
        const { data: summaryData, error: summaryError } = await supabase
          .from('school_analytics_summary')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .single();

        if (summaryError) throw summaryError;

        // Map the returned data to match our AnalyticsSummary interface
        const formattedSummary: AnalyticsSummary = {
          activeStudents: summaryData?.active_students || 0,
          totalSessions: summaryData?.total_sessions || 0,
          totalQueries: summaryData?.total_queries || 0,
          avgSessionMinutes: summaryData?.avg_session_minutes || 0
        };

        // Fetch session data from session_logs
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

        // Format session data to match our SessionData interface
        const formattedSessions: SessionData[] = sessionsData ? sessionsData.map((session: any) => ({
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
          // Compatibility fields
          userId: session.user_id,
          userName: session.profiles?.full_name || 'Unknown',
          startTime: session.session_start,
          endTime: session.session_end,
          duration: session.session_end ? 
            Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) : 
            0,
          topicOrContent: session.topic_or_content_used || 'General',
          numQueries: session.num_queries ?? 0,
          queries: session.num_queries ?? 0,
          // Add any other required fields from SessionData here
        })) : [];

        // Fetch topic data from most_studied_topics view
        const { data: topicsData, error: topicsError } = await supabase
          .from('most_studied_topics')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .order('count_of_sessions', { ascending: false })
          .limit(10);

        if (topicsError) throw topicsError;

        // Format topic data to match our TopicData interface
        const formattedTopics: TopicData[] = topicsData ? topicsData.map((topic: any) => ({
          topic: topic.topic_or_content_used || 'Unknown',
          count: topic.count_of_sessions || 0,
          // Compatibility fields
          name: topic.topic_or_content_used || 'Unknown',
          value: topic.count_of_sessions || 0
        })) : [];

        // Fetch study time data from student_weekly_study_time view
        const { data: studyTimeData, error: studyTimeError } = await supabase
          .from('student_weekly_study_time')
          .select('*')
          .eq('school_id', selectedSchoolId)
          .order('study_hours', { ascending: false })
          .limit(10);

        if (studyTimeError) throw studyTimeError;

        // Format study time data to match our StudyTimeData interface
        const formattedStudyTime: StudyTimeData[] = studyTimeData ? studyTimeData.map((item: any) => ({
          student_name: item.student_name || 'Unknown',
          student_id: item.user_id || '',
          total_minutes: (item.study_hours || 0) * 60,
          // Compatibility fields
          studentName: item.student_name || 'Unknown',
          name: item.student_name || 'Unknown',
          hours: item.study_hours || 0,
          week: item.week_number || 0,
          year: item.year || new Date().getFullYear()
        })) : [];

        // Combine all data
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
      fetchAnalyticsData();
    }
  }, [selectedSchoolId, dateRange]);

  // Handle school selection change
  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Render loading state
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
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          {analyticsData && <AnalyticsSummaryCards summary={analyticsData.summary} />}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Topics</CardTitle>
                <CardDescription>Most frequently studied topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.topics.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData?.topics.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Student Study Time</CardTitle>
                <CardDescription>Hours spent by top students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.studyTime.slice(0, 5)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>Recent learning sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Student</th>
                      <th className="text-left py-3 px-4">Topic</th>
                      <th className="text-left py-3 px-4">Start Time</th>
                      <th className="text-left py-3 px-4">Duration</th>
                      <th className="text-left py-3 px-4">Queries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData?.sessions.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{session.student_name}</td>
                        <td className="py-3 px-4">{session.topics ? session.topics[0] : 'Unknown'}</td>
                        <td className="py-3 px-4">{new Date(session.session_date).toLocaleString()}</td>
                        <td className="py-3 px-4">{session.duration_minutes} min</td>
                        <td className="py-3 px-4">{session.questions_asked}</td>
                      </tr>
                    ))}
                    {(!analyticsData?.sessions || analyticsData.sessions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">
                          No session data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Topics Tab */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle>Topic Analysis</CardTitle>
              <CardDescription>Most popular learning topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData?.topics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Engagement</CardTitle>
              <CardDescription>Time spent by students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData?.studyTime}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#82ca9d" name="Study Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Export Button */}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={() => alert('Export functionality will be implemented soon')}>
          Export Data
        </Button>
      </div>
    </div>
  );
};

export default AdminAnalytics;
