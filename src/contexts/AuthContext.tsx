
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Define types for user roles based on the actual application structure
export type UserRole = "school" | "school_admin" | "teacher" | "student";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: any | null;
  userRole: UserRole | null;
  isSuperviser: boolean;
  schoolId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any | null; data: any | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (type: "school" | "teacher" | "student", schoolIndex?: number) => Promise<void>;
}

// Create context with a default value
const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  userRole: null,
  isSuperviser: false,
  schoolId: null,
  isLoading: true,
  signIn: async () => ({ error: null, data: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  setTestUser: async () => {},
});

// Define test user data
const TEST_USERS = {
  school: {
    id: "test-school-admin",
    email: "school.test@learnable.edu",
    name: "Test School Admin",
    role: "school",
    schoolId: "test-school-id",
    isSuperviser: true,
  },
  teacher: {
    id: "test-teacher",
    email: "teacher.test@learnable.edu",
    name: "Test Teacher",
    role: "teacher",
    schoolId: "test-school-id",
    isSuperviser: false,
  },
  student: {
    id: "test-student",
    email: "student.test@learnable.edu",
    name: "Test Student",
    role: "student",
    schoolId: "test-school-id",
    isSuperviser: false,
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile data including role and school information - wrapped in useCallback
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);

      // Check for database access issues
      const { error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (testError) {
        console.error("Database access test failed:", testError);
        
        // Use metadata from the session as a fallback if available
        if (user?.user_metadata) {
          const metadata = user.user_metadata;
          
          // Set fallback values from metadata
          setProfile({
            id: userId,
            full_name: metadata.full_name || metadata.name || 'User',
            email: user.email,
            user_type: metadata.user_type
          });

          // Try to determine user role from metadata
          if (metadata.user_type) {
            // IMPORTANT: Fix here - correctly map school_admin to school role
            let role = metadata.user_type as UserRole;
            if (role === 'school_admin') role = 'school';
            setUserRole(role);
            
            // Set supervisor status for school admins
            setIsSuperviser(role === 'school');

            // Also store in localStorage for backup access
            localStorage.setItem('userRole', role);
            if (metadata.school_id) {
              localStorage.setItem('schoolId', metadata.school_id);
              setSchoolId(metadata.school_id);
            }
          } else {
            // Default to student if user_type isn't specified
            console.log("No user_type in metadata, defaulting to student role");
            setUserRole('student');
            setIsSuperviser(false);
            localStorage.setItem('userRole', 'student');
          }
          
          toast.info("Using profile data from account metadata");
          return;
        }

        // Emergency fallback - set as student
        console.log("No metadata available, using emergency fallback to student role");
        setUserRole('student');
        setIsSuperviser(false);
        localStorage.setItem('userRole', 'student');
        toast.error("Failed to load user profile. Some features may be limited.");
        return;
      }
      
      // First check if user is a school admin using the safer function
      const { data: isAdminData } = await supabase
        .rpc('is_school_admin_safe', { user_id_param: userId });
      
      if (isAdminData) {
        console.log("User found as school admin");
        setIsSuperviser(true);
        localStorage.setItem('userRole', 'school');
        
        // Get schoolId from teachers table for school admins
        const { data: schoolIdData } = await supabase
          .rpc('get_user_school_id_safe', { user_id_param: userId });
          
        if (schoolIdData) {
          setSchoolId(schoolIdData);
          localStorage.setItem('schoolId', schoolIdData);
        }
        
        setUserRole('school');
      } else {
        // If not found as admin, check if user is a supervisor
        const { data: isSupervisorData } = await supabase
          .rpc('is_user_supervisor_safe', { user_id_param: userId });
        
        const { data: userRoleData } = await supabase
          .rpc('get_user_role_safe', { user_id_param: userId });
        
        const { data: schoolIdData } = await supabase
          .rpc('get_user_school_id_safe', { user_id_param: userId });
          
        if (schoolIdData) {
          setSchoolId(schoolIdData);
          localStorage.setItem('schoolId', schoolIdData);
        }
        
        if (userRoleData) {
          setUserRole(userRoleData as UserRole);
          localStorage.setItem('userRole', userRoleData);
        } else {
          // Default to student role if we can't determine
          setUserRole('student');
          localStorage.setItem('userRole', 'student');
        }
        
        setIsSuperviser(isSupervisorData || false);
      }
      
      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileData) {
        setProfile(profileData);
      } else if (user?.user_metadata) {
        // Use metadata to create fallback profile
        setProfile({
          id: userId,
          full_name: user.user_metadata.full_name || 'User',
          email: user.email,
          user_type: userRole || user.user_metadata.user_type
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      
      // Set fallback role from metadata if we couldn't determine the role
      if (!userRole && user?.user_metadata?.user_type) {
        const role = user.user_metadata.user_type as UserRole;
        console.log("Setting fallback role from metadata due to error:", role);
        setUserRole(role);
        localStorage.setItem('userRole', role);
      } else if (!userRole) {
        // Final fallback - default to student
        console.log("Setting fallback student role due to error");
        setUserRole('student');
        localStorage.setItem('userRole', 'student');
      }
    }
  }, [user, userRole]);

  useEffect(() => {
    // Set up auth state listener FIRST - critical for avoiding deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, !!newSession);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Don't make any Supabase calls directly in the callback
      if (newSession?.user) {
        // Use setTimeout to ensure we don't create a Supabase deadlock
        setTimeout(() => {
          fetchUserProfile(newSession.user.id);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Clear all auth state
        setProfile(null);
        setUserRole(null);
        setIsSuperviser(false);
        setSchoolId(null);
        
        // Also clear localStorage items related to auth
        localStorage.removeItem('userRole');
        localStorage.removeItem('schoolId');
      }
    });

    // THEN check for existing session
    const loadInitialSession = async () => {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Initial session error:", error);
          throw error;
        }
        
        if (data.session) {
          // Update state with session data
          setSession(data.session);
          setUser(data.session.user);
          
          // Fetch additional user information
          await fetchUserProfile(data.session.user.id);
        }
      } catch (err) {
        console.error("Error loading initial session:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialSession();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      return response;
    } catch (error) {
      console.error("Error signing in:", error);
      return { error, data: null };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata: any) => {
    try {
      const response = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: metadata
        }
      });
      
      return response;
    } catch (error) {
      console.error("Error signing up:", error);
      return { error, data: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('schoolId');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  // Refresh user profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  // Set up test user
  const setTestUser = useCallback(async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    try {
      const testUser = TEST_USERS[type];

      // Store test account type in sessionStorage for easier recovery
      sessionStorage.setItem('testAccountType', type);

      // Create a fake session for test users
      const fakeSession = {
        provider_token: null,
        provider_refresh_token: null,
        access_token: `test-access-token-${type}`,
        refresh_token: `test-refresh-token-${type}`,
        expires_in: 60 * 60,
        expires_at: new Date().getTime() + 60 * 60 * 1000,
        token_type: "bearer",
        user: {
          id: testUser.id,
          app_metadata: {},
          user_metadata: {
            user_type: testUser.role,
            full_name: testUser.name,
          },
          aud: "authenticated",
          email: testUser.email,
        },
      } as unknown as Session;

      // Set fake session
      setSession(fakeSession);
      setUser(fakeSession.user as User);
      setProfile({ full_name: testUser.name, email: testUser.email });
      setUserRole(testUser.role as UserRole);
      setIsSuperviser(testUser.isSuperviser);
      setSchoolId(testUser.schoolId);
      localStorage.setItem('userRole', testUser.role);
      localStorage.setItem('schoolId', testUser.schoolId);
    } catch (error) {
      console.error("Error setting test user:", error);
      throw error;
    }
  }, []);

  const contextValue: AuthState = {
    session,
    user,
    profile,
    userRole,
    isSuperviser,
    schoolId,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    setTestUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Create and export the hook
export const useAuth = () => useContext(AuthContext);
