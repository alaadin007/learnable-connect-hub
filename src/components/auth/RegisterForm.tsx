
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
import { Loader2, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [teacherExistingRole, setTeacherExistingRole] = useState<string | null>(null);
  const [teacherCodeVerified, setTeacherCodeVerified] = useState(false);

  // Student registration state
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentSchoolCode, setStudentSchoolCode] = useState("");
  const [isVerifyingStudentCode, setIsVerifyingStudentCode] = useState(false);
  const [studentSchoolName, setStudentSchoolName] = useState("");
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentExistingRole, setStudentExistingRole] = useState<string | null>(null);
  const [studentCodeVerified, setStudentCodeVerified] = useState(false);
  
  // Help dialog state
  const [showHelpDialog, setShowHelpDialog] = useState(false);

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
          setTeacherCodeVerified(true);
        } else {
          setStudentSchoolName(schoolNameStr);
          setStudentCodeVerified(true);
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
    setTeacherCodeVerified(false);
    try {
      const isValid = await validateSchoolCode(teacherSchoolCode, "teacher");
      if (!isValid) {
        setTeacherSchoolName("");
      }
    } finally {
      setIsVerifyingTeacherCode(false);
    }
  };

  const handleVerifyStudentCode = async () => {
    setIsVerifyingStudentCode(true);
    setStudentCodeVerified(false);
    try {
      const isValid = await validateSchoolCode(studentSchoolCode, "student");
      if (!isValid) {
        setStudentSchoolName("");
      }
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

  const handleRegisterTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    clearTeacherErrors();
    
    if (!teacherName || !teacherEmail || !teacherPassword || !teacherSchoolCode) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate school code first if not already verified
    if (!teacherCodeVerified) {
      const isValid = await validateSchoolCode(teacherSchoolCode, "teacher");
      if (!isValid) return;
    }

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

      // Fix: Pass only two arguments to signUp
      await signUp(teacherEmail, teacherPassword);
      
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
      // Navigate to login page with a query parameter
      navigate("/login?registered=true");
      
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

    // Validate school code first if not already verified
    if (!studentCodeVerified) {
      const isValid = await validateSchoolCode(studentSchoolCode, "student");
      if (!isValid) return;
    }

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

      // Fix: Pass only two arguments to signUp
      await signUp(studentEmail, studentPassword);
      
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
      // Navigate to login page with a query parameter
      navigate("/login?registered=true");
      
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
                  <div className="flex items-center">
                    <Label htmlFor="teacher-code" className="mr-2">School Code</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={() => setShowHelpDialog(true)}
                            type="button"
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">School code help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Learn how to get a school code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {teacherSchoolName && (
                    <div className="flex items-center text-xs text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span>{teacherSchoolName}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Input 
                    id="teacher-code" 
                    placeholder="Enter school registration code"
                    value={teacherSchoolCode}
                    onChange={(e) => {
                      setTeacherSchoolCode(e.target.value);
                      setTeacherCodeVerified(false);
                    }}
                    required
                    className={teacherCodeVerified ? "border-green-500 pr-10" : ""}
                  />
                  <Button 
                    type="button" 
                    variant={teacherCodeVerified ? "outline" : "secondary"} 
                    onClick={handleVerifyTeacherCode}
                    disabled={isVerifyingTeacherCode || !teacherSchoolCode}
                    className={teacherCodeVerified ? "bg-green-50 text-green-700 border-green-500 hover:bg-green-100 hover:text-green-800" : ""}
                  >
                    {isVerifyingTeacherCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : teacherCodeVerified ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verified
                      </>
                    ) : "Verify"}
                  </Button>
                </div>
                {!teacherCodeVerified && teacherSchoolCode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Please verify your school code before proceeding
                  </p>
                )}
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
                disabled={isLoading || !teacherSchoolName || !teacherCodeVerified}
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
                  <div className="flex items-center">
                    <Label htmlFor="student-code" className="mr-2">School Code</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={() => setShowHelpDialog(true)}
                            type="button"
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">School code help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Learn how to get a school code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {studentSchoolName && (
                    <div className="flex items-center text-xs text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span>{studentSchoolName}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Input 
                    id="student-code" 
                    placeholder="Enter school registration code"
                    value={studentSchoolCode}
                    onChange={(e) => {
                      setStudentSchoolCode(e.target.value);
                      setStudentCodeVerified(false);
                    }}
                    required
                    className={studentCodeVerified ? "border-green-500 pr-10" : ""}
                  />
                  <Button 
                    type="button" 
                    variant={studentCodeVerified ? "outline" : "secondary"} 
                    onClick={handleVerifyStudentCode}
                    disabled={isVerifyingStudentCode || !studentSchoolCode}
                    className={studentCodeVerified ? "bg-green-50 text-green-700 border-green-500 hover:bg-green-100 hover:text-green-800" : ""}
                  >
                    {isVerifyingStudentCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : studentCodeVerified ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verified
                      </>
                    ) : "Verify"}
                  </Button>
                </div>
                {!studentCodeVerified && studentSchoolCode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Please verify your school code before proceeding
                  </p>
                )}
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
                disabled={isLoading || !studentSchoolName || !studentCodeVerified}
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
      
      {/* Help Dialog for School Code */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to Get a School Code</DialogTitle>
            <DialogDescription>
              School codes are provided by school administrators who have registered their school with LearnAble.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <h4 className="font-medium text-sm">You can obtain a school code from:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your school administrator who registered the school</li>
              <li>Your department head or IT administrator</li>
              <li>Another teacher or colleague who already has an account</li>
              <li>By asking your school to register if they haven't already</li>
            </ul>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-md mt-4">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Each school gets a unique code that is shared among all teachers and students at that institution.
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              If your school hasn't registered yet, please ask your school administrator to 
              <Link to="/school-registration" className="font-medium text-learnable-blue hover:underline ml-1">
                register your school first
              </Link>.
            </p>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RegisterForm;
