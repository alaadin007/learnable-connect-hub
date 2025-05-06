
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
  const { signUp, sendEmailVerification } = useAuth();

  // Teacher registration state
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSchoolCode, setTeacherSchoolCode] = useState("");
  const [isVerifyingTeacherCode, setIsVerifyingTeacherCode] = useState(false);
  const [teacherSchoolName, setTeacherSchoolName] = useState("");
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherExistingRole, setTeacherExistingRole] = useState<string | null>(null);
  const [teacherSignupSuccess, setTeacherSignupSuccess] = useState(false); 

  // Student registration state
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentSchoolCode, setStudentSchoolCode] = useState("");
  const [isVerifyingStudentCode, setIsVerifyingStudentCode] = useState(false);
  const [studentSchoolName, setStudentSchoolName] = useState("");
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentExistingRole, setStudentExistingRole] = useState<string | null>(null);
  const [studentSignupSuccess, setStudentSignupSuccess] = useState(false);

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

  const checkEmailExistingRole = async (email: string): Promise<string | null> => {
    try {
      // Try to get the user's role from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .ilike('id', `%${email}%`) // This is a workaround since we can't directly query by email
        .limit(1);
      
      if (error) {
        console.error("Error checking user role:", error);
        return null;
      }
      
      if (data && data.length > 0 && data[0].user_type) {
        // Return the role name with proper capitalization for display
        const role = data[0].user_type;
        switch (role) {
          case 'school':
            return 'School Administrator';
          case 'teacher':
            return 'Teacher';
          case 'student':
            return 'Student';
          default:
            return role.charAt(0).toUpperCase() + role.slice(1);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error checking email role:", error);
      return null;
    }
  };

  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      // First, check if the email is already registered using a query to auth.users
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: "dummy-password-for-check-only",
      });

      // If there's no error or the error is not about invalid credentials, email might exist
      const emailExists = !signInError || (signInError && !signInError.message.includes("Invalid login credentials"));
      
      if (emailExists) {
        // Try to get the user role
        const userRole = await checkEmailExistingRole(email);
        return true;
      }

      return emailExists;
    } catch (error) {
      console.error("Error checking email existence:", error);
      // In case of error, safer to assume it might exist
      return true;
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
    setTeacherExistingRole(null);
  };

  const clearStudentErrors = () => {
    setStudentError(null);
    setStudentExistingRole(null);
  };

  const handleResendVerification = async (email: string) => {
    try {
      await sendEmailVerification(email);
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast.error("Failed to resend verification email");
    }
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
      // Check if email already exists in any role
      const emailExists = await checkIfEmailExists(teacherEmail);
      
      if (emailExists) {
        // Try to get the user role
        const userRole = await checkEmailExistingRole(teacherEmail);
        setTeacherExistingRole(userRole);
        
        setTeacherError(teacherEmail);
        
        const roleMessage = userRole 
          ? `This email is already registered as a ${userRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
        });
        return;
      }

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: teacherEmail,
        password: teacherPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            user_type: 'teacher',
            full_name: teacherName,
            school_code: teacherSchoolCode,
            school_name: teacherSchoolName,
          }
        }
      });

      if (error) throw error;
      
      // Show success message
      setTeacherSignupSuccess(true);
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        // Try to get the user role
        const userRole = await checkEmailExistingRole(teacherEmail);
        setTeacherExistingRole(userRole);
        
        setTeacherError(teacherEmail);
        
        const roleMessage = userRole 
          ? `This email is already registered as a ${userRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
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
      // Check if email already exists in any role
      const emailExists = await checkIfEmailExists(studentEmail);
      
      if (emailExists) {
        // Try to get the user role
        const userRole = await checkEmailExistingRole(studentEmail);
        setStudentExistingRole(userRole);
        
        setStudentError(studentEmail);
        
        const roleMessage = userRole 
          ? `This email is already registered as a ${userRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
        });
        return;
      }

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: studentEmail,
        password: studentPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            user_type: 'student',
            full_name: studentName,
            school_code: studentSchoolCode,
            school_name: studentSchoolName,
          }
        }
      });
      
      if (error) throw error;
      
      // Show success message
      setStudentSignupSuccess(true);
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        // Try to get the user role
        const userRole = await checkEmailExistingRole(studentEmail);
        setStudentExistingRole(userRole);
        
        setStudentError(studentEmail);
        
        const roleMessage = userRole 
          ? `This email is already registered as a ${userRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
        });
      } else {
        toast.error(`Registration failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render success message for teacher signup
  if (teacherSignupSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-600">Registration Successful!</CardTitle>
          <CardDescription className="text-center">
            Check your email to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Verification Email Sent</AlertTitle>
            <AlertDescription className="text-green-700">
              We've sent a verification email to <span className="font-bold">{teacherEmail}</span>. 
              Please check your inbox (and spam folder) and click the verification link.
            </AlertDescription>
          </Alert>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              After verifying your email, you'll be able to log in to your account.
            </p>
            <Button 
              onClick={() => handleResendVerification(teacherEmail)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : "Resend Verification Email"}
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full gradient-bg"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render success message for student signup
  if (studentSignupSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-600">Registration Successful!</CardTitle>
          <CardDescription className="text-center">
            Check your email to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Verification Email Sent</AlertTitle>
            <AlertDescription className="text-green-700">
              We've sent a verification email to <span className="font-bold">{studentEmail}</span>. 
              Please check your inbox (and spam folder) and click the verification link.
            </AlertDescription>
          </Alert>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              After verifying your email, you'll be able to log in to your account.
            </p>
            <Button 
              onClick={() => handleResendVerification(studentEmail)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : "Resend Verification Email"}
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full gradient-bg"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                <AlertTitle>
                  {teacherExistingRole 
                    ? `Email Already Registered as ${teacherExistingRole}` 
                    : 'Email Already Registered'}
                </AlertTitle>
                <AlertDescription>
                  The email address "{teacherError}" is already registered
                  {teacherExistingRole ? ` as a ${teacherExistingRole} account` : ''}.
                  Please use a different email or <Link to="/login" className="font-medium underline">login</Link> if this is your account.
                  Each user can only have one role in the system.
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
                <AlertTitle>
                  {studentExistingRole 
                    ? `Email Already Registered as ${studentExistingRole}` 
                    : 'Email Already Registered'}
                </AlertTitle>
                <AlertDescription>
                  The email address "{studentError}" is already registered
                  {studentExistingRole ? ` as a ${studentExistingRole} account` : ''}.
                  Please use a different email or <Link to="/login" className="font-medium underline">login</Link> if this is your account.
                  Each user can only have one role in the system.
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
