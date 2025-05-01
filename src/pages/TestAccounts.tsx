
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";

const TestAccounts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const { signUp } = useAuth();

  // School registration state with valid email domain
  const [schoolName, setSchoolName] = useState("Test School");
  const [adminName, setAdminName] = useState("School Admin");
  const [schoolEmail, setSchoolEmail] = useState("admin@testschool.edu");
  const [schoolPassword, setSchoolPassword] = useState("password123");

  // Teacher registration state with valid email domain
  const [teacherName, setTeacherName] = useState("Test Teacher");
  const [teacherEmail, setTeacherEmail] = useState("teacher@testschool.edu");
  const [teacherPassword, setTeacherPassword] = useState("password123");
  const [teacherSchoolName, setTeacherSchoolName] = useState("");

  // Student registration state with valid email domain
  const [studentName, setStudentName] = useState("Test Student");
  const [studentEmail, setStudentEmail] = useState("student@testschool.edu");
  const [studentPassword, setStudentPassword] = useState("password123");
  const [studentSchoolName, setStudentSchoolName] = useState("");

  const validateSchoolCode = async (code: string, userType: "teacher" | "student") => {
    if (!code) {
      toast.error("Please enter a school code");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('verify_school_code', { code });
      
      if (error) {
        toast.error("Error validating school code");
        console.error("Error validating school code:", error);
        return false;
      }
      
      if (!data) {
        toast.error("Invalid school code");
        return false;
      }

      // Fetch school name
      const { data: schoolNameData, error: schoolNameError } = await supabase.rpc(
        'get_school_name_from_code',
        { code }
      );
      
      if (!schoolNameError && schoolNameData) {
        if (userType === 'teacher') {
          setTeacherSchoolName(schoolNameData);
        } else {
          setStudentSchoolName(schoolNameData);
        }
        
        toast.success(`Code verified for ${schoolNameData}`);
        return true;
      }

      return data;
    } catch (error) {
      console.error("Error validating school code:", error);
      toast.error("Error validating school code");
      return false;
    }
  };

  const handleRegisterSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    
    try {
      await signUp(schoolEmail, schoolPassword, {
        user_type: 'school',
        full_name: adminName,
        school_name: schoolName
      });

      // Get the school code after registration to use for other accounts
      setTimeout(async () => {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('school_code')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();
          
          if (profiles?.school_code) {
            setSchoolCode(profiles.school_code);
            toast.success(`School registered with code: ${profiles.school_code}`);
          }
        } catch (error) {
          console.error("Error fetching school code:", error);
        }
      }, 2000);
      
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!schoolCode) {
      toast.error("Please register a school first to get a school code");
      return;
    }

    // Validate school code first
    const isValid = await validateSchoolCode(schoolCode, "teacher");
    if (!isValid) return;

    setIsLoading(true);
    
    try {
      await signUp(teacherEmail, teacherPassword, {
        user_type: 'teacher',
        full_name: teacherName,
        school_code: schoolCode,
        school_name: teacherSchoolName
      });
      toast.success("Teacher registered successfully! Please check email for verification.");
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!schoolCode) {
      toast.error("Please register a school first to get a school code");
      return;
    }

    // Validate school code first
    const isValid = await validateSchoolCode(schoolCode, "student");
    if (!isValid) return;

    setIsLoading(true);
    
    try {
      await signUp(studentEmail, studentPassword, {
        user_type: 'student',
        full_name: studentName,
        school_code: schoolCode,
        school_name: studentSchoolName
      });
      toast.success("Student registered successfully! Please check email for verification.");
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-10">
        <div className="max-w-4xl mx-auto p-4">
          <Card className="w-full mb-8">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Test Accounts</CardTitle>
              <CardDescription>
                Create test accounts for different user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schoolCode && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800">
                    <strong>School Code:</strong> {schoolCode}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Use this code to register teachers and students
                  </p>
                </div>
              )}

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800">
                  <strong>Important:</strong> Use valid email formats (example: name@domain.edu) to avoid registration errors.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Emails with domains like "example.com" are rejected by the authentication system.
                </p>
              </div>

              <Tabs defaultValue="school" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="school">School Admin</TabsTrigger>
                  <TabsTrigger value="teacher">Teacher</TabsTrigger>
                  <TabsTrigger value="student">Student</TabsTrigger>
                </TabsList>
                <TabsContent value="school" className="mt-4">
                  <form onSubmit={handleRegisterSchool} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-name">School Name</Label>
                      <Input 
                        id="school-name" 
                        placeholder="Enter school name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-name">Administrator Name</Label>
                      <Input 
                        id="admin-name" 
                        placeholder="Full name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-email">Email</Label>
                      <Input 
                        id="school-email" 
                        type="email" 
                        placeholder="admin@school.edu"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-password">Password</Label>
                      <Input 
                        id="school-password" 
                        type="text"
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-bg"
                      disabled={isLoading}
                    >
                      {isLoading ? "Registering..." : "Register Test School"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="teacher" className="mt-4">
                  <form onSubmit={handleRegisterTeacher} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacher-name">Full Name</Label>
                      <Input 
                        id="teacher-name" 
                        placeholder="Your name"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-email">Email</Label>
                      <Input 
                        id="teacher-email" 
                        type="email" 
                        placeholder="teacher@school.edu"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="school-code">School Code</Label>
                        {teacherSchoolName && (
                          <span className="text-xs text-green-600">{teacherSchoolName}</span>
                        )}
                      </div>
                      <Input 
                        id="school-code" 
                        placeholder="Enter school registration code"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-password">Password</Label>
                      <Input 
                        id="teacher-password" 
                        type="text"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-bg"
                      disabled={isLoading || !schoolCode}
                    >
                      {isLoading ? "Registering..." : "Register Test Teacher"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="student" className="mt-4">
                  <form onSubmit={handleRegisterStudent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-name">Full Name</Label>
                      <Input 
                        id="student-name" 
                        placeholder="Your name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Email</Label>
                      <Input 
                        id="student-email" 
                        type="email" 
                        placeholder="student@school.edu"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="student-code">School Code</Label>
                        {studentSchoolName && (
                          <span className="text-xs text-green-600">{studentSchoolName}</span>
                        )}
                      </div>
                      <Input 
                        id="student-code" 
                        placeholder="Enter school registration code"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-password">Password</Label>
                      <Input 
                        id="student-password" 
                        type="text"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-bg"
                      disabled={isLoading || !schoolCode}
                    >
                      {isLoading ? "Registering..." : "Register Test Student"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions:</h3>
                <ol className="list-decimal list-inside text-blue-700 space-y-1">
                  <li>Start by registering a School Admin account</li>
                  <li>Use the generated school code to register teacher accounts</li>
                  <li>Use the same school code to register student accounts</li>
                  <li>Log in with each account type to test role-specific features</li>
                </ol>
              </div>
              <p className="text-sm text-gray-600 text-center w-full">
                Ready to test?{" "}
                <Link to="/login" className="text-learnable-blue hover:underline">
                  Log in
                </Link>{" "}
                with your test accounts
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
