import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import StudentMetricsPanel from '@/components/analytics/StudentMetricsPanel';
import TeacherMetricsPanel from '@/components/analytics/TeacherMetricsPanel';

interface AdminAnalyticsProps {}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = () => {
  const { user, profile, schoolId } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  
  const [studentMetrics, setStudentMetrics] = useState<any[]>([]);
  const [teacherMetrics, setTeacherMetrics] = useState<any[]>([]);
  
  useEffect(() => {
    if (schoolId) {
      loadAnalytics();
    }
  }, [schoolId, timeRange]);
  
  const loadAnalytics = async () => {
    setIsLoading(true);
    
    try {
      // Load student metrics
      const studentData = await loadStudentMetrics();
      setStudentMetrics(studentData || []);
      
      // Load teacher metrics
      const teacherData = await loadTeacherMetrics();
      setTeacherMetrics(teacherData || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadStudentMetrics = async () => {
    // Check if we have a real school ID
    if (!schoolId) return [];
    
    try {
      // Use the new security definer function instead of the view
      const { data, error } = await supabase.rpc('get_student_performance_metrics_view', {
        p_school_id: schoolId
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching student metrics:', error);
      return [];
    }
  };
  
  const loadTeacherMetrics = async () => {
    // Check if we have a real school ID
    if (!schoolId) return [];
    
    try {
      // Use the new security definer function instead of the view
      const { data, error } = await supabase.rpc('get_teacher_performance_metrics_view', {
        p_school_id: schoolId
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching teacher metrics:', error);
      return [];
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }
    
    return (
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="overview">
            <OverviewPanel />
          </TabsContent>
          
          <TabsContent value="students">
            {/* Pass the data properly */}
            <StudentMetricsPanel data={studentMetrics} schoolId={schoolId} />
          </TabsContent>
          
          <TabsContent value="teachers">
            {/* Pass the data properly */}
            <TeacherMetricsPanel data={teacherMetrics} schoolId={schoolId} />
          </TabsContent>
          
          <TabsContent value="content">
            <ContentAnalyticsPanel />
          </TabsContent>
        </div>
      </Tabs>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8">
          <h1 className="text-3xl font-bold">School Analytics</h1>
          
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Time Range</SelectLabel>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 3 months</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

// Loading state component
const LoadingState = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder components
const OverviewPanel = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>School Performance Overview</CardTitle>
        <CardDescription>Key metrics for your school</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Students" value="--" />
          <MetricCard title="Engagement Rate" value="--%" />
          <MetricCard title="Average Score" value="--%" />
          <MetricCard title="Sessions" value="--" />
        </div>
      </CardContent>
    </Card>
  </div>
);

const ContentAnalyticsPanel = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Content Analytics</CardTitle>
        <CardDescription>Insights into content usage and effectiveness</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Content analytics data will be displayed here.</p>
      </CardContent>
    </Card>
  </div>
);

const MetricCard = ({ title, value }: { title: string; value: string }) => (
  <div className="bg-white rounded-lg p-4 border shadow-sm">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

export default AdminAnalytics;
