
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"teacher" | "student">("teacher");
  const { signUp } = useAuth();

  // Teacher registration state
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSchoolCode, setTeacherSchoolCode] = useState("");
  const [isVerifyingTeacherCode, setIsVerifyingTeacherCode] = useState(false);
  const [teacherSchoolName, setTeacherSchoolName] = useState("");
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Student registration state
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentSchoolCode, setStudentSchoolCode] = useState("");
  const [isVerifyingStudentCode, setIsVerifyingStudentCode] = useState(false);
  const [studentSchoolName, setStudentSchoolName] = useState("");
  const [studentError, setStudentError] = useState<string | null>(null);

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
      
      if (!schoolNameError && schoolNameData !== null) {
        // Convert to string and ensure it's not null
        const schoolNameStr = String(schoolNameData || "");
        
        if (userType === 'teacher') {
          setTeacherSchoolName(schoolNameStr);
        } else {
          setStudentSchoolName(schoolNameStr);
        }
        
        toast.success(`Code verified for ${schoolNameStr}`);
        return true;
      }

      return !!data;
    } catch (error) {
      console.error("Error validating school code:", error);
      toast.error("Error validating school code");
      return false;
    }
  };

  const handleVerifyTeacherCode = async () => {
    setIsVerifyingTeacherCode(true);
    try {
      await validateSchoolCode(teacherSchoolCode, "teacher");
    } finally {
      setIsVerifyingTeacherCode(false);
    }
  };

  const handleVerifyStudentCode = async () => {
    setIsVerifyingStudentCode(true);
    try {
      await validateSchoolCode(studentSchoolCode, "student");
    } finally {
      setIsVerifyingStudentCode(false);
    }
  };

  const clearTeacherErrors = () => {
    setTeacherError(null);
  };

  const clearStudentErrors = () => {
    setStudentError(null);
  };

  const handleRegisterTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    clearTeacherErrors();
    
    if (!teacherName || !teacherEmail || !teacherPassword || !teacherSchoolCode) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate school code first
    const isValid = await validateSchoolCode(teacherSchoolCode, "teacher");
    if (!isValid) return;

    setIsLoading(true);
    
    try {
      // Check if email already exists
      const { error: emailCheckError } = await supabase.auth.signInWithPassword({
        email: teacherEmail,
        password: "dummy-password-for-check-only",
      });

      // If email exists or there's an unclear error, show error
      if (!emailCheckError || (emailCheckError && !emailCheckError.message.includes("Invalid login credentials"))) {
        setTeacherError(teacherEmail);
        setIsLoading(false);
        toast.error("This email address may already be registered", {
          description: "Please use a different email or try logging in if this is your account."
        });
        return;
      }

      await signUp(teacherEmail, teacherPassword, {
        user_type: 'teacher',
        full_name: teacherName,
        school_code: teacherSchoolCode,
        school_name: teacherSchoolName
      });
      
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
      // Navigate to login page with a query parameter
      navigate("/login?registered=true");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        setTeacherError(teacherEmail);
        toast.error("This email is already registered", {
          description: "Please use a different email or try logging in with this account."
        });
      } else {
        toast.error(`Registration failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    clearStudentErrors();
    
    if (!studentName || !studentEmail || !studentPassword || !studentSchoolCode) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate school code first
    const isValid = await validateSchoolCode(studentSchoolCode, "student");
    if (!isValid) return;

    setIsLoading(true);
    
    try {
      // Check if email already exists
      const { error: emailCheckError } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: "dummy-password-for-check-only",
      });

      // If email exists or there's an unclear error, show error
      if (!emailCheckError || (emailCheckError && !emailCheckError.message.includes("Invalid login credentials"))) {
        setStudentError(studentEmail);
        setIsLoading(false);
        toast.error("This email address may already be registered", {
          description: "Please use a different email or try logging in if this is your account."
        });
        return;
      }

      await signUp(studentEmail, studentPassword, {
        user_type: 'student',
        full_name: studentName,
        school_code: studentSchoolCode,
        school_name: studentSchoolName
      });
      
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
      // Navigate to login page with a query parameter
      navigate("/login?registered=true");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        setStudentError(studentEmail);
        toast.error("This email is already registered", {
          description: "Please use a different email or try logging in with this account."
        });
      } else {
        toast.error(`Registration failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Choose your account type to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="teacher" 
          className="w-full"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "teacher" | "student");
            clearTeacherErrors();
            clearStudentErrors();
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teacher">Teacher</TabsTrigger>
            <TabsTrigger value="student">Student</TabsTrigger>
          </TabsList>
          <TabsContent value="teacher" className="mt-4">
            {teacherError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email Already Registered</AlertTitle>
                <AlertDescription>
                  The email address "{teacherError}" may already be registered. 
                  Please use a different email or <Link to="/login" className="font-medium underline">login</Link> if this is your account.
                </AlertDescription>
              </Alert>
            )}
            
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
                  placeholder="teacher@yourschool.edu"
                  value={teacherEmail}
                  onChange={(e) => {
                    setTeacherEmail(e.target.value);
                    clearTeacherErrors();
                  }}
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
                <div className="flex space-x-2">
                  <Input 
                    id="school-code" 
                    placeholder="Enter school registration code"
                    value={teacherSchoolCode}
                    onChange={(e) => setTeacherSchoolCode(e.target.value)}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleVerifyTeacherCode}
                    disabled={isVerifyingTeacherCode || !teacherSchoolCode}
                  >
                    {isVerifyingTeacherCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : "Verify"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher-password">Password</Label>
                <Input 
                  id="teacher-password" 
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full gradient-bg"
                disabled={isLoading || !teacherSchoolName}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : "Register as Teacher"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="student" className="mt-4">
            {studentError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email Already Registered</AlertTitle>
                <AlertDescription>
                  The email address "{studentError}" may already be registered. 
                  Please use a different email or <Link to="/login" className="font-medium underline">login</Link> if this is your account.
                </AlertDescription>
              </Alert>
            )}
            
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
                  placeholder="student@yourschool.edu"
                  value={studentEmail}
                  onChange={(e) => {
                    setStudentEmail(e.target.value);
                    clearStudentErrors();
                  }}
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
                <div className="flex space-x-2">
                  <Input 
                    id="student-code" 
                    placeholder="Enter school registration code"
                    value={studentSchoolCode}
                    onChange={(e) => setStudentSchoolCode(e.target.value)}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleVerifyStudentCode}
                    disabled={isVerifyingStudentCode || !studentSchoolCode}
                  >
                    {isVerifyingStudentCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : "Verify"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">Password</Label>
                <Input 
                  id="student-password" 
                  type="password"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full gradient-bg"
                disabled={isLoading || !studentSchoolName}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : "Register as Student"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-gray-600 text-center w-full">
          Already have an account?{" "}
          <Link to="/login" className="text-learnable-blue hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterForm;
