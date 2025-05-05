
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
import { ensureTestAccountsSetup, generateTestSessionData } from "@/utils/testAccountUtils";

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
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        const profileData = {
          ...data,
          organization: {
            id: schoolId || null,
            name: data.school_name || null,
            code: data.school_code || null,
          }
        };
        
        setProfile(profileData);
        setUserRole(data.user_type || null);
        
        // Check if teacher is supervisor
        if (data.user_type === 'teacher' || data.user_type === 'school') {
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("is_supervisor")
            .eq("id", user.id)
            .maybeSingle();
            
          setIsSupervisor(!!teacherData?.is_supervisor);
        }
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };
  
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        // Check for test user in local storage
        const storedTestUser = localStorage.getItem("testUser");
        const storedTestUserRole = localStorage.getItem("testUserRole");
        const storedTestUserIndex = localStorage.getItem("testUserIndex");

        if (storedTestUser && storedTestUserRole && storedTestUserIndex) {
          // Parse the stored test user data
          const testUser = JSON.parse(storedTestUser);
          const accountType = storedTestUserRole as
            | "school"
            | "teacher"
            | "student";
          const index = parseInt(storedTestUserIndex, 10);

          console.log(
            `AuthContext: Found stored test user (${accountType}), setting up...`
          );
          
          // Mark as test user
          setIsTestUser(true);

          // Set up test user directly
          await setTestUser(accountType, index, false);
          return; // Skip regular session loading
        }

        // Load Supabase session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);

        if (currentSession) {
          console.log("AuthContext: Session loaded, setting user...");
          setUser(currentSession.user);

          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentSession.user.id)
            .single();

          if (profileError) {
            console.error("AuthContext: Error fetching profile:", profileError);
            throw profileError;
          }

          if (profileData) {
            console.log("AuthContext: Profile loaded, setting role...");
            
            // Add the organization property to the profile
            const enhancedProfile = {
              ...profileData,
              organization: {
                name: profileData.school_name,
                code: profileData.school_code
              }
            };
            
            setProfile(enhancedProfile);
            setUserRole(profileData.user_type || "unknown");

            // Set school ID
            if (profileData.school_code) {
              const { data: schoolData, error: schoolError } = await supabase
                .from("schools")
                .select("id")
                .eq("code", profileData.school_code)
                .single();

              if (schoolError) {
                console.error("AuthContext: Error fetching school:", schoolError);
              } else if (schoolData) {
                console.log("AuthContext: School ID loaded:", schoolData.id);
                setSchoolId(schoolData.id);
                
                // Update organization.id in the profile
                enhancedProfile.organization.id = schoolData.id;
                setProfile(enhancedProfile);
              }
            }

            // Check if teacher is supervisor
            if (profileData.user_type === 'teacher' || profileData.user_type === 'school') {
              const { data: teacherData } = await supabase
                .from("teachers")
                .select("is_supervisor")
                .eq("id", currentSession.user.id)
                .maybeSingle();
                
              setIsSupervisor(!!teacherData?.is_supervisor);
            }

            // Store last active role
            localStorage.setItem("lastActiveRole", profileData.user_type);
          }
        } else {
          console.log("AuthContext: No session found");
        }
      } catch (error) {
        console.error("AuthContext: Error loading session:", error);
        toast.error("Failed to load session");
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
          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentSession.user.id)
            .single();

          if (profileError) {
            console.error("AuthContext: Error fetching profile:", profileError);
            return;
          }

          if (profileData) {
            const enhancedProfile = {
              ...profileData,
              organization: {
                name: profileData.school_name,
                code: profileData.school_code
              }
            };
            
            setProfile(enhancedProfile);
            setUserRole(profileData.user_type || "unknown");

            // Set school ID
            if (profileData.school_code) {
              const { data: schoolData, error: schoolError } = await supabase
                .from("schools")
                .select("id")
                .eq("code", profileData.school_code)
                .single();

              if (schoolError) {
                console.error("AuthContext: Error fetching school:", schoolError);
              } else if (schoolData) {
                setSchoolId(schoolData.id);
                
                // Update organization.id in the profile
                enhancedProfile.organization.id = schoolData.id;
                setProfile(enhancedProfile);
              }
            }

            // Check if teacher is supervisor
            if (profileData.user_type === 'teacher' || profileData.user_type === 'school') {
              const { data: teacherData } = await supabase
                .from("teachers")
                .select("is_supervisor")
                .eq("id", currentSession.user.id)
                .maybeSingle();
                
              setIsSupervisor(!!teacherData?.is_supervisor);
            }

            // Store last active role
            localStorage.setItem("lastActiveRole", profileData.user_type);
          }
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("AuthContext: Sign in error:", error);
        throw error;
      }

      console.log("AuthContext: Sign in successful");
      toast.success("Signed in successfully");
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
        
        // Generate a stable user ID for the test account
        const userId = `test-${accountType}-${index}`;
        const schoolId = `test-school-${index}`;
        
        console.log(`Setting up test account: ${accountType} (${userId})`);
        
        // Mark as test user
        setIsTestUser(true);
        
        // Make sure all test accounts are properly set up
        await ensureTestAccountsSetup();
        
        // For test student accounts, generate session data
        if (accountType === "student") {
          await generateTestSessionData(userId, schoolId);
        }
        
        // Get profile data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
          
        if (!profileData) {
          throw new Error("Test account profile not found");
        }
        
        // Set up mock user data
        const mockUser = {
          id: userId,
          email: `${accountType}.test${index > 0 ? index : ''}@learnable.edu`,
          user_metadata: {
            full_name: profileData.full_name || `Test ${accountType.charAt(0).toUpperCase()}${accountType.slice(1)}`,
            user_type: accountType,
            school_code: profileData.school_code || "TEST0",
            school_name: profileData.school_name || "Test School",
          },
        };
        
        // Store in localStorage to persist across page loads
        localStorage.setItem("testUser", JSON.stringify(mockUser));
        localStorage.setItem("testUserRole", accountType);
        localStorage.setItem("testUserIndex", index.toString());
        
        // Update state
        setUser(mockUser);
        setUserRole(accountType);
        
        // Set up enhanced profile with organization object
        const enhancedProfile = {
          id: userId,
          user_type: accountType,
          full_name: mockUser.user_metadata.full_name,
          school_code: profileData.school_code || "TEST0",
          school_name: profileData.school_name || "Test School",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization: {
            name: profileData.school_name || "Test School",
            code: profileData.school_code || "TEST0"
          }
        };
        
        setProfile(enhancedProfile);
        
        // Set school ID based on account type
        let userSchoolId = schoolId;
        if (accountType === "school" || accountType === "teacher") {
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("school_id, is_supervisor")
            .eq("id", userId)
            .single();
            
          if (teacherData?.school_id) {
            userSchoolId = teacherData.school_id;
          }
          
          // Set supervisor status
          setIsSupervisor(!!teacherData?.is_supervisor);
        } else if (accountType === "student") {
          const { data: studentData } = await supabase
            .from("students")
            .select("school_id")
            .eq("id", userId)
            .single();
            
          if (studentData?.school_id) {
            userSchoolId = studentData.school_id;
          }
        }
        
        setSchoolId(userSchoolId);
        
        // Update organization.id in the profile
        enhancedProfile.organization.id = userSchoolId;
        setProfile(enhancedProfile);
        
        // Navigate based on role
        if (accountType === "school") {
          navigate("/admin", { state: { fromTestAccounts: true, accountType } });
        } else if (accountType === "teacher") {
          navigate("/teacher/analytics", { state: { fromTestAccounts: true, accountType } });
        } else {
          navigate("/dashboard", { state: { fromTestAccounts: true, accountType } });
        }
        
        console.log(`Test account set up successfully: ${accountType}`);
      } catch (error) {
        console.error("Error setting up test user:", error);
        toast.error("Failed to set up test account");
      } finally {
        if (showLoadingState) {
          setIsLoggingIn(false);
        }
      }
    },
    [navigate]
  );

  const value: AuthContextType = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
