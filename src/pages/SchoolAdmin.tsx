
import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowRight, Users, School, Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SchoolAdmin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [schoolName, setSchoolName] = useState<string>("Your School");
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [studentCount, setStudentCount] = useState<number>(0);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchSchoolData = async () => {
      const schoolId = getSchoolIdWithFallback();
      
      // Load from localStorage for immediate display
      const cachedName = localStorage.getItem('school_name');
      const cachedCode = localStorage.getItem(`school_code_${schoolId}`);
      
      if (cachedName) setSchoolName(cachedName);
      if (cachedCode) setSchoolCode(cachedCode);
      
      try {
        if (process.env.NODE_ENV === 'production') {
          // Get school details from supabase in production
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("name, code")
            .eq("id", schoolId)
            .single();
            
          if (!schoolError && schoolData) {
            setSchoolName(schoolData.name);
            setSchoolCode(schoolData.code);
            // Update localStorage
            localStorage.setItem('school_name', schoolData.name);
            localStorage.setItem(`school_code_${schoolId}`, schoolData.code);
          }
          
          // Get student count
          const { count: studentCount, error: studentError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
            
          if (!studentError) {
            setStudentCount(studentCount || 0);
          }
          
          // Get teacher count
          const { count: teacherCount, error: teacherError } = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
            
          if (!teacherError) {
            setTeacherCount(teacherCount || 0);
          }
        } else {
          // Use demo data in development
          setStudentCount(32);
          setTeacherCount(8);
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
        // Default to sample counts if error occurs
        setStudentCount(32);
        setTeacherCount(8);
      }
    };

    fetchSchoolData();
  }, []);

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCodeGenerated = (code: string) => {
    setSchoolCode(code);
    
    // Update localStorage to sync across the site
    const schoolId = getSchoolIdWithFallback();
    localStorage.setItem(`school_code_${schoolId}`, code);
    
    // Update in database if in production
    if (process.env.NODE_ENV === 'production') {
      try {
        supabase
          .from("schools")
          .update({ code: code })
          .eq("id", schoolId)
          .then(({ error }) => {
            if (error) console.error("Error updating school code:", error);
          });
      } catch (error) {
        console.error("Error updating school code:", error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">School Administration</h1>
          
          <AdminNavbar className="mb-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <School className="h-8 w-8 text-blue-600" />
                  <h3 className="text-xl font-semibold">{schoolName}</h3>
                  <div className="text-sm text-gray-500">School Code: {schoolCode}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <h3 className="text-xl font-semibold">{studentCount}</h3>
                  <div className="text-sm text-gray-500">Total Students</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <h3 className="text-xl font-semibold">{teacherCount}</h3>
                  <div className="text-sm text-gray-500">Total Teachers</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>School Code</CardTitle>
                <CardDescription>Generate and share the code for teachers to join</CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolCodeGenerator 
                  onCodeGenerated={handleCodeGenerated}
                />
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Shortcuts to common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => navigate('/admin/teacher-management')} 
                  variant="outline" 
                  className="w-full justify-between"
                >
                  Manage Teachers
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => navigate('/admin/students')} 
                  variant="outline" 
                  className="w-full justify-between"
                >
                  Manage Students
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => navigate('/admin/settings')} 
                  variant="outline" 
                  className="w-full justify-between"
                >
                  School Settings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>School Management</CardTitle>
                <CardDescription>
                  Configure school-wide settings and manage access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="bg-gray-50 border-dashed cursor-pointer hover:bg-gray-100 transition-colors" 
                    onClick={() => navigate('/admin/teacher-management')}>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <Users className="h-8 w-8 text-blue-600 mb-2" />
                      <h3 className="font-semibold">Teacher Management</h3>
                      <p className="text-sm text-gray-500 text-center">
                        Invite and manage teachers
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 border-dashed cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => navigate('/admin/students')}>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
                      <h3 className="font-semibold">Student Management</h3>
                      <p className="text-sm text-gray-500 text-center">
                        Oversee student accounts
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 border-dashed cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => navigate('/admin/settings')}>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <Settings className="h-8 w-8 text-blue-600 mb-2" />
                      <h3 className="font-semibold">School Settings</h3>
                      <p className="text-sm text-gray-500 text-center">
                        Configure school details
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
