
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, isTestAccount } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

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
  signIn: (session: Session) => Promise<void>;
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
  signIn: async () => {},
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

  // Load session from localStorage on mount
  useEffect(() => {
    const getSession = async () => {
      try {
        // First check for existing session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session retrieval error:", error);
          throw error;
        }

        // Handle session data
        if (data.session) {
          handleSession(data.session);
        } else {
          console.log("No active session found");
          // Try to restore from localStorage as fallback
          restoreFromLocalStorage();
        }
      } catch (err) {
        console.error("Error retrieving session:", err);
        restoreFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, !!session);
      if (session) {
        handleSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Restore user, profile, and role from localStorage if available
  const restoreFromLocalStorage = () => {
    try {
      // Try to find user data in localStorage
      const savedUserRole = localStorage.getItem('userRole');
      const savedSchoolId = localStorage.getItem('schoolId');
      const savedIsSuperviser = localStorage.getItem('isSuperviser') === 'true';

      // If we have the basic role data, set it
      if (savedUserRole) {
        setUserRole(savedUserRole as UserRole);
      }

      if (savedSchoolId) {
        setSchoolId(savedSchoolId);
      }

      if (savedIsSuperviser) {
        setIsSuperviser(true);
      }
    } catch (error) {
      console.error("Failed to restore auth state from localStorage:", error);
    }
  };

  // Handle session data
  const handleSession = async (newSession: Session) => {
    try {
      setSession(newSession);
      setUser(newSession.user);
      
      // Ensure API key is correctly set in future requests
      supabase.auth.setSession({
        access_token: newSession.access_token,
        refresh_token: newSession.refresh_token || '',
      });
      
      // Determine user role from metadata
      const userData = newSession.user;

      if (userData) {
        // Check if this is a test account
        const email = userData.email || '';
        if (isTestAccount(email)) {
          // For test accounts, restore from local storage
          restoreFromLocalStorage();
        } else {
          // For real users, determine role from metadata
          const metadata = userData.user_metadata;
          const userType = metadata?.user_type as UserRole || "student";
          const isAdmin = userType === 'school' || userType === 'school_admin';

          // Update state
          setUserRole(userType);
          setIsSuperviser(isAdmin);
          localStorage.setItem('userRole', userType);
          localStorage.setItem('isSuperviser', isAdmin.toString());

          // Try to fetch profile to get school ID
          await refreshProfile();
        }
      }
    } catch (error) {
      console.error("Error handling session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (session: Session) => {
    try {
      await handleSession(session);
    } catch (error) {
      console.error("Error signing in:", error);
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

      // Clear localStorage
      localStorage.removeItem('userRole');
      localStorage.removeItem('schoolId');
      localStorage.removeItem('isSuperviser');
      localStorage.removeItem('user-settings');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Refresh user profile data
  const refreshProfile = async () => {
    try {
      if (!user) return;

      // Try to get schoolId from different sources
      let userSchoolId: string | null = null;
      let userIsSuperviser = false;
      
      try {
        // First check if user is a school admin
        const { data: adminData, error: adminError } = await supabase
          .from('school_admins')
          .select('id')
          .eq('id', user.id);

        if (!adminError && adminData && adminData.length > 0) {
          userIsSuperviser = true;
          
          // Get schoolId from teachers table for school admins
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('school_id')
            .eq('id', user.id)
            .single();
            
          if (teacherData) {
            userSchoolId = teacherData.school_id;
          }
        }
        
        if (!userSchoolId) {
          // If not found as admin, check in teachers table
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('school_id, is_supervisor')
            .eq('id', user.id)
            .single();
            
          if (teacherData) {
            userSchoolId = teacherData.school_id;
            userIsSuperviser = teacherData.is_supervisor || false;
          } else {
            // Finally check in students table
            const { data: studentData } = await supabase
              .from('students')
              .select('school_id')
              .eq('id', user.id)
              .single();
              
            if (studentData) {
              userSchoolId = studentData.school_id;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching school ID:", error);
      }

      // Update local state
      setSchoolId(userSchoolId);
      setIsSuperviser(userIsSuperviser);

      // Store in localStorage for persistence
      if (userSchoolId) {
        localStorage.setItem('schoolId', userSchoolId);
      }
      localStorage.setItem('isSuperviser', userIsSuperviser.toString());
      
      // Extract user role from metadata and store it
      if (user.user_metadata?.user_type) {
        const role = user.user_metadata.user_type as UserRole;
        setUserRole(role);
        localStorage.setItem('userRole', role);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
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

      // Store in localStorage for persistence
      localStorage.setItem('userRole', testUser.role);
      localStorage.setItem('schoolId', testUser.schoolId);
      localStorage.setItem('isSuperviser', testUser.isSuperviser.toString());
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
