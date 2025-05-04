
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Define types for our context
interface UserProfile {
  id: string;
  user_type: string;
  full_name: string;
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
  setTestUser: (accountType: string) => Promise<void>;
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

      // Set full profile with organization if available
      const fullProfile = {
        ...profileData,
        organization: orgData
      };

      setProfile(fullProfile);
      setUserRole(profileData.user_type);
      return profileData.user_type;
      
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, []);

  // Sign in a user with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
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
  }, [fetchUserProfile, handleAuthenticatedNavigation]);

  // Sign out a user
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear any test user data from localStorage first
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      
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

  // Setup test user (bypass authentication)
  const setTestUser = useCallback(async (accountType: string) => {
    try {
      setIsLoading(true);
      
      // Clear any existing auth first
      await supabase.auth.signOut();
      
      // Create simulated user and profile based on account type
      const testUserId = `test-${accountType}-${Date.now()}`;
      
      // Create mock user data
      const mockUser = {
        id: testUserId,
        email: `${accountType}.test@learnable.edu`,
        user_metadata: {
          full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User`,
        },
      } as User;
      
      // Create mock profile data
      const mockProfile = {
        id: testUserId,
        user_type: accountType,
        full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User`,
        school_code: 'TEST123',
        school_name: 'Test School',
        organization: {
          id: 'test-school-id',
          name: 'Test School',
          code: 'TEST123'
        }
      };
      
      // Store test user flag in localStorage for persistence
      localStorage.setItem("testUser", JSON.stringify(mockUser));
      localStorage.setItem("testUserRole", accountType);
      
      // Update states
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType);
      setSchoolId('test-school-id');
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

  // Initial authentication check and setup
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Check if we have a test user in localStorage first
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestRole = localStorage.getItem("testUserRole");
        
        if (storedTestUser && storedTestRole) {
          // Restore test user session
          const testUser = JSON.parse(storedTestUser) as User;
          
          // Setup simulated test user session from localStorage
          const mockProfile = {
            id: testUser.id,
            user_type: storedTestRole,
            full_name: testUser.user_metadata.full_name,
            school_code: 'TEST123',
            school_name: 'Test School',
            organization: {
              id: 'test-school-id',
              name: 'Test School',
              code: 'TEST123'
            }
          };
          
          setUser(testUser);
          setProfile(mockProfile);
          setUserRole(storedTestRole);
          setSchoolId('test-school-id');
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

