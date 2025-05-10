
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Users, BookOpen, School, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import SchoolCodeManager from '@/components/school-admin/SchoolCodeManager';

const SchoolAdmin = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [schoolStats, setSchoolStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    activeStudents: 0,
    pendingStudents: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }
      
      if (profile?.user_type !== 'school_admin' && profile?.user_type !== 'teacher_supervisor') {
        toast.error("You don't have access to this page");
        navigate('/dashboard');
        return;
      }
      
      // Load school data and stats
      loadSchoolData();
    }
  }, [loading, user, profile, navigate]);

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

  if (loading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
          <p className="mt-2 text-gray-600">Loading school admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-grow bg-learnable-super-light flex">
        <Sidebar className="hidden lg:block">
          <div className="px-4 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">School Administration</h2>
              <p className="text-sm text-gray-500">Manage your school</p>
            </div>
            <Separator />
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-1.5 py-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal"
                  onClick={() => navigate('/admin/overview')}
                >
                  <School className="mr-2 h-4 w-4" />
                  School Overview
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal"
                  onClick={() => navigate('/admin/teachers')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Teachers
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal"
                  onClick={() => navigate('/admin/students')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Students
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal"
                  onClick={() => navigate('/admin/analytics')}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal"
                  onClick={() => navigate('/admin/settings')}
                >
                  <School className="mr-2 h-4 w-4" />
                  School Settings
                </Button>
              </div>
            </ScrollArea>
          </div>
        </Sidebar>

        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* School Information */}
            <Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SchoolCodeGenerator onCodeGenerated={handleCodeGenerated} />
              <SchoolCodeManager onCodeGenerated={handleCodeGenerated} />
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
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
