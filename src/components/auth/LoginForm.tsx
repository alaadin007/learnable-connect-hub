
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, setTestUser, userRole, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Show success toast for registration and email verification
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account before logging in."
      });
    }
    if (searchParams.get('email_confirmed') === 'true') {
      toast.success("Email verified!", {
        description: "Your email has been verified. You can now log in."
      });
    }
  }, [searchParams]);

  // Redirect if user role already set
  useEffect(() => {
    if (userRole) {
      console.log("LoginForm: User already logged in with role:", userRole);
      console.log("LoginForm: User profile:", profile);
      
      // Define redirect path based on user role
      let redirectPath;
      if (userRole === "school") {
        redirectPath = "/admin";
      } else if (userRole === "teacher") {
        redirectPath = "/teacher/analytics";
      } else {
        redirectPath = "/dashboard";
      }

      console.log(`LoginForm: Redirecting to ${redirectPath}`);
      navigate(redirectPath, { 
        replace: true,
        state: { 
          fromLogin: true,
          preserveContext: true
        } 
      });
    }
  }, [userRole, navigate, profile]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setIsLoading(true);

    try {
      console.log(`LoginForm: Attempting login for ${email}`);
      
      // Handle test accounts - direct login without authentication
      if (email.includes(".test@learnable.edu")) {
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";

        console.log(`LoginForm: Setting up test user of type ${type}`);
        await setTestUser(type);
        console.log(`LoginForm: Successfully set up test user of type ${type}`);

        const redirectPath = type === "school"
          ? "/admin"
          : type === "teacher"
          ? "/teacher/analytics"
          : "/dashboard";

        toast.success("Login successful", {
          description: `Welcome, ${
            type === "school"
              ? "School Admin"
              : type === "teacher"
              ? "Teacher"
              : "Student"
          }!`,
        });

        console.log(`LoginForm: Redirecting test user to ${redirectPath}`);
        navigate(redirectPath, { 
          replace: true, 
          state: { 
            fromTestAccounts: true, 
            accountType: type,
            preserveContext: true
          } 
        });
        return;
      }

      // Regular user login flow
      const { data: authData, error: signInError } = await signIn(email, password);

      if (signInError) throw signInError;

      console.log("LoginForm: Sign in successful, fetching user data");
      
      // Small delay to ensure auth state has been processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const {
        data: { user },
        error: getUserError
      } = await supabase.auth.getUser();

      if (getUserError) throw getUserError;
      
      if (!user) {
        throw new Error("Failed to retrieve user data after login");
      }

      console.log(`LoginForm: User authenticated, ID: ${user.id}`);

      // Fetch the user profile directly from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, full_name, school_code, school_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("LoginForm: Error fetching profile:", profileError);
        
        // Check if profile doesn't exist - create a basic one if needed
        if (profileError.code === "PGRST116") {
          console.log("LoginForm: Profile not found, creating basic profile");
          
          // Try to extract relevant data from user metadata
          const defaultUserType = user.user_metadata?.user_type || "student";
          const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";
          const schoolCode = user.user_metadata?.school_code;
          const schoolName = user.user_metadata?.school_name || "Default School";
          
          // Create a basic profile
          const { error: createProfileError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              user_type: defaultUserType,
              full_name: defaultName,
              school_code: schoolCode,
              school_name: schoolName
            });
            
          if (createProfileError) {
            console.error("LoginForm: Failed to create profile:", createProfileError);
            throw new Error("Failed to create user profile");
          }
          
          // For school admin, ensure school entry exists
          if (defaultUserType === "school") {
            // Check if school already exists
            const { data: existingSchool } = await supabase
              .from("schools")
              .select("id")
              .eq("code", schoolCode || `SCHOOL_${user.id.substring(0, 8)}`)
              .single();
              
            if (!existingSchool) {
              // Create school entry
              const schoolCode = user.user_metadata?.school_code || `SCHOOL_${user.id.substring(0, 8)}`;
              await supabase
                .from("schools")
                .insert({
                  name: schoolName,
                  code: schoolCode
                });
                
              // Update profile with school code
              await supabase
                .from("profiles")
                .update({ school_code: schoolCode })
                .eq("id", user.id);
            }
          }
          
          // Redirect based on user type
          const userType = defaultUserType as "school" | "teacher" | "student";
          const redirectPath = userType === "school" ? "/admin" : 
                              userType === "teacher" ? "/teacher/analytics" :
                              "/dashboard";
                              
          toast.success("Login successful", {
            description: `Welcome, ${defaultName}!`,
          });
          
          navigate(redirectPath, { 
            replace: true,
            state: { preserveContext: true }
          });
          return;
        }
        
        throw profileError;
      }

      console.log(`LoginForm: Profile retrieved, user_type: ${profileData?.user_type}`);

      // If user is a school admin, fetch the organization data
      let orgData = null;
      if (profileData?.user_type === "school") {
        try {
          // Get or create school data
          let schoolData;
          
          if (profileData.school_code) {
            const { data, error: schoolError } = await supabase
              .from("schools")
              .select("id, name, code")
              .eq("code", profileData.school_code)
              .single();
              
            if (!schoolError && data) {
              schoolData = data;
            }
          }
          
          // Create school if it doesn't exist
          if (!schoolData) {
            console.log("LoginForm: School data not found, creating school entry");
            const schoolCode = profileData.school_code || `SCHOOL_${user.id.substring(0, 8)}`;
            const schoolName = profileData.school_name || user.user_metadata?.school_name || "Default School";
            
            const { data: newSchool, error: createSchoolError } = await supabase
              .from("schools")
              .insert({
                name: schoolName,
                code: schoolCode
              })
              .select()
              .single();
              
            if (createSchoolError) {
              console.error("LoginForm: Error creating school:", createSchoolError);
            } else {
              schoolData = newSchool;
              
              // Update profile with school code
              await supabase
                .from("profiles")
                .update({ school_code: schoolCode })
                .eq("id", user.id);
            }
          }
          
          if (schoolData) {
            console.log("LoginForm: Found school data:", schoolData);
            orgData = schoolData;
          }
        } catch (err) {
          console.error("LoginForm: Error handling school data:", err);
        }
      }

      const redirectPath =
        profileData?.user_type === "school"
          ? "/admin"
          : profileData?.user_type === "teacher"
          ? "/teacher/analytics"
          : "/dashboard";

      toast.success("Login successful", {
        description: `Welcome back, ${
          profileData?.full_name || user.user_metadata?.full_name || email
        }!`,
      });

      console.log(`LoginForm: Redirecting to ${redirectPath}`);
      navigate(redirectPath, { 
        replace: true,
        state: { 
          fromNavigation: true,
          preserveContext: true,
          orgData: orgData
        } 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message);

      if (error.message.includes("Email not confirmed")) {
        toast.error("Email not verified", {
          description:
            "Please check your inbox and spam folder for the verification email.",
        });
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Login failed", {
          description: "Invalid email or password. Please try again.",
        });
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      console.log(`LoginForm: Quick login as ${type}`);
      
      // Direct login for test accounts
      await setTestUser(type, schoolIndex);
      console.log(`LoginForm: Successfully set up quick login for ${type}`);

      // Define redirect paths
      let redirectPath = "/dashboard";
      if (type === "school") {
        redirectPath = "/admin";
      } else if (type === "teacher") {
        redirectPath = "/teacher/analytics";
      }

      console.log(`LoginForm: Redirecting quick login user to ${redirectPath}`);
      toast.success(
        `Logged in as ${
          type === "school"
            ? "School Admin"
            : type === "teacher"
            ? "Teacher"
            : "Student"
        }`
      );

      navigate(redirectPath, { 
        replace: true,
        state: { 
          fromTestAccounts: true,
          accountType: type,
          preserveContext: true,
          timestamp: Date.now()
        }
      });
    } catch (error: any) {
      console.error("Quick login error:", error);
      setLoginError(`Failed to log in with test account: ${error.message}`);
      toast.error("Failed to log in with test account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?email_confirmed=true`,
      });

      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent", {
          description:
            "Please check your inbox and spam folder for the reset link.",
        });
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your email and password to log in</CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>
                {loginError.includes("Email not confirmed")
                  ? "Your email address has not been verified. Please check your inbox for the verification email."
                  : loginError}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex">
              <Clock className="h-5 w-5 text-amber-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Need quick access?</p>
                <p className="mt-1 text-sm text-amber-700">
                  Use our pre-configured test accounts for instant login without email verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("school")}
                    className="text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    className="text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Teacher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
                    className="text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Student Login
                  </button>
                  <Link
                    to="/test-accounts"
                    className="text-sm text-amber-800 font-semibold hover:text-amber-900 bg-amber-200 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    View All →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm text-learnable-blue hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-bg"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-600 text-center w-full">
            Don't have an account?{" "}
            <Link to="/register" className="text-learnable-blue hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
