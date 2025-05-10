
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '@/components/layout/TeacherLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, BarChart2, FileText, MessageSquare } from 'lucide-react';
import { usePagePerformance } from '@/hooks/usePagePerformance';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeAssessments: 0,
    completedAssessments: 0,
    averageScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Track performance
  usePagePerformance("TeacherDashboard");
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.school_id) return;
      
      setIsLoading(true);
      try {
        // Get student count
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', profile.school_id);
          
        if (studentsError) throw studentsError;
        
        // Get assessment stats
        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('*')
          .eq('school_id', profile.school_id);
          
        if (assessmentsError) throw assessmentsError;
        
        // Calculate stats
        const active = assessments?.filter(a => new Date(a.due_date) > new Date()).length || 0;
        const completed = assessments?.filter(a => a.status === 'completed').length || 0;
        
        setStats({
          totalStudents: students?.length || 0,
          activeAssessments: active,
          completedAssessments: completed,
          averageScore: 82 // Placeholder, would calculate from real data
        });
      } catch (error) {
        console.error("Error fetching teacher dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [profile?.school_id]);

  return (
    <TeacherLayout 
      title="Teacher Dashboard" 
      subtitle="Monitor student progress and manage educational resources"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.totalStudents}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <FileText className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Assessments</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.activeAssessments}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <FileText className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed Assessments</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.completedAssessments}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <BarChart2 className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : `${stats.averageScore}%`}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Student Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-gray-500">Loading student activity...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Student activity tracking will be available soon.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/teacher/analytics')}
                >
                  View Analytics
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/teacher/students')}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/teacher/assessments/create')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Assessment
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/chat')}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Open AI Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
