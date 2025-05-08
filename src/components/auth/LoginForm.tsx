
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTestAccount, setActiveTestAccount] = useState<string | null>(null);
  const { signIn, setTestUser, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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

  // Check if a test account is already active
  useEffect(() => {
    const checkActiveTestAccount = () => {
      const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
      const testAccountType = localStorage.getItem('testAccountType');
      
      if (usingTestAccount && testAccountType) {
        setActiveTestAccount(testAccountType);
      } else {
        setActiveTestAccount(null);
      }
    };
    
    checkActiveTestAccount();
    
    // Add event listener to detect changes to localStorage
    window.addEventListener('storage', checkActiveTestAccount);
    
    return () => {
      window.removeEventListener('storage', checkActiveTestAccount);
    };
  }, []);

  // Redirect if user role already set
  useEffect(() => {
    if (userRole) {
      console.log("LoginForm: User role already set, redirecting to appropriate dashboard:", userRole);
      const redirectPath = getUserRedirectPath(userRole);
      navigate(redirectPath);
    }
  }, [userRole, navigate]);

  // Helper function to determine redirect path based on user role
  const getUserRedirectPath = (role: string): string => {
    switch (role) {
      case "school":
      case "school_admin": // Handle legacy role name
        return "/admin";
      case "teacher":
      case "teacher_supervisor": // Handle legacy role name
        return "/teacher/analytics";
      case "student":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  // Fast test account login - no delays or spinners
  const handleQuickLogin = async (
    type: "school" | "teacher" | "student"
  ) => {
    try {
      console.log(`LoginForm: Fast login as ${type}`);
      
      // Clean up any existing session
      await signOut();
      
      // Reset state flags
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      
      // Set new test account flags
      localStorage.setItem('usingTestAccount', 'true');
      localStorage.setItem('testAccountType', type);
      
      // Direct instant login for test accounts
      const mockUser = await setTestUser(type);
      if (!mockUser) {
        throw new Error(`Failed to set up ${type} test account`);
      }
      
      // Define redirect paths
      const redirectPath = getUserRedirectPath(type);

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

      // Immediate navigation without delays
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
      
      // Clean any partial test account state on error
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      setActiveTestAccount(null);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    console.log(`LoginForm: Attempting login for ${email}`);

    try {
      // If there's already a test account active, sign out first
      if (activeTestAccount) {
        await signOut();
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
        setActiveTestAccount(null);
      }
      
      // Special handling for test accounts - instant login
      if (email.includes(".test@learnable.edu")) {
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";
        
        await handleQuickLogin(type);
        return;
      }
      
      // Handle normal login with credentials - no loading state to avoid delays
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (data?.user) {
        console.log("Login successful:", data.user.id);
        // Get user type from metadata or profile
        let userType: string | null = null;
        let userName: string | null = null;
        let fetchedProfile: any = null;
        
        if (data.user.user_metadata) {
          userType = data.user.user_metadata.user_type;
          // Normalize the user role
          if (userType === "school_admin") {
            userType = "school";
          }
          userName = data.user.user_metadata.full_name;
        }
        
        // If not in metadata, try to get from profile
        if (!userType) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("user_type, full_name, organization:school_id(*)")
              .eq("id", data.user.id)
              .single();
              
            fetchedProfile = profile;
            
            if (!profileError && profile) {
              userType = profile.user_type;
              // Normalize the user role if needed
              if (userType === "school_admin") {
                userType = "school";
              }
              userName = profile.full_name || userName;
              console.log("Fetched user type from profile:", userType);
              console.log("Fetched profile:", profile);
            }
          } catch (profileError) {
            console.error("Error fetching user profile:", profileError);
          }
        } else {
          console.log("User type from metadata:", userType);
        }
        
        // Check user_roles table as well for definitive role assignment
        try {
          const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();
            
          if (!roleError && userRole) {
            console.log("Found user role in user_roles table:", userRole.role);
            userType = userRole.role;
            // Normalize the user role
            if (userType === "school_admin") {
              userType = "school";
            }
          }
        } catch (roleError) {
          console.error("Error checking user_roles table:", roleError);
        }
        
        // Error handling for missing userType or missing organization for school admin
        if (!userType) {
          setLoginError("Your account is missing a user type. Please contact support.");
          return;
        }
        
        if (userType === "school" && (!fetchedProfile || !fetchedProfile.organization || !fetchedProfile.organization.id)) {
          setLoginError("Your school admin account is missing an associated school. Please contact support.");
          return;
        }
        
        // Default to dashboard if we still can't determine the role
        const redirectPath = userType ? getUserRedirectPath(userType) : "/dashboard";
        console.log(`User type: ${userType}, redirecting to: ${redirectPath}`);
        toast.success("Login successful", {
          description: `Welcome back, ${userName || email}!`,
        });
        
        // Immediate navigation without delays
        navigate(redirectPath, {
          replace: true,
          state: {
            fromNavigation: true,
            preserveContext: true
          }
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message);

      // Improved error messages
      if (error.message?.includes("Email not confirmed")) {
        toast.error("Email not verified", {
          description: "Please check your inbox and spam folder for the verification email.",
          action: {
            label: "Resend",
            onClick: () => handleResendVerification(),
          },
        });
      } else if (error.message?.includes("Invalid login credentials")) {
        toast.error("Login failed", {
          description: "Invalid email or password. Please try again.",
        });
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      // Direct call to Supabase to resend verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        toast.error("Failed to resend verification email: " + error.message);
      } else {
        toast.success("Verification email sent", {
          description: "Please check your inbox and spam folder for the verification link.",
        });
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      // Direct call to Supabase to reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?email_confirmed=true`,
      });

      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent", {
          description: "Please check your inbox and spam folder for the reset link.",
        });
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
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
              <AlertCircle className="h-5 w-5 text-amber-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Testing the application?</p>
                <p className="mt-1 text-sm text-amber-700">
                  You can quickly create test accounts for all user roles (school admin, teacher, student) on our dedicated test page.
                </p>
                <div className="mt-2">
                  <Link 
                    to="/test-accounts" 
                    className="text-sm text-amber-800 font-semibold hover:text-amber-900 bg-amber-200 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Access Test Accounts →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Need quick access?</p>
                <p className="mt-1 text-sm text-blue-700">
                  Use our pre-configured test accounts for instant login without email verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("school")}
                    className={`text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "school" ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {activeTestAccount === "school" ? "Active Admin" : "Admin Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    className={`text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "teacher" ? "ring-2 ring-green-500" : ""
                    }`}
                  >
                    {activeTestAccount === "teacher" ? "Active Teacher" : "Teacher Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
                    className={`text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "student" ? "ring-2 ring-purple-500" : ""
                    }`}
                  >
                    {activeTestAccount === "student" ? "Active Student" : "Student Login"}
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
              className="w-full gradient-bg transition-all duration-300 relative overflow-hidden"
            >
              Log in
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
