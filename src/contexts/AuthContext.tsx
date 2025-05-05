
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { supabase, isTestAccount, TEST_SCHOOL_CODE } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";

// Define UserRole type
export type UserRole = "school" | "teacher" | "student";

// User profile type definition
type UserProfile = {
  id: string;
  user_type: string | null;
  full_name: string | null;
  school_code: string | null;
  organization?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

// App context type
type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  userRole: string | null;
  loading: boolean;
  isLoading: boolean; // Add isLoading property
  isSuperviser: boolean;
  schoolId: string | null;
  signIn: (email: string, password?: string) => Promise<any>; // Return any to fix type mismatch
  signUp: (email: string, password: string) => Promise<any>; // Return any to fix type mismatch
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (
    type: "school" | "teacher" | "student",
    schoolIndex?: number
  ) => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userRole: null,
  loading: true,
  isLoading: true, // Add isLoading property with default value
  isSuperviser: false,
  schoolId: null,
  signIn: async () => ({data: null, error: null}), // Default return value updated
  signUp: async () => ({user: null, session: null}), // Default return value updated
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  setTestUser: async () => {},
});

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to fetch and set user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*, organization:schools(id, name, code)")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      // Create a safe version of the profile data with proper type handling
      const safeProfileData: UserProfile = {
        id: profileData.id,
        user_type: profileData.user_type,
        full_name: profileData.full_name,
        school_code: profileData.school_code,
        organization: null, // Default to null
      };
      
      // Safely check for organization data with proper null handling
      if (profileData.organization && 
          typeof profileData.organization === 'object') {
        // Use optional chaining and nullish coalescing to safely access properties
        const orgId = profileData.organization?.id ? String(profileData.organization?.id) : "";
        const orgName = profileData.organization?.name ? String(profileData.organization?.name) : "";
        const orgCode = profileData.organization?.code ? String(profileData.organization?.code) : "";
        
        // Only set if we have all required properties
        if (orgId && orgName && orgCode) {
          safeProfileData.organization = {
            id: orgId,
            name: orgName,
            code: orgCode,
          };
        }
      }

      setProfile(safeProfileData);
      setUserRole(profileData.user_type || null);
      // Fix the type issue by using a ternary operator to ensure boolean value
      setIsSuperviser(
        profileData.user_type === "superviser" || 
        (profileData.user_type === "school" && !!safeProfileData.organization?.id)
      );
      setSchoolId(safeProfileData.organization?.id || null);

      if (user && isTestAccount(user.email || '')) {
        console.log('Test account detected, not storing profile data');
      }

      return profileData;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      return null;
    }
  }, [user]);

  // Refresh profile function
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    // Set loading state
    setLoading(true);

    // Get session from URL if available
    const setSession = async () => {
      try {
        // Check for existing session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Set user state based on session
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error during session check:", error);
      } finally {
        setLoading(false);
      }
    };

    // Call immediately
    setSession();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up functionality
  const signUp = async (email: string, password: string) => {
    try {
      const {
        data: { user, session },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { user, session }; // Return object instead of void
    } catch (error: any) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  // Sign in functionality
  const signIn = async (email: string, password?: string) => {
    try {
      if (!password) {
        // Sign in with magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });

        if (error) {
          throw error;
        }

        return { data: { user: null, session: null }, error: null };
      }

      // Sign in with credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      return { data: { user: null, session: null }, error };
    }
  };

  // Sign out functionality
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Navigate after signout
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Update profile functionality
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      // Refresh profile after update
      await refreshProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  // Set test user functionality for development/testing
  const setTestUser = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    try {
      // Created combined type+school identifier
      const testEmail = `${type}.test@learnable.edu`;
      console.log(`Setting test user with email: ${testEmail}`);

      // This creates a session without password for the test user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: "test1234" // Using placeholder password for test accounts
      });

      if (error) {
        // If login fails for test user, we'll create a mock session instead
        console.log("Test login failed, creating mock session:", error);
        
        // Mock relevant profile data
        const testProfile: UserProfile = {
          id: `test-${type}-${Date.now()}`,
          user_type: type,
          full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          school_code: TEST_SCHOOL_CODE,
          organization: type === "school" 
            ? {
                id: `test-school-${schoolIndex}`,
                name: `Test School ${schoolIndex}`,
                code: TEST_SCHOOL_CODE
              } 
            : null
        };
        
        // Set mock states
        setProfile(testProfile);
        setUserRole(type);
        setIsSuperviser(type === "school");
        setSchoolId(type === "school" ? testProfile.organization?.id || null : `test-school-${schoolIndex}`);
        
        // Create a mock user (with type assertion to fix the type error)
        const mockUser = {
          id: testProfile.id,
          email: testEmail,
          user_metadata: {
            full_name: testProfile.full_name
          },
          // Add required User properties
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString()
        } as User;
        
        setUser(mockUser);
        
        // Track session as test
        localStorage.setItem('usingTestAccount', 'true');
        localStorage.setItem('testAccountType', type);
        
        console.log(`Successfully set up test user of type ${type}`);
        return;
      }

      if (data?.user) {
        console.log("Test login succeeded, processing session");
        setUser(data.user);
        
        // Set user role and session info
        setUserRole(type);
        
        // Mock profile specifically for test users
        const testProfile: UserProfile = {
          id: data.user.id,
          user_type: type,
          full_name: data.user.user_metadata?.full_name || `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          school_code: TEST_SCHOOL_CODE,
          organization: type === "school" 
            ? {
                id: `test-school-${schoolIndex}`,
                name: `Test School ${schoolIndex}`,
                code: TEST_SCHOOL_CODE
              } 
            : null
        };
        
        setProfile(testProfile);
        setIsSuperviser(type === "school");
        setSchoolId(type === "school" ? testProfile.organization?.id || null : `test-school-${schoolIndex}`);
        
        // Track session as test
        localStorage.setItem('usingTestAccount', 'true');
        localStorage.setItem('testAccountType', type);
        
        console.log(`Successfully set up test user of type ${type}`);
        
        // Generate test data for this user (sessions, etc)
        if (type !== 'school') {
          try {
            await supabase.rpc("populatetestaccountwithsessions", {
              userid: data.user.id,
              schoolid: `test-school-${schoolIndex}`,
              num_sessions: 5
            });
            console.log("Created test sessions data");
          } catch (error) {
            console.warn("Failed to create test session data:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error setting test user:", error);
      throw error;
    }
  };

  // Create context value
  const contextValue = useMemo(
    () => ({
      user,
      profile,
      userRole,
      loading,
      isLoading: loading, // Alias loading as isLoading for compatibility
      isSuperviser,
      schoolId,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      setTestUser,
    }),
    [
      user,
      profile,
      userRole,
      loading,
      isSuperviser,
      schoolId,
      refreshProfile,
      fetchProfile,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

