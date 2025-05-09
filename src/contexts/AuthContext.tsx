import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  const [authError, setAuthError] = useState<string | null>(null);

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
      }
    });

    // THEN check for existing session
    loadInitialSession();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
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
      setAuthError("Failed to load user session. Using fallback authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile data including role and school information
  const fetchUserProfile = async (userId: string) => {
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
            email: user.email
          });

          // Try to determine user role from metadata
          if (metadata.user_type) {
            let role = metadata.user_type as UserRole;
            if (role === 'school_admin') role = 'school';
            setUserRole(role);
            
            // Set supervisor status for school admins
            setIsSuperviser(role === 'school');
          } else {
            // Default to school admin for now in case of error
            setUserRole('school');
            setIsSuperviser(true);
          }
          
          toast.warning("Using limited functionality due to database connection issues");
          return;
        }

        // If no fallback is possible, show an error
        toast.error("Failed to load user profile. Some features may be limited.");
        return;
      }
      
      // First check if user is a school admin
      const { data: adminData, error: adminError } = await supabase
        .from('school_admins')
        .select('id')
        .eq('id', userId);

      if (adminError) {
        console.error("Error checking admin status:", adminError);
      } else if (adminData && adminData.length > 0) {
        setIsSuperviser(true);
        
        // Get schoolId from teachers table for school admins
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('school_id')
          .eq('id', userId)
          .single();
          
        if (teacherData) {
          setSchoolId(teacherData.school_id);
        }
        
        setUserRole('school');
      } else {
        // If not found as admin, check in teachers table
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('school_id, is_supervisor')
          .eq('id', userId)
          .single();
          
        if (teacherData) {
          setSchoolId(teacherData.school_id);
          setIsSuperviser(teacherData.is_supervisor || false);
          setUserRole('teacher');
        } else {
          // Finally check in students table
          const { data: studentData } = await supabase
            .from('students')
            .select('school_id')
            .eq('id', userId)
            .single();
            
          if (studentData) {
            setSchoolId(studentData.school_id);
            setUserRole('student');
          }
        }
      }
      
      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      
      // Set fallback role if we couldn't determine the role
      if (!userRole) {
        console.log("Setting fallback school admin role due to error");
        setUserRole('school');
        setIsSuperviser(true);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      return response;
    } catch (error) {
      console.error("Error signing in:", error);
      return { error, data: null };
    }
  };

  const signUp = async (email: string, password: string, metadata: any) => {
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
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Refresh user profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  // Set up test user
  const setTestUser = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    try {
      const testUser = TEST_USERS[type];

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
    } catch (error) {
      console.error("Error setting test user:", error);
      throw error;
    }
  };

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
