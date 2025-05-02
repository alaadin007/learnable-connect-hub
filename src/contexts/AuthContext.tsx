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

    supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
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
    });
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
        // Initialize with null organization to handle the case where it might be missing
        let safeProfileData: UserProfile = {
          ...profileData,
          organization: null 
        };

        // Check if organization exists and is a valid object before accessing its properties
        if (
          profileData.organization !== null &&
          typeof profileData.organization === 'object' &&
          !('error' in profileData.organization)
        ) {
          safeProfileData.organization = profileData.organization;
        }

        setProfile(safeProfileData);
        setUserRole(profileData.user_type || null);
        setIsSuperviser(profileData.user_type === "superviser");

        // Safely access organization.id with null check
        setSchoolId(safeProfileData.organization?.id || null);

        // Handle test accounts
        if (isTestAccount(user?.email || '')) {
          if (safeProfileData.organization && safeProfileData.organization.code === undefined) {
            // Auto-assign test school code if missing
            await updateProfile({
              organization: { code: TEST_SCHOOL_CODE },
            });
          }

          // Populate test account with session data
          if (profileData.user_type === 'student') {
            await sessionLogger.startSession('Test Session', userId);
            await sessionLogger.endSession('Test Session');
          } else if (profileData.user_type === 'teacher') {
            // Make sure we have a valid organization ID
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
      await supabase.auth.signOut();
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

  // Enhanced setTestUser method to provide more comprehensive test data
  const setTestUser = async (
    type: 'school' | 'teacher' | 'student',
    schoolIndex: number = 0
  ): Promise<void> => {
    setIsLoading(true);
    try {
      // Mock user and profile data for test accounts
      const mockId = `test-${type}-${schoolIndex}`;
      const mockUser = {
        id: mockId,
        email: `${type}.test@learnable.edu`,
        user_metadata: {
          full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString()
      } as unknown as User; // Type assertion to User

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

      // Set context values
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSuperviser(false);
      setSchoolId(mockProfile.organization?.id || null);

      // Create a fake session
      const mockSession = {
        user: mockUser,
        access_token: "test-token",
        refresh_token: "test-refresh-token",
        expires_at: Date.now() + 3600000
      } as Session;

      setSession(mockSession);

      // For test accounts, pre-populate with appropriate data based on role
      if (type === 'student') {
        // Generate sample sessions and assessment data for student
        await supabase.functions.invoke("populate-test-performance", {
          body: { 
            userId: mockId, 
            schoolId: mockProfile.organization?.id,
            numAssessments: 10
          }
        });
      } else if (type === 'teacher') {
        // Generate students and their assessment data for this teacher
        await populateTestAccountWithSessions(mockId, mockProfile.organization?.id || '', 15);
      } else if (type === 'school') {
        // For school admin, populate test data for the entire school
        // This will create teacher and student data
        await supabase.functions.invoke("create-test-accounts", {
          body: { createAccounts: true }
        });
      }

      toast.success(`Logged in as test ${type}`);
    } catch (error) {
      console.error("Error setting test user:", error);
      toast.error("Failed to set test user");
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
