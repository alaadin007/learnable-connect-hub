
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: object) => Promise<void>;
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
        // First set up the auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, currentSession: Session | null) => {
            console.log(`Auth state changed: ${event}`, currentSession);
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

        // Then get the initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        console.log("Initial session retrieved:", initialSession);
        setSession(initialSession);
        setUser(initialSession?.user || null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }

        // Return the unsubscribe function
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Error getting initial session:", error);
        toast.error("Failed to retrieve session. Please try again.");
        return () => {}; // Return empty function as fallback
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = getInitialSession();

    return () => {
      // Call the unsubscribe function when component unmounts
      unsubscribe.then(unsub => unsub());
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log(`Fetching profile for user: ${userId}`);
      
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
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }

      console.log("Profile data retrieved:", profileData);

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
      setIsSuperviser(profileData.user_type === "school" || await checkIsSuperviser(userId));
      setSchoolId(safeProfileData.organization?.id || await getUserSchoolId(userId));

      if (user && isTestAccount(user.email || '')) {
        console.log("AuthContext: Test account detected, ensuring organization data is complete");
        
        // Ensure organization object has all required properties for test accounts
        if (!safeProfileData.organization || !safeProfileData.organization.code) {
          console.log("AuthContext: Organization data missing or incomplete, updating profile");
          
          // Create a complete organization object with all required properties
          const updatedOrg = {
            id: safeProfileData.organization?.id || `test-org-${Date.now()}`,
            name: safeProfileData.organization?.name || "Test Organization",
            code: TEST_SCHOOL_CODE
          };
          
          await updateProfile({ 
            organization: updatedOrg
          });
          
          // Update local state immediately
          safeProfileData.organization = updatedOrg;
          setProfile(safeProfileData);
          setSchoolId(updatedOrg.id);
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
              console.log(`AuthContext: Populating test data for teacher ${userId} with orgId ${orgId}`);
              await populateTestAccountWithSessions(userId, orgId);
              console.log(`AuthContext: Successfully populated test data for teacher ${userId}`);
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

  const checkIsSuperviser = async (userId: string): Promise<boolean> => {
    try {
      // Call the is_supervisor RPC function
      const { data, error } = await supabase.rpc('is_supervisor', { user_id: userId });
      
      if (error) {
        console.error('Error checking supervisor status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error in checkIsSuperviser:', error);
      return false;
    }
  };

  const getUserSchoolId = async (userId: string): Promise<string | null> => {
    try {
      // Try to get from teachers table first
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', userId)
        .single();
      
      if (teacherData?.school_id) {
        return teacherData.school_id;
      }
      
      // If not found, try students table
      const { data: studentData } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', userId)
        .single();
      
      return studentData?.school_id || null;
    } catch (error) {
      console.error('Error in getUserSchoolId:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log(`Signing in user with email: ${email}`);
    
    // If this is a test account email, handle it directly through setTestUser
    if (email.includes(".test@learnable.edu")) {
      let type: "school" | "teacher" | "student" = "student";
      if (email.startsWith("school")) type = "school";
      else if (email.startsWith("teacher")) type = "teacher";
      await setTestUser(type);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting password-based authentication");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      console.log("Sign in successful:", data);
      
      // Get user role and redirect appropriately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", data.user.id)
        .single();
      
      if (profileData?.user_type === "school") {
        console.log("School admin detected, will redirect to admin dashboard");
      }
      
    } catch (error: any) {
      console.error("Sign in error caught:", error);
      toast.error(error.error_description ?? error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata: object = {}) => {
    setIsLoading(true);
    try {
      console.log("Signing up new user with metadata:", metadata);
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) {
        console.error("Sign up error:", error);
        throw error;
      }
      console.log("Sign up successful:", data);
      toast.success("Registration successful! Please check your email.");
    } catch (error: any) {
      console.error("Sign up error caught:", error);
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

      if (!isTestUser) {
        console.log("Signing out user");
        await supabase.auth.signOut();
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);

      navigate("/");
      toast.success(isTestUser ? "Test session ended" : "Logged out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.error_description ?? error.message ?? "Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setIsLoading(true);
    try {
      console.log("AuthContext: Updating profile with:", updates);
      
      // Prepare updates for the database
      const updatesForDb: any = { ...updates };
      
      // Handle organization updates separately if provided
      const orgUpdates = updates.organization ? { ...updates.organization } : null;
      
      // Remove organization from direct updates as it's a relation
      if (updatesForDb.organization) delete updatesForDb.organization;
      
      // Ensure user_type is present and not undefined
      if (!updatesForDb.user_type && profile?.user_type) {
        updatesForDb.user_type = profile.user_type;
      }
      
      // Make sure user_type is always set to a valid value
      if (typeof updatesForDb.user_type === 'undefined') {
        // Provide a default value if missing from both updates and existing profile
        updatesForDb.user_type = "student";
      }
      
      console.log("AuthContext: Prepared DB updates:", updatesForDb);
      
      // Update the profile
      const { error } = await supabase.from("profiles").upsert({
        id: user?.id,
        ...updatesForDb,
      });
      
      if (error) throw error;
      
      // If we have organization updates and this is a test user, update the related organization
      if (orgUpdates && user && isTestAccount(user.email || '')) {
        console.log("AuthContext: Updating organization for test account:", orgUpdates);
        
        // Check if the organization exists
        const { data: existingOrg } = await supabase
          .from("schools")
          .select("id")
          .eq("id", orgUpdates.id)
          .single();
        
        if (existingOrg) {
          // Update existing organization
          const { error: orgError } = await supabase
            .from("schools")
            .update({
              name: orgUpdates.name,
              code: orgUpdates.code
            })
            .eq("id", orgUpdates.id);
            
          if (orgError) {
            console.error("Error updating organization:", orgError);
          }
        } else {
          // Create new organization
          const { error: orgError } = await supabase
            .from("schools")
            .insert({
              id: orgUpdates.id,
              name: orgUpdates.name,
              code: orgUpdates.code
            });
            
          if (orgError) {
            console.error("Error creating organization:", orgError);
          }
        }
      }

      // Update local state with the new profile data
      setProfile((prev) => {
        const newProfile = { ...prev, ...updates };
        console.log("AuthContext: Updated local profile state:", newProfile);
        return newProfile;
      });
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
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
      
      // Generate a stable ID for the test user
      const mockId = `test-${type}-${schoolIndex}`;
      
      // Create mock user object
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

      // Create test organization with complete required properties
      const testOrgId = `test-school-${schoolIndex}`;
      const testOrgName = schoolIndex === 0 ? "Test School" : `Test School ${schoolIndex + 1}`;
      const testOrgCode = `TEST${schoolIndex}`;
      
      // Create mock profile with organization data
      const mockProfile: UserProfile = {
        id: mockId,
        user_type: type,
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        organization: {
          id: testOrgId,
          name: testOrgName,
          code: testOrgCode,
        },
      };

      // Set state variables synchronously for test accounts
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSuperviser(type === "school");
      setSchoolId(mockProfile.organization?.id || null);
      
      // Keep session null for test users - no authentication needed
      setSession(null);

      console.log(`AuthContext: Test user set up successfully. User role: ${type}`);
      console.log(`AuthContext: Test user profile:`, mockProfile);

      // Create mock sessions and data for different user types
      // We'll handle this async, but not block the function completion on it
      if (type === "student") {
        setTimeout(async () => {
          try {
            console.log(`AuthContext: Creating student test session for ${mockId}`);
            await sessionLogger.startSession("Test Login Session", mockId);
          } catch (e) {
            console.error("Error starting test session:", e);
          }
        }, 0);
      } else if (type === "teacher") {
        setTimeout(async () => {
          try {
            console.log(`AuthContext: Creating teacher test sessions for ${mockId} with organization ID ${testOrgId}`);
            await populateTestAccountWithSessions(mockId, testOrgId, 5);
            console.log(`AuthContext: Successfully populated test data for teacher ${mockId}`);
          } catch (e) {
            console.error("Error creating teacher test sessions:", e);
          }
        }, 0);
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
