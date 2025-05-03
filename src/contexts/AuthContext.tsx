import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import {
  Session,
  User,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isTestAccount, TEST_SCHOOL_CODE } from "@/integrations/supabase/client";
import sessionLogger from "@/utils/sessionLogger";
import { populateTestAccountWithSessions } from "@/utils/sessionLogging";

// Helper function to check if a value is a non-null object
function isNonNullObject(value: any): value is object {
  return value !== null && typeof value === "object";
}

export type UserRole = "school" | "teacher" | "student" | string;

export type UserProfile = {
  id: string;
  user_type?: UserRole;
  full_name?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  } | null;
  // Additional properties that might be used elsewhere
  school_name?: string;
  school_code?: string;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  loading: boolean; // Alias for isLoading for compatibility
  isSuperviser: boolean;
  schoolId: string | null;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (
    type: 'school' | 'teacher' | 'student',
    schoolIndex?: number
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true);
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user || null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        toast.error("Failed to retrieve session. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
          setIsSuperviser(false);
          setSchoolId(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_type,
          full_name,
          organization (
            id,
            name,
            code
          )
        `
        )
        .eq("id", userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (profileData) {
        let safeProfileData: UserProfile = {
          ...profileData,
          organization: null,
        };

        const org = profileData.organization;

        if (isNonNullObject(org)) {
          if (!('error' in org)) {
            safeProfileData.organization = org;
          } else {
            safeProfileData.organization = null;
          }
        } else {
          safeProfileData.organization = null;
        }

        setProfile(safeProfileData);
        setUserRole(profileData.user_type || null);
        setIsSuperviser(profileData.user_type === "superviser");

        setSchoolId(safeProfileData.organization?.id || null);

        if (isTestAccount(user?.email || '')) {
          if (safeProfileData.organization && safeProfileData.organization.code === undefined) {
            await updateProfile({
              organization: { code: TEST_SCHOOL_CODE },
            });
          }

          // For student test accounts, ensure we have proper session tracking
          if (profileData.user_type === 'student') {
            // Check if there are existing sessions
            const { data: existingSessions } = await supabase
              .from('session_logs')
              .select('id')
              .eq('user_id', userId)
              .limit(1);

            // If no sessions exist, create test sessions
            if (!existingSessions || existingSessions.length === 0) {
              // First create a current active session
              await sessionLogger.startSession('Test Session', userId);
              
              // Create some past sessions for history
              const topics = ['Math', 'Science', 'History', 'Literature', 'Programming'];
              const now = new Date();
              
              for (let i = 1; i <= 5; i++) {
                const pastDate = new Date(now);
                pastDate.setDate(now.getDate() - i);
                
                await supabase
                  .from('session_logs')
                  .insert({
                    user_id: userId,
                    school_id: safeProfileData.organization?.id,
                    topic_or_content_used: topics[i % topics.length],
                    session_start: pastDate.toISOString(),
                    session_end: new Date(pastDate.getTime() + 45 * 60000).toISOString(), // 45 min session
                    num_queries: Math.floor(Math.random() * 15) + 5 // 5-20 queries
                  });
              }
            } else {
              // Just ensure we have a current active session
              await sessionLogger.startSession('Continued Test Session', userId);
            }
          } else if (profileData.user_type === 'teacher') {
            const orgId = safeProfileData.organization?.id || '';
            if (orgId) {
              await populateTestAccountWithSessions(userId, orgId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to retrieve profile. Please try again.");
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password?: string) => {
    // For test accounts, use setTestUser directly for instant authentication
    if (email.includes('.test@learnable.edu')) {
      let type: 'school' | 'teacher' | 'student' = 'student';
      
      if (email.startsWith('school')) {
        type = 'school';
      } else if (email.startsWith('teacher')) {
        type = 'teacher';
      }
      
      await setTestUser(type);
      return;
    }
    
    setIsLoading(true);
    try {
      // Handle password-based authentication if provided
      if (password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Fallback to OTP if no password
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        toast.success("Check your email for the magic link.");
      }
    } catch (error: any) {
      toast.error(error.error_description || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success("Registration successful! Please check your email.");
    } catch (error: any) {
      toast.error(error.error_description || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // If it's a student, end any active sessions
      if (userRole === 'student') {
        try {
          await sessionLogger.endSession('User logged out');
        } catch (error) {
          console.error("Error ending session:", error);
          // Continue with sign out even if ending session fails
        }
      }
      
      await supabase.auth.signOut();
      
      // Clear local state
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      
      navigate("/");
    } catch (error: any) {
      toast.error(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user?.id,
        ...updates,
      });

      if (error) throw error;

      // Optimistically update the profile in the context
      setProfile((prevProfile) => ({
        ...prevProfile,
        ...updates,
      }));
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced setTestUser method that creates a mock session without authentication
  const setTestUser = async (
    type: 'school' | 'teacher' | 'student',
    schoolIndex: number = 0
  ): Promise<void> => {
    setIsLoading(true);
    try {
      console.log(`Setting up test user: ${type}`);
      
      // Prepare mock user data with a consistent ID pattern
      const mockId = `test-${type}-${schoolIndex}`;
      const mockUser = {
        id: mockId,
        email: `${type}.test@learnable.edu`,
        user_metadata: {
          full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          user_type: type
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString()
      } as User; // Type assertion to User

      // Create mock profile based on user type
      const mockProfile: UserProfile = {
        id: mockId,
        user_type: type,
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        organization: {
          id: `test-school-${schoolIndex}`,
          name: schoolIndex === 0 ? "Test School" : `Test School ${schoolIndex + 1}`,
          code: `TEST${schoolIndex}`
        }
      };

      // Create a mock session
      const mockSession = {
        user: mockUser,
        access_token: `test-token-${type}-${Date.now()}`,
        refresh_token: `test-refresh-${type}-${Date.now()}`,
        expires_at: Date.now() + 3600000 // 1 hour from now
      } as Session;

      // Set context values immediately for instant UI response
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSuperviser(false);
      setSchoolId(mockProfile.organization?.id || null);
      setSession(mockSession);
      
      // For student test accounts, ensure we have proper session tracking
      if (type === 'student') {
        try {
          // Start a session for the student
          await sessionLogger.startSession('Test Login Session', mockId);
        } catch (error) {
          console.error("Error starting test session:", error);
          // Continue with login even if session tracking fails
        }
      }

      console.log(`Test user ${type} set up successfully`);
    } catch (error) {
      console.error("Error setting test user:", error);
      throw new Error("Failed to set up test account");
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    userRole,
    isLoading,
    loading: isLoading,
    isSuperviser,
    schoolId,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    setTestUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
