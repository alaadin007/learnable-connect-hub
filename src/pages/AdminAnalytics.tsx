import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";

// Import the helper for type casting
import { asSchoolId } from '@/utils/supabaseTypeHelpers';
import type { Database } from '@/integrations/supabase/types';

const AdminAnalytics = () => {
  const { user, profile, userRole, schoolId } = useAuth();
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [studentEngagement, setStudentEngagement] = useState<any[]>([]);
  const [teacherActivity, setTeacherActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && schoolId) {
      fetchAnalyticsData();
    }
  }, [user, schoolId]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Cast school ID to proper type
      const typedSchoolId = asSchoolId(schoolId);
      
      // Get basic analytics summary
      const { data: analyticsSummary, error: summaryError } = await supabase
        .from('school_analytics_summary')
        .select('*')
        .eq('school_id', typedSchoolId)
        .limit(1);
        
      if (summaryError) throw summaryError;
      
      // Get performance metrics
      const { data: performanceData, error: perfError } = await supabase
        .from('school_performance_metrics')
        .select('*')
        .eq('school_id', typedSchoolId)
        .limit(1);
        
      if (perfError) throw perfError;
      
      // Get student engagement data
      const { data: studentData, error: studentError } = await supabase
        .from('student_engagement_metrics')
        .select('*')
        .eq('school_id', typedSchoolId);
        
      if (studentError) throw studentError;
      
      // Get teacher activity data
      const { data: teacherData, error: teacherError } = await supabase
        .from('teacher_activity_metrics')
        .select('*')
        .eq('school_id', typedSchoolId);
        
      if (teacherError) throw teacherError;

      setAnalyticsSummary(analyticsSummary?.[0] || null);
      setPerformanceMetrics(performanceData?.[0] || null);
      setStudentEngagement(studentData || []);
      setTeacherActivity(teacherData || []);
    } catch (error: any) {
      console.error("Error fetching analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const renderBarChart = (data: any[], dataKey: string, name: string) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} name={name} fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (data: any[], nameKey: string, valueKey: string) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (!user || !schoolId) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const fallbackRole = getUserRoleWithFallback();
  const effectiveRole = userRole || fallbackRole;
  const isAdmin = isSchoolAdmin(effectiveRole);

  if (!isAdmin) {
    return <div className="flex justify-center items-center h-screen">Unauthorized</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-6">Admin Analytics</h1>

          {isLoading ? (
            <div className="flex justify-center items-center h-48">Loading analytics data...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>School Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsSummary ? (
                      <>
                        <p>Total Students: {analyticsSummary.total_students}</p>
                        <p>Total Teachers: {analyticsSummary.total_teachers}</p>
                        <p>Total Courses: {analyticsSummary.total_courses}</p>
                      </>
                    ) : (
                      <p>No summary data available.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceMetrics ? (
                      <>
                        <p>Average Test Score: {performanceMetrics.average_test_score}</p>
                        <p>Attendance Rate: {performanceMetrics.attendance_rate}%</p>
                      </>
                    ) : (
                      <p>No performance data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {studentEngagement.length > 0 ? (
                      renderBarChart(studentEngagement, 'engagement_score', 'Engagement Score')
                    ) : (
                      <p>No student engagement data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Teacher Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teacherActivity.length > 0 ? (
                      renderPieChart(teacherActivity, 'teacher_name', 'activity_count')
                    ) : (
                      <p>No teacher activity data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
