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
    code?: string;
  } | null;
  school_name?: string;
  school_code?: string;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  loading: boolean;
  isSuperviser: boolean;
  schoolId: string | null;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (
    type: "school" | "teacher" | "student",
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

    return () => subscription.unsubscribe();
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

      if (profileError) throw profileError;

      let safeProfileData: UserProfile = {
        ...profileData,
        organization: null,
      };

      const org = profileData.organization;

      if (isNonNullObject(org) && !("error" in org)) {
        safeProfileData.organization = org;
      }

      setProfile(safeProfileData);
      setUserRole(profileData.user_type || null);
      setIsSuperviser(profileData.user_type === "superviser");
      setSchoolId(safeProfileData.organization?.id || null);

      if (user && isTestAccount(user.email || '')) {
        if (safeProfileData.organization && !safeProfileData.organization.code) {
          await updateProfile({ organization: { code: TEST_SCHOOL_CODE } });
        }

        if (profileData.user_type === "student") {
          // Check for existing sessions or create test sessions
          const { data: existingSessions } = await supabase
            .from("session_logs")
            .select("id")
            .eq("user_id", userId)
            .limit(1);

          if (!existingSessions || existingSessions.length === 0) {
            await sessionLogger.startSession("Test Session", userId);
            const topics = ["Math", "Science", "History", "Literature", "Programming"];
            const now = new Date();

            for (let i = 1; i <= 5; i++) {
              const pastDate = new Date(now);
              pastDate.setDate(now.getDate() - i);
              await supabase.from("session_logs").insert({
                user_id: userId,
                school_id: safeProfileData.organization?.id,
                topic_or_content_used: topics[i % topics.length],
                session_start: pastDate.toISOString(),
                session_end: new Date(pastDate.getTime() + 45 * 60000).toISOString(),
                num_queries: Math.floor(Math.random() * 15) + 5,
              });
            }
          } else {
            await sessionLogger.startSession("Continued Test Session", userId);
          }
        } else if (profileData.user_type === "teacher") {
          const orgId = safeProfileData.organization?.id || "";
          if (orgId) {
            try {
              await populateTestAccountWithSessions(userId, orgId);
              console.log(`Populated test data for teacher ${userId}`);
            } catch (error) {
              console.error("Error populating test data for teacher:", error);
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
    if (email.includes(".test@learnable.edu")) {
      let type: "school" | "teacher" | "student" = "student";
      if (email.startsWith("school")) type = "school";
      else if (email.startsWith("teacher")) type = "teacher";
      await setTestUser(type);
      return;
    }

    setIsLoading(true);
    try {
      if (password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        toast.success("Check your email to verify your login");
      }
    } catch (error: any) {
      toast.error(error.error_description ?? error.message);
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
      toast.error(error.error_description ?? error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (userRole === "student") {
        try {
          await sessionLogger.endSession("User logged out");
        } catch (e) {
          console.error("Failed to end session", e);
        }
      }

      const isTestUser =
        user?.email?.includes(".test@learnable.edu") || user?.id?.startsWith("test-");

      if (!isTestUser) await supabase.auth.signOut();

      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);

      navigate("/");
      toast.success(isTestUser ? "Test session ended" : "Logged out successfully");
    } catch (error: any) {
      toast.error(error.error_description ?? error.message ?? "Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user?.id,
        ...updates,
      });
      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...updates }));
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.error_description ?? error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setTestUser = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ): Promise<void> => {
    setIsLoading(true);
    try {
      console.log(`AuthContext: Setting up test user of type: ${type}`);
      
      const mockId = `test-${type}-${schoolIndex}`;
      const mockUser: User = {
        id: mockId,
        email: `${type}.test@learnable.edu`,
        user_metadata: {
          full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          user_type: type,
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      const mockProfile: UserProfile = {
        id: mockId,
        user_type: type,
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        organization: {
          id: `test-school-${schoolIndex}`,
          name: schoolIndex === 0 ? "Test School" : `Test School ${schoolIndex + 1}`,
          code: `TEST${schoolIndex}`,
        },
      };

      const mockSession: Session = {
        user: mockUser,
        access_token: `test-token-${type}-${Date.now()}`,
        refresh_token: `test-refresh-${type}-${Date.now()}`,
        expires_at: Date.now() + 3600000,
      };

      // Set all state variables synchronously to ensure consistent state
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSuperviser(false);
      setSchoolId(mockProfile.organization?.id || null);
      setSession(mockSession);

      console.log(`AuthContext: Test user set up successfully. User role: ${type}`);

      // Create mock sessions and data for different user types
      if (type === "student") {
        try {
          console.log(`AuthContext: Creating student test session for ${mockId}`);
          await sessionLogger.startSession("Test Login Session", mockId);
        } catch (e) {
          console.error("Error starting test session:", e);
        }
      } else if (type === "teacher") {
        try {
          console.log(`AuthContext: Creating teacher test sessions for ${mockId}`);
          const orgId = mockProfile.organization?.id || "";
          if (orgId) {
            await populateTestAccountWithSessions(mockId, orgId);
            console.log(`AuthContext: Populated test data for teacher ${mockId}`);
          }
        } catch (e) {
          console.error("Error creating test sessions:", e);
        }
      }
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
