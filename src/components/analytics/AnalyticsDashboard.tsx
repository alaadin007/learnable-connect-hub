
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getMockAnalyticsData } from "@/utils/sessionLogging";
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download, Calendar, Filter } from 'lucide-react';

// Define types for analytics data
interface Session {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: string | number;
  topicOrContent: string;
  numQueries: number;
  queries: number;
}

interface Topic {
  topic: string;
  name: string;
  count: number;
  value: number;
}

interface StudyTime {
  studentName: string;
  name: string;
  hours: number;
  week: number;
  year: number;
}

interface AnalyticsData {
  summary: {
    activeStudents: number;
    totalSessions: number;
    totalQueries: number;
    avgSessionMinutes: number;
  };
  sessions: Session[];
  topics: Topic[];
  studyTime: StudyTime[];
}

// Chart colors
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];

const AnalyticsDashboard: React.FC = () => {
  const { profile, schoolId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Get date range for filtering
  const getDateRange = () => {
    const today = new Date();
    let startDate, endDate;
    
    switch (timeRange) {
      case '7days':
        startDate = subDays(today, 7);
        endDate = today;
        break;
      case '30days':
        startDate = subDays(today, 30);
        endDate = today;
        break;
      case 'thisWeek':
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        break;
      default:
        startDate = subDays(today, 7);
        endDate = today;
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };
  
  // Fetch analytics data asynchronously
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!initialLoad) {
        setLoading(true);
      }
      
      try {
        if (!schoolId) {
          throw new Error('School ID not available');
        }
        
        const dateRange = getDateRange();

        // Simulate async fetch of mock data to avoid blocking UI
        const mockData = await new Promise<AnalyticsData>(resolve => {
          setTimeout(() => {
            resolve(getMockAnalyticsData(schoolId!, {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate
            }));
          }, 0);
        });

        setAnalyticsData(mockData);
        setDataLoaded(true);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        // Use mock data fallback async as well
        if (schoolId) {
          const mockData = await new Promise<AnalyticsData>(resolve => {
            setTimeout(() => {
              resolve(getMockAnalyticsData(schoolId!, {}));
            }, 0);
          });
          setAnalyticsData(mockData);
          setDataLoaded(true);
        }
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };
    
    fetchAnalyticsData();
  }, [schoolId, timeRange, initialLoad]);
  
  // Format duration for display
  const formatDuration = (minutes: number | string) => {
    const mins = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Memoize processed student stats to avoid repeated filtering in render
  const studentStats = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.studyTime.map(student => {
      const studentSessions = analyticsData.sessions.filter(
        session => session.userName === student.studentName
      );
      const sessionCount = studentSessions.length;
      const avgDuration = sessionCount > 0 
        ? studentSessions.reduce((sum, s) => sum + Number(s.duration), 0) / sessionCount
        : 0;
        
      return {
        ...student,
        sessionCount,
        avgDuration,
      };
    });
  }, [analyticsData]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-learnable-purple">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Export data as CSV
  const exportData = () => {
    if (!analyticsData) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "Student,Session Date,Duration (min),Topic,Queries\n";
    
    analyticsData.sessions.forEach(session => {
      const row = [
        session.userName,
        format(new Date(session.startTime), 'yyyy-MM-dd'),
        session.duration,
        session.topicOrContent,
        session.numQueries
      ].join(',');
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Only show loading on initial load
  const showLoading = initialLoad && loading && !dataLoaded;
  
  if (showLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
      </div>
    );
  }
  
  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p>No analytics data available.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            View usage statistics for {profile?.organization?.name || "your school"}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="thisWeek">This week</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.summary.activeStudents}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.summary.totalSessions}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.summary.totalQueries}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analyticsData.summary.avgSessionMinutes)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Study Time by Student</CardTitle>
                <CardDescription>Total hours spent by each student</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.studyTime}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" fill="#8884d8" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Topics Distribution</CardTitle>
                <CardDescription>Most popular topics</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.topics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.topics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topics Analysis</CardTitle>
              <CardDescription>Detailed breakdown of topics studied</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Topic</th>
                      <th className="text-right py-2 px-4 font-medium">Sessions</th>
                      <th className="text-right py-2 px-4 font-medium">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topics.map((topic) => (
                      <tr key={topic.topic} className="border-b">
                        <td className="py-2 px-4">{topic.name}</td>
                        <td className="py-2 px-4 text-right">{topic.count}</td>
                        <td className="py-2 px-4 text-right">
                          {((topic.count / analyticsData.summary.totalSessions) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Activity</CardTitle>
                  <CardDescription>Student engagement metrics</CardDescription>
                </div>
                <Select defaultValue="hours">
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours (High to Low)</SelectItem>
                    <SelectItem value="sessions">Sessions (High to Low)</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Student</th>
                      <th className="text-right py-2 px-4 font-medium">Hours</th>
                      <th className="text-right py-2 px-4 font-medium">Sessions</th>
                      <th className="text-right py-2 px-4 font-medium">Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((student) => (
                      <tr key={student.studentName} className="border-b">
                        <td className="py-2 px-4">{student.studentName}</td>
                        <td className="py-2 px-4 text-right">{student.hours}</td>
                        <td className="py-2 px-4 text-right">{student.sessionCount}</td>
                        <td className="py-2 px-4 text-right">{formatDuration(student.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Session History</CardTitle>
                  <CardDescription>Detailed session logs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Student</th>
                      <th className="text-left py-2 px-4 font-medium">Date</th>
                      <th className="text-left py-2 px-4 font-medium">Topic</th>
                      <th className="text-right py-2 px-4 font-medium">Duration</th>
                      <th className="text-right py-2 px-4 font-medium">Queries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.sessions.map((session) => (
                      <tr key={session.id} className="border-b">
                        <td className="py-2 px-4">{session.userName}</td>
                        <td className="py-2 px-4">
                          {format(new Date(session.startTime), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2 px-4">{session.topicOrContent}</td>
                        <td className="py-2 px-4 text-right">{formatDuration(session.duration)}</td>
                        <td className="py-2 px-4 text-right">{session.numQueries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
