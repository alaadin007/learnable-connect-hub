
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase, isTestAccount, isTestEntity } from "@/integrations/supabase/client";
import type { User, AuthResponse } from "@supabase/supabase-js";

// Define UserProfile type
interface UserProfile {
  id: string;
  user_type: string;
  full_name: string;
  email: string;
  school_code?: string;
  school_name?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userRole: string | null;
  isLoading: boolean;
  schoolId: string | null;
  isSupervisor: boolean;
  isTestUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setTestUser: (accountType: string, index?: number) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<AuthResponse>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading=true
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const [isTestUser, setIsTestUser] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardByRole = useCallback((role: string | null) => {
    if (!role) return "/dashboard";
    switch (role) {
      case "school": return "/admin";
      case "teacher": return "/teacher/analytics";
      case "student": return "/dashboard";
      default: return "/dashboard";
    }
  }, []);

  const handleAuthenticatedNavigation = useCallback((role: string | null) => {
    const dashboardRoute = getDashboardByRole(role);
    const fromLocation = location.state?.from || dashboardRoute;
    console.log(`Navigating authenticated user to: ${fromLocation}`);
    navigate(fromLocation, { replace: true });
  }, [getDashboardByRole, location.state, navigate]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      if (isTestEntity(userId)) {
        // Mark as test user when working with test entities
        setIsTestUser(true);

        const parts = userId.split("-");
        const testType = parts.length > 1 ? parts[1] : "student";
        const testIndex = parts.length > 2 ? parseInt(parts[2]) : 0;

        const mockTestSchoolId = `test-school-${testIndex}`;
        const mockSchoolName = testIndex > 0 ? `Test School ${testIndex}` : "Test School";
        const mockSchoolCode = `TEST${testIndex}`;

        const mockProfile: UserProfile = {
          id: userId,
          user_type: testType,
          full_name: `Test ${testType.charAt(0).toUpperCase() + testType.slice(1)} User`,
          email: `${testType}.test${testIndex > 0 ? testIndex : ''}@learnable.edu`,
          school_code: mockSchoolCode,
          school_name: mockSchoolName,
          organization: {
            id: mockTestSchoolId,
            name: mockSchoolName,
            code: mockSchoolCode,
          }
        };

        setProfile(mockProfile);
        setUserRole(testType);
        setSchoolId(mockTestSchoolId);
        setIsSupervisor(testType === "school");
        return testType;
      }

      // Reset test user state when working with real users
      setIsTestUser(false);

      // Modified to handle the recursive policy error
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;

        let orgData = null;
        let isUserSupervisor = false;

        if (profileData.user_type === "school" || profileData.user_type === "teacher") {
          try {
            const { data: schoolData, error: schoolError } = await supabase
              .from("schools")
              .select("id, name, code")
              .eq("code", profileData.school_code)
              .single();
              
            if (!schoolError && schoolData) {
              orgData = schoolData;
              setSchoolId(orgData.id);
            }
          } catch (schoolError) {
            console.error("Error fetching school data:", schoolError);
          }
        } else if (profileData.user_type === "student") {
          try {
            const { data: studentData, error: studentError } = await supabase
              .from("students")
              .select("school_id")
              .eq("id", userId)
              .single();

            if (!studentError && studentData?.school_id) {
              const { data: schoolData, error: schoolError } = await supabase
                .from("schools")
                .select("id, name, code")
                .eq("id", studentData.school_id)
                .single();
                
              if (!schoolError && schoolData) {
                orgData = schoolData;
                setSchoolId(orgData.id);
              }
            }
          } catch (studentError) {
            console.error("Error fetching student data:", studentError);
          }
        }

        if (profileData.user_type === "teacher") {
          // Use a safer approach for the teachers table to avoid recursive policy issue
          try {
            // Fix: Use the proper parameter name for the RPC function
            const { data: supervisorStatus, error: supervisorError } = await supabase
              .rpc('is_supervisor', { user_id: userId });

            if (!supervisorError) {
              // Fix TypeScript error by ensuring we store a boolean
              isUserSupervisor = Boolean(supervisorStatus);
            } else {
              // Fall back to metadata if available
              isUserSupervisor = user?.user_metadata?.is_supervisor === true;
            }
          } catch (teacherError) {
            console.error("Error checking supervisor status:", teacherError);
            // Fall back to user metadata if available
            isUserSupervisor = user?.user_metadata?.is_supervisor === true;
          }
        }

        setIsSupervisor(isUserSupervisor || profileData.user_type === "school");

        const fullProfile: UserProfile = {
          ...profileData,
          email: user?.email || "",
          organization: orgData,
        };

        setProfile(fullProfile);
        setUserRole(profileData.user_type);

        return profileData.user_type;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        
        // Fallback to user metadata if available
        if (user?.user_metadata) {
          const metadata = user.user_metadata;
          const userType = metadata.user_type || "student";
          
          // Create a basic profile from metadata
          const basicProfile: UserProfile = {
            id: userId,
            user_type: userType,
            full_name: metadata.full_name || user.email?.split('@')[0] || "User",
            email: user.email || "",
            school_code: metadata.school_code,
            school_name: metadata.school_name,
          };
          
          setProfile(basicProfile);
          setUserRole(userType);
          setIsSupervisor(userType === "school" || metadata.is_supervisor === true);
          return userType;
        }
        return null;
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  }, [user]);

  // Define setTestUser before it's used to fix the error
  const setTestUser = useCallback(async (accountType: string, index = 0) => {
    setIsLoading(true);
    try {
      // First clear any existing sessions
      await supabase.auth.signOut();
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      localStorage.removeItem("testUserIndex");

      const mockId = `test-${accountType}-${index}`;
      const mockSchoolId = `test-school-${index}`;
      const mockSchoolName = index > 0 ? `Test School ${index}` : "Test School";
      const mockSchoolCode = `TEST${index}`;
      const mockEmail = `${accountType}.test${index > 0 ? index : ''}@learnable.edu`;

      const mockUser = {
        id: mockId,
        email: mockEmail,
        user_metadata: {
          full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User`,
          user_type: accountType,
          is_supervisor: accountType === "school",
          school_code: mockSchoolCode,
          school_name: mockSchoolName
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
      } as User;

      const mockProfile: UserProfile = {
        id: mockId,
        user_type: accountType,
        full_name: mockUser.user_metadata.full_name,
        email: mockEmail,
        school_code: mockSchoolCode,
        school_name: mockSchoolName,
        organization: {
          id: mockSchoolId,
          name: mockSchoolName,
          code: mockSchoolCode,
        },
      };

      // Set the local state
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType);
      setSchoolId(mockSchoolId);
      setIsSupervisor(accountType === "school");
      setIsTestUser(true);
      
      // Save to local storage for persistence
      localStorage.setItem("testUser", JSON.stringify(mockUser));
      localStorage.setItem("testUserRole", accountType);
      localStorage.setItem("testUserIndex", index.toString());

      toast.success(`Logged in as test ${accountType} user`);

      // Navigate to the appropriate dashboard based on role
      const dashboardRoute = getDashboardByRole(accountType);
      console.log(`Navigating test user to: ${dashboardRoute}`);
      navigate(dashboardRoute, { replace: true });
    } catch (error) {
      toast.error(`Test account setup failed: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, getDashboardByRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (isTestAccount(email)) {
        let accountType = "student";
        if (email.startsWith("school")) accountType = "school";
        else if (email.startsWith("teacher")) accountType = "teacher";

        const emailParts = email.split("@")[0].split(".");
        const index = emailParts.length > 1 && emailParts[1].startsWith("test")
          ? parseInt(emailParts[1].replace("test", "")) ?? 0
          : 0;

        await setTestUser(accountType, index);
        return;
      }

      // Reset test user state for real logins
      setIsTestUser(false);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from login");

      setUser(data.user);
      const role = await fetchUserProfile(data.user.id);
      handleAuthenticatedNavigation(role);
      toast.success("Logged in successfully");
    } catch (error) {
      toast.error(`Login failed: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, handleAuthenticatedNavigation, setTestUser]);

  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    setIsLoading(true);
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData }
      });
      if (response.error) throw response.error;
      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem("testUser");
      localStorage.removeItem("testUserRole");
      localStorage.removeItem("testUserIndex");

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all state immediately
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSchoolId(null);
      setIsSupervisor(false);
      setIsTestUser(false);

      // Use a small timeout to ensure state is updated before navigation
      setTimeout(() => {
        navigate("/login");
        setIsLoading(false);
      }, 10);
    } catch (error) {
      toast.error(`Logout failed: ${(error as Error).message}`);
      setIsLoading(false);
    }
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      await fetchUserProfile(user.id);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestRole = localStorage.getItem("testUserRole");
        const storedTestIndex = localStorage.getItem("testUserIndex") ?? "0";

        if (storedTestUser && storedTestRole) {
          console.log("Restoring test user session from localStorage");
          
          try {
            const testUser = JSON.parse(storedTestUser) as User;
            const testIndex = Number(storedTestIndex);
            const testEmail = testUser.email ?? `${storedTestRole}.test${testIndex}@learnable.edu`;

            const mockProfile: UserProfile = {
              id: testUser.id,
              user_type: storedTestRole,
              email: testEmail,
              full_name: testUser.user_metadata?.full_name ?? "",
              school_code: `TEST${testIndex}`,
              school_name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
              organization: {
                id: `test-school-${testIndex}`,
                name: testIndex > 0 ? `Test School ${testIndex}` : "Test School",
                code: `TEST${testIndex}`,
              }
            };

            setUser(testUser);
            setProfile(mockProfile);
            setUserRole(storedTestRole);
            setSchoolId(`test-school-${testIndex}`);
            setIsSupervisor(storedTestRole === "school");
            setIsTestUser(true);
          } catch (parseError) {
            console.error("Error parsing stored test user:", parseError);
            localStorage.removeItem("testUser");
            localStorage.removeItem("testUserRole");
            localStorage.removeItem("testUserIndex");
          }
        } else {
          console.log("No test user found, checking for real user session");
          setIsTestUser(false);
          
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            console.log("Found real user session:", sessionData.session.user.id);
            setUser(sessionData.session.user);
            
            try {
              await fetchUserProfile(sessionData.session.user.id);
            } catch (profileError) {
              console.error("Error fetching profile during init:", profileError);
              // Continue with basic user data even if profile fetch fails
              setUserRole(sessionData.session.user.user_metadata?.user_type || null);
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setInitAttempts(prev => prev + 1);
      } finally {
        // Always turn off loading after a reasonable timeout
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    };

    // If multiple init attempts fail, ensure we don't get stuck loading
    if (initAttempts > 3) {
      setIsLoading(false);
      return;
    }

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      // Avoid doing async operations directly in the callback
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid potential recursion issues with Supabase client
        setTimeout(async () => {
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error("Error fetching profile after sign in:", error);
          }
        }, 0);
      } else if (event === "SIGNED_OUT" && !localStorage.getItem("testUser")) {
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setSchoolId(null);
        setIsSupervisor(false);
        setIsTestUser(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, initAttempts]);

  // Force reset of loading state after a maximum time to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        console.warn("Auth context: Maximum loading time reached, forcing resolution");
        setIsLoading(false);
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userRole,
      isLoading,
      schoolId,
      isSupervisor,
      isTestUser,
      signIn,
      signOut,
      setTestUser,
      signUp,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
