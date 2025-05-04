
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase, isTestAccount, isTestEntity } from "@/integrations/supabase/client";
import type { User, AuthResponse } from "@supabase/supabase-js";

// Define types for our context
interface UserProfile {
  id: string;
  user_type: string;
  full_name: string;
  email?: string; // Added email property for TypeScript safety
  school_code?: string;
  school_name?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userRole: string | null;
  isLoading: boolean;
  schoolId: string | null;
  isSuperviser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setTestUser: (accountType: string, index?: number) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<AuthResponse>;
  refreshProfile: () => Promise<void>;
}

// Create the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get role-specific dashboard route
  const getDashboardByRole = useCallback((role: string | null) => {
    if (!role) return "/dashboard";
    
    switch (role) {
      case "school":
        return "/admin";
      case "teacher":
        return "/teacher/analytics";
      case "student":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  }, []);

  // Handle navigation after authentication is confirmed
  const handleAuthenticatedNavigation = useCallback((role: string | null) => {
    const dashboardRoute = getDashboardByRole(role);
    
    // Check if from storage - for refreshes or direct URL access
    const fromLocation = location.state?.from || "/dashboard";
    const targetRoute = fromLocation !== "/" ? fromLocation : dashboardRoute;
    
    console.log(`Auth: Redirecting to ${targetRoute} based on role: ${role}`);
    navigate(targetRoute, { replace: true });
  }, [getDashboardByRole, location.state, navigate]);

  // Fetch user profile data from Supabase
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // If this is a test user ID, return mock profile data
      if (isTestEntity(userId)) {
        console.log("Test user detected, using mock profile data");
        
        // Extract the type from the test ID format: test-{type}-{index}
        const parts = userId.split('-');
        const testType = parts.length > 1 ? parts[1] : 'student';
        const testIndex = parts.length > 2 ? parseInt(parts[2]) : 0;
        
        const mockTestSchoolId = `test-school-${testIndex}`;
        const mockSchoolName = testIndex > 0 ? `Test School ${testIndex}` : "Test School";
        const mockSchoolCode = `TEST${testIndex}`;
        
        const mockProfile: UserProfile = {
          id: userId,
          user_type: testType,
          full_name: `Test ${testType.charAt(0).toUpperCase()}${testType.slice(1)} User`,
          email: `${testType}.test${testIndex > 0 ? testIndex : ''}@learnable.edu`, // Add email for test users
          school_code: mockSchoolCode,
          school_name: mockSchoolName,
          organization: {
            id: mockTestSchoolId,
            name: mockSchoolName,
            code: mockSchoolCode
          }
        };
        
        setProfile(mockProfile);
        setUserRole(testType);
        setSchoolId(mockTestSchoolId);
        setIsSuperviser(testType === 'school');
        
        return testType;
      }
      
      // Get user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      let orgData = null;
      
      // If the user has a school_code, fetch the school details
      if (profileData.user_type === "school" || profileData.user_type === "teacher") {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("code", profileData.school_code)
          .single();

        if (schoolError && profileData.user_type === "school") {
          console.error("Error fetching school data:", schoolError);
        }

        if (schoolData) {
          orgData = schoolData;
          setSchoolId(schoolData.id);
        }
      } else if (profileData.user_type === "student") {
        // For students, get school_id from students table
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("school_id")
          .eq("id", userId)
          .single();

        if (studentError) {
          console.error("Error fetching student school_id:", studentError);
        }

        if (studentData?.school_id) {
          // Get school details
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("id, name, code")
            .eq("id", studentData.school_id)
            .single();

          if (schoolError) {
            console.error("Error fetching school data for student:", schoolError);
          }

          if (schoolData) {
            orgData = schoolData;
            setSchoolId(schoolData.id);
          }
        }
      }

      // Check if user is a supervisor (if teacher)
      if (profileData.user_type === "teacher") {
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("is_supervisor")
          .eq("id", userId)
          .single();

        if (teacherError) {
          console.error("Error fetching teacher supervisor status:", teacherError);
        } else {
          setIsSuperviser(teacherData?.is_supervisor || false);
        }
      }

      // Add email to the profile data
      const userEmail = user?.email || profileData.email;
      
      // Set full profile with organization if available
      const fullProfile = {
        ...profileData,
        email: userEmail,
        organization: orgData
      };

      setProfile(fullProfile);
      setUserRole(profileData.user_type);
      return profileData.user_type;
      
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, [user]);

  // Refresh the current user's profile data
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      await fetchUserProfile(user.id);
      console.log("Auth: Profile refreshed successfully");
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, user]);

  // Sign up a new user
  const signUp = useCallback(async (email: string, password: string, userData: any): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      return response;
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(`Registration failed: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup test user (bypass authentication) - MOVED BEFORE signIn to fix reference error
  const setTestUser = useCallback(async (accountType: string, index: number = 0) => {
    try {
      setIsLoading(true);
      
      // Clear any existing auth first
      await supabase.auth.signOut();
      
      // Create simulated user and profile based on account type
      const testUserId = `test-${accountType}-${index}`;
      const testSchoolId = `test-school-${index}`;
      const testSchoolName = index > 0 ? `Test School ${index}` : "Test School";
      const testSchoolCode = `TEST${index}`;
      const testEmail = `${accountType}.test${index > 0 ? index : ''}@learnable.edu`;
      
      // Create mock user data with all required User properties
      const mockUser = {
        id: testUserId,
        email: testEmail,
        user_metadata: {
          full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User`,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
      } as User;
      
      // Create mock profile data
      const mockProfile = {
        id: testUserId,
        user_type: accountType,
        email: testEmail, // Add email to mockProfile
        full_name: `Test ${accountType.charAt(0).toUpperCase()}${accountType.slice(1)} User${index > 0 ? ' ' + index : ''}`,
        school_code: testSchoolCode,
        school_name: testSchoolName,
        organization: {
          id: testSchoolId,
          name: testSchoolName,
          code: testSchoolCode
        }
      };
      
      // Store test user flag in localStorage for persistence
      localStorage.setItem("testUser", JSON.stringify(mockUser));
      localStorage.setItem("testUserRole", accountType);
      localStorage.setItem("testUserIndex", String(index));
      
      // Update states
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType);
      setSchoolId(testSchoolId);
      setIsSuperviser(accountType === 'school');
      
      console.log(`Auth: Test ${accountType} user set up successfully`);
      toast.success(`Logged in as test ${accountType} user`);
      
      // Redirect to the appropriate dashboard
      const dashboardRoute = getDashboardByRole(accountType);
      navigate(dashboardRoute, { replace: true });
      
    } catch (error: any) {
      console.error("Setting up test user failed:", error);
      toast.error(`Test account setup failed: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, getDashboardByRole]);

  // Sign in a user with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Check if this is a test account before attempting real login
      if (isTestAccount(email)) {
        console.log("Test account detected, bypassing real authentication");
        
        // Extract the type from the email
        let accountType = "student"; // default
        if (email.startsWith("school.")) accountType = "school";
        else if (email.startsWith("teacher.")) accountType = "teacher";
        
        // Extract index if present
        const emailParts = email.split("@")[0].split(".");
        const hasIndex = emailParts.length > 1 && /test\d+/.test(emailParts[1]);
        const index = hasIndex ? parseInt(emailParts[1].replace("test", "")) : 0;
        
        // Use setTestUser to set up the test account
        await setTestUser(accountType, index);
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No user returned from login");
      }

      setUser(data.user);
      
      // Fetch user profile after successful login
      const userRole = await fetchUserProfile(data.user.id);
      
      // Redirect based on role
      handleAuthenticatedNavigation(userRole);
      
      console.log(`Auth: User signed in successfully. Role: ${userRole}`);
      toast.success("Logged in successfully");
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(`Login failed: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, handleAuthenticatedNavigation, setTestUser]);

  // Sign out a user
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear any test user data from localStorage first
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      localStorage.removeItem("testUserIndex");
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all states
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSchoolId(null);
      setIsSuperviser(false);
      
      console.log("Auth: User signed out successfully");
      navigate("/login");
      
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(`Logout failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Initial authentication check and setup
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Check if we have a test user in localStorage first
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestRole = localStorage.getItem("testUserRole");
        const storedTestIndex = localStorage.getItem("testUserIndex") || "0";
        
        if (storedTestUser && storedTestRole) {
          // Restore test user session
          const testUser = JSON.parse(storedTestUser) as User;
          const testIndex = parseInt(storedTestIndex);
          const testEmail = testUser.email;
          
          // Setup simulated test user session from localStorage
          const mockProfile = {
            id: testUser.id,
            user_type: storedTestRole,
            email: testEmail, // Add email to mockProfile
            full_name: testUser.user_metadata.full_name,
            school_code: `TEST${testIndex}`,
            school_name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
            organization: {
              id: `test-school-${testIndex}`,
              name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
              code: `TEST${testIndex}`
            }
          };
          
          setUser(testUser);
          setProfile(mockProfile);
          setUserRole(storedTestRole);
          setSchoolId(`test-school-${testIndex}`);
          setIsSuperviser(storedTestRole === 'school');
          console.log("Auth: Restored test user session from localStorage");
        } else {
          // Check for real authenticated session
          const { data } = await supabase.auth.getSession();
          
          if (data?.session?.user) {
            setUser(data.session.user);
            await fetchUserProfile(data.session.user.id);
            console.log("Auth: Real user session restored from Supabase");
          }
        }
        
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state change: ${event}`, session?.user?.id);
        
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          const userRole = await fetchUserProfile(session.user.id);
          
          // Don't navigate here - the signIn function handles that
          // to avoid duplicate navigation
        } else if (event === "SIGNED_OUT") {
          // Only clear things if we don't have a test user
          if (!localStorage.getItem("testUser")) {
            setUser(null);
            setProfile(null);
            setUserRole(null);
            setSchoolId(null);
            setIsSuperviser(false);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        isLoading,
        schoolId,
        isSuperviser,
        signIn,
        signOut,
        setTestUser,
        signUp,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
