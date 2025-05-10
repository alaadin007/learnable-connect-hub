import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import SchoolCodeManager from '@/components/school-admin/SchoolCodeManager';
import { usePagePerformance } from '@/hooks/usePagePerformance';

const SchoolAdmin = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [schoolStats, setSchoolStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    activeStudents: 0,
    pendingStudents: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Track performance
  usePagePerformance("SchoolAdmin");

  useEffect(() => {
    if (user) {
      // Load school data and stats
      loadSchoolData();
    }
  }, [user, profile]);

  const loadSchoolData = async () => {
    setIsLoading(true);
    try {
      // Get school information
      const schoolId = profile?.school_id;
      if (!schoolId) {
        throw new Error("No school associated with this account");
      }
      
      // Call the RPC to get school info
      const { data: schoolInfo, error: schoolError } = await supabase.rpc(
        'get_school_by_id',
        { school_id_param: schoolId }
      );
      
      if (schoolError) throw schoolError;
      
      if (schoolInfo && schoolInfo.length > 0) {
        setSchoolData(schoolInfo[0]);
      }
      
      // Get stats data
      await loadSchoolStats(schoolId);
      
    } catch (error) {
      console.error("Error loading school data:", error);
      toast.error("Failed to load school data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadSchoolStats = async (schoolId: string) => {
    try {
      // Get teacher count
      const { data: teachers, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', schoolId);
      
      if (teacherError) throw teacherError;
      
      // Get student counts by status
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, status')
        .eq('school_id', schoolId);
      
      if (studentError) throw studentError;
      
      setSchoolStats({
        totalTeachers: teachers?.length || 0,
        totalStudents: students?.length || 0,
        activeStudents: students?.filter(s => s.status === 'active').length || 0,
        pendingStudents: students?.filter(s => s.status === 'pending').length || 0
      });
      
    } catch (error) {
      console.error("Error loading school stats:", error);
    }
  };

  const handleCodeGenerated = (code: string) => {
    toast.success(`New school code generated: ${code}`);
  };

  const handleTeacherInvite = () => {
    navigate('/admin/teachers');
  };

  const handleStudentManagement = () => {
    navigate('/admin/students');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500">Loading school information...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* School Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>
            Overview of your school and quick actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schoolData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold">{schoolData.name}</h3>
                  <p className="text-sm text-gray-500">School Code: {schoolData.code}</p>
                  <p className="text-sm text-gray-500">Contact: {schoolData.contact_email}</p>
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600">Teachers</p>
                      <p className="text-2xl font-bold">{schoolStats.totalTeachers}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">Students</p>
                      <p className="text-2xl font-bold">{schoolStats.totalStudents}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm text-amber-600">Active Students</p>
                      <p className="text-2xl font-bold">{schoolStats.activeStudents}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-600">Pending Students</p>
                      <p className="text-2xl font-bold">{schoolStats.pendingStudents}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleTeacherInvite}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Teachers
                </Button>
                <Button onClick={handleStudentManagement} variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4 text-amber-600 bg-amber-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p>School information not available. Please contact support.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* School Code and Invitation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SchoolCodeGenerator onCodeGenerated={(code) => toast.success(`New school code generated: ${code}`)} />
        <SchoolCodeManager onCodeGenerated={(code) => toast.success(`New school code generated: ${code}`)} />
      </div>
      
      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Recent activity in your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-gray-500">
            Activity dashboard coming soon. You'll be able to monitor student engagement, teacher activity, and more.
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default SchoolAdmin;
