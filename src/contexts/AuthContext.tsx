import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import { supabase, isTestAccount } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { 
  ensureTestAccountsSetup, 
  generateTestSessionData,
  validateAndFixTestAccount 
} from "@/utils/testAccountUtils";

type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  school_code: string | null;
  school_name: string | null;
  user_type: string;
  organization?: {
    id?: string;
    name?: string;
    code?: string;
  };
};

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  session: Session | null;
  userRole: string | null;
  schoolId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  isLoading: boolean;
  isLoggingIn: boolean;
  setTestUser: (
    accountType: "school" | "teacher" | "student",
    index?: number,
    showLoadingState?: boolean
  ) => Promise<void>;
  refreshProfile?: () => Promise<void>;
  isSupervisor?: boolean;
  isTestUser?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const navigate = useNavigate();

  // Function to refresh profile
  const refreshProfile = async () => {
    try {
      if (!user) return;
      
      console.log("Refreshing profile for user:", user.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error refreshing profile:", error);
        throw error;
      }

      if (data) {
        console.log("Profile data fetched:", data);
        
        // First determine school ID
        let userSchoolId = null;
        
        if (data.user_type === 'teacher' || data.user_type === 'school') {
          // For teachers and school admins, get school ID from teachers table
          const { data: teacherData, error: teacherError } = await supabase
            .from("teachers")
            .select("school_id")
            .eq("id", user.id)
            .single();

          if (!teacherError && teacherData) {
            userSchoolId = teacherData.school_id;
            console.log("Found school ID from teachers table:", userSchoolId);
          }
        } else if (data.user_type === 'student') {
          // For students, get school ID from students table
          const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select("school_id")
            .eq("id", user.id)
            .single();
            
          if (!studentError && studentData) {
            userSchoolId = studentData.school_id;
            console.log("Found school ID from students table:", userSchoolId);
          }
        }
        
        // If school ID not found in role-specific tables, fall back to school_code in profiles
        if (!userSchoolId && data.school_code) {
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("id")
            .eq("code", data.school_code)
            .single();

          if (!schoolError && schoolData) {
            userSchoolId = schoolData.id;
            console.log("Found school ID from school code:", userSchoolId);
          }
        }
        
        const enhancedProfile = {
          ...data,
          organization: {
            id: userSchoolId, // Set ID from fetched school data
            name: data.school_name || null,
            code: data.school_code || null,
          }
        };
        
        console.log("Setting enhanced profile:", enhancedProfile);
        
        setProfile(enhancedProfile);
        setUserRole(data.user_type || null);
        setSchoolId(userSchoolId);
        
        // Check if teacher is supervisor
        if (data.user_type === 'teacher' || data.user_type === 'school') {
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("is_supervisor")
            .eq("id", user.id)
            .maybeSingle();
            
          setIsSupervisor(!!teacherData?.is_supervisor);
          console.log("Is supervisor:", !!teacherData?.is_supervisor);
        }
        
        return enhancedProfile;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing profile:", error);
      return null;
    }
  };
  
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        console.log("AuthContext: Starting session load process");
        
        // Check for test user in local storage
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestUserRole = localStorage.getItem("testUserRole");
        const storedTestUserIndex = localStorage.getItem("testUserIndex");

        if (storedTestUserRole) {
          // Parse the stored test user data
          const accountType = storedTestUserRole as
            | "school"
            | "teacher"
            | "student";
          const index = storedTestUserIndex ? parseInt(storedTestUserIndex, 10) : 0;

          console.log(
            `AuthContext: Found stored test user role (${accountType}), setting up...`
          );
          
          // Mark as test user
          setIsTestUser(true);

          // Set up test user directly
          await setTestUser(accountType, index, false);
          return; // Skip regular session loading
        }

        // Load Supabase session
        console.log("AuthContext: Getting current session");
        const {
          data: { session: currentSession },
          error: sessionError
        } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("AuthContext: Error getting session:", sessionError);
          throw sessionError;
        }

        console.log("AuthContext: Session fetch result:", currentSession ? "Session found" : "No session found");
        setSession(currentSession);

        if (currentSession) {
          console.log("AuthContext: Session loaded, setting user...");
          setUser(currentSession.user);

          // Get user profile
          console.log("AuthContext: Fetching profile data");
          const profile = await refreshProfile();
          
          if (!profile) {
            console.error("AuthContext: Failed to load profile, signing out");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setProfile(null);
            toast.error("Failed to load user profile. Please log in again.");
          }
        } else {
          console.log("AuthContext: No session found, not authenticated");
        }
      } catch (error) {
        console.error("AuthContext: Error loading session:", error);
        toast.error("Failed to load session. Please try logging in again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("AuthContext: Auth state change:", event);
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession) {
          // Don't fetch profile immediately - use setTimeout to avoid potential deadlocks
          // with Supabase's internal state management
          setTimeout(async () => {
            try {
              await refreshProfile();
            } catch (profileError) {
              console.error("Error fetching profile after auth state change:", profileError);
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setSchoolId(null);
          setIsSupervisor(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      console.log("Starting sign in process for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("AuthContext: Sign in error:", error);
        throw error;
      }

      console.log("AuthContext: Sign in successful");
      toast.success("Signed in successfully");
      
      // Force a profile refresh to ensure all data is current
      setTimeout(async () => {
        try {
          await refreshProfile();
        } catch (profileError) {
          console.error("Error refreshing profile after signin:", profileError);
        }
      }, 0);
    } catch (error: any) {
      console.error("AuthContext: Sign in failed:", error.message);
      toast.error(error.message || "Sign in failed");
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("AuthContext: Sign out error:", error);
        throw error;
      }

      console.log("AuthContext: Sign out successful");
      toast.success("Signed out successfully");

      // Clear local storage
      localStorage.removeItem("lastActiveRole");
      localStorage.removeItem("lastActiveSchool");
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      localStorage.removeItem("testUserIndex");
      localStorage.removeItem("activeSessionId");

      // Reset state
      setUser(null);
      setProfile(null);
      setSession(null);
      setUserRole(null);
      setSchoolId(null);

      // Redirect to home page
      navigate("/");
    } catch (error) {
      console.error("AuthContext: Sign out failed:", error);
      toast.error("Sign out failed");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, metadata?: any) => {
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        console.error("AuthContext: Sign up error:", error);
        throw error;
      }

      console.log("AuthContext: Sign up successful");
      toast.success("Signed up successfully. Please check your email.");
    } catch (error: any) {
      console.error("AuthContext: Sign up failed:", error.message);
      toast.error(error.message || "Sign up failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Set up a test user for instant login without authentication
   */
  const setTestUser = useCallback(
    async (
      accountType: "school" | "teacher" | "student",
      index: number = 0,
      showLoadingState: boolean = true
    ) => {
      try {
        if (showLoadingState) {
          setIsLoggingIn(true);
        }
        
        console.log(`Setting up test account: ${accountType}, index: ${index}`);
        
        // Generate a stable user ID for the test account
        const userId = `test-${accountType}-${index}`;
        const schoolId = `test-school-${index}`;
        
        // Mark as test user
        setIsTestUser(true);
        
        // Make sure all test accounts are properly set up
        await ensureTestAccountsSetup();
        
        // Make sure this specific test account is valid
        await validateAndFixTestAccount(userId, accountType);
        
        // For test student accounts, generate session data
        if (accountType === "student") {
          await generateTestSessionData(userId, schoolId);
        }
        
        // Set up mock user data with predefined school information
        const mockUser = {
          id: userId,
          email: `${accountType}.test${index > 0 ? index : ''}@learnable.edu`,
          user_metadata: {
            full_name: `Test ${accountType.charAt(0).toUpperCase()}${accountType.slice(1)}`,
            user_type: accountType,
            school_code: `TEST${index}`,
            school_name: `Test School${index > 0 ? ' ' + index : ''}`
          }
        };
        
        // Store in localStorage to persist across page loads
        localStorage.setItem("testUser", JSON.stringify(mockUser));
        localStorage.setItem("testUserRole", accountType);
        localStorage.setItem("testUserIndex", String(index));
        
        // Set up the user state
        setUser(mockUser);
        setUserRole(accountType);
        setSchoolId(schoolId);
        
        // Set up supervisor status for school admins
        setIsSupervisor(accountType === "school");
        
        // Set up mock profile
        const mockProfile = {
          id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          full_name: mockUser.user_metadata.full_name,
          school_code: mockUser.user_metadata.school_code,
          school_name: mockUser.user_metadata.school_name,
          user_type: accountType,
          organization: {
            id: schoolId,
            name: mockUser.user_metadata.school_name,
            code: mockUser.user_metadata.school_code
          }
        };
        
        setProfile(mockProfile);
        
        // Show success message
        toast.success(`Logged in as Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`);
        
        // Navigate to appropriate dashboard based on role
        if (accountType === "school") {
          navigate("/admin", { replace: true });
        } else if (accountType === "teacher") {
          navigate("/teacher/analytics", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (error: any) {
        console.error("Error setting up test user:", error);
        toast.error(`Failed to set up test account: ${error.message || "Unknown error"}`);
        
        // Reset test user state
        localStorage.removeItem("testUser");
        localStorage.removeItem("testUserRole");
        localStorage.removeItem("testUserIndex");
        
        setIsTestUser(false);
      } finally {
        setIsLoggingIn(false);
      }
    },
    [navigate]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        userRole,
        schoolId,
        signIn,
        signOut,
        signUp,
        isLoading,
        isLoggingIn,
        setTestUser,
        refreshProfile,
        isSupervisor,
        isTestUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
