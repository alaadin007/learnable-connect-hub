
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { supabase, isTestAccount, TEST_SCHOOL_CODE, SUPABASE_PUBLIC_URL, SUPABASE_PUBLIC_KEY } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";

// Define UserRole type
export type UserRole = "school" | "teacher" | "student";

// Organization type for better type safety
type Organization = {
  id: string;
  name: string;
  code: string;
};

// User profile type definition
type UserProfile = {
  id: string;
  user_type: string | null;
  full_name: string | null;
  school_code: string | null;
  organization?: Organization | null;
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
  isLoading: true, 
  isSuperviser: false,
  schoolId: null,
  signIn: async () => ({data: null, error: null}),
  signUp: async () => ({user: null, session: null}),
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
      console.log("Fetching profile for user:", userId);
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
      
      // Safely check for organization data with proper type handling
      if (profileData.organization && 
          typeof profileData.organization === 'object') {
        
        // Explicitly cast organization to an appropriate type to work with its properties
        const orgData = profileData.organization as Record<string, unknown>;
        
        // Now we can safely access properties
        const orgId = orgData.id ? String(orgData.id) : "";
        const orgName = orgData.name ? String(orgData.name) : "";
        const orgCode = orgData.code ? String(orgData.code) : "";
        
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
        (profileData.user_type === "school" && safeProfileData.organization?.id ? true : false)
      );
      setSchoolId(safeProfileData.organization?.id || null);

      if (user && isTestAccount(user.email || '')) {
        console.log('Test account detected, not storing profile data');
      }

      return profileData;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      // Don't let profile fetch errors block the authentication process
      // Return a minimal profile based on user metadata as fallback
      if (user && user.user_metadata) {
        const fallbackProfile: UserProfile = {
          id: user.id,
          user_type: String(user.user_metadata.user_type || null),
          full_name: String(user.user_metadata.full_name || null),
          school_code: String(user.user_metadata.school_code || null),
        };
        
        // If we have school info in user metadata, use it
        if (user.user_metadata.school_code) {
          setUserRole(String(user.user_metadata.user_type || ""));
          setIsSuperviser(String(user.user_metadata.user_type || "") === "school");
          // Set profile with fallback data
          setProfile(fallbackProfile);
          return fallbackProfile;
        }
      }
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
    console.log("Initializing auth state...");

    // Check if we already have a test account in localStorage
    const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
    const testAccountType = localStorage.getItem('testAccountType') as UserRole | null;
    
    if (usingTestAccount && testAccountType) {
      console.log(`Restoring test account session for ${testAccountType}`);
      // Restore test account without authentication - synchronously to avoid delay
      try {
        // Create a consistent test school ID
        const testSchoolId = `test-school-0`;
        
        // Mock profile specifically for test users
        const testProfile: UserProfile = {
          id: `test-${testAccountType}-${Date.now()}`,
          user_type: testAccountType,
          full_name: `Test ${testAccountType.charAt(0).toUpperCase() + testAccountType.slice(1)}`,
          school_code: TEST_SCHOOL_CODE,
          organization: testAccountType === "school" 
            ? {
                id: testSchoolId,
                name: `Test School 0`,
                code: TEST_SCHOOL_CODE
              } 
            : null
        };
        
        // Set mock states
        setProfile(testProfile);
        setUserRole(testAccountType);
        setIsSuperviser(testAccountType === "school");
        
        // Important: All test user types need a school ID
        setSchoolId(testSchoolId);
        
        // Create a mock user (with type assertion to fix the type error)
        const mockUser = {
          id: testProfile.id,
          email: `${testAccountType}.test@learnable.edu`,
          user_metadata: {
            full_name: testProfile.full_name
          },
          // Add required User properties
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString()
        } as User;
        
        setUser(mockUser);
        console.log(`Successfully restored test account session for ${testAccountType}`);
      } catch (error) {
        console.error("Failed to restore test account session:", error);
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Get session from URL if available
    const setSession = async () => {
      try {
        console.log("Checking for existing session...");
        // Check for existing session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Set user state based on session
        if (session?.user) {
          console.log("Existing session found for user:", session.user.id);
          setUser(session.user);
          try {
            await fetchProfile(session.user.id);
          } catch (profileError) {
            console.error("Profile fetch error during initialization:", profileError);
            // Use user metadata as fallback if profile fetch fails
            if (session.user.user_metadata) {
              const userType = session.user.user_metadata.user_type;
              if (userType) {
                setUserRole(String(userType));
                setIsSuperviser(String(userType) === "school");
              }
            }
          }
        } else {
          console.log("No existing session found");
        }
      } catch (error) {
        console.error("Error during session check:", error);
      } finally {
        setLoading(false);
      }
    };

    // First set up auth change listener before checking current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        console.log("User in session:", session.user.email);
        setUser(session.user);
        try {
          await fetchProfile(session.user.id);
        } catch (profileError) {
          console.error("Profile fetch error during auth change:", profileError);
          // Use user metadata as fallback if profile fetch fails
          if (session.user.user_metadata) {
            const userType = session.user.user_metadata.user_type;
            if (userType) {
              setUserRole(String(userType));
              setIsSuperviser(String(userType) === "school");
            }
          }
        }
      } else {
        // Only clear user/profile if not using test account
        if (!usingTestAccount) {
          console.log("No user in session, clearing user data");
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
      }

      setLoading(false);
    });

    // Then check current session
    setSession();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up functionality
  const signUp = async (email: string, password: string) => {
    try {
      console.log("Signing up user:", email);
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
    console.log("Attempting sign in for:", email);
    
    // Special handling for test accounts
    if (email.includes(".test@learnable.edu")) {
      let type: "school" | "teacher" | "student" = "student";
      if (email.startsWith("school")) type = "school";
      else if (email.startsWith("teacher")) type = "teacher";
      
      console.log(`Auth signIn: Direct login for test account type ${type}`);
      
      // Clear any existing auth state
      await supabase.auth.signOut();
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      
      // Set up test user directly
      await setTestUser(type);
      
      // Mark in localStorage that we're using a test account
      localStorage.setItem('usingTestAccount', 'true');
      localStorage.setItem('testAccountType', type);
      
      return { data: { user: null, session: null }, error: null };
    }
    
    try {
      // Special handling for specific account
      if (email === "salman.k.786000@gmail.com" && password) {
        console.log("Using direct auth for specific account");
        // Direct Supabase auth login with special error handling
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign in error for specific account:", error);
          throw error;
        }

        // Ensure we specifically store user role for this account
        if (data?.user && (!data.user.user_metadata?.user_type || data.user.user_metadata?.user_type !== 'school')) {
          // Update user metadata if needed
          await supabase.auth.updateUser({
            data: {
              user_type: 'school',
              full_name: 'Salman',
              ...data.user.user_metadata
            }
          });
        }

        return { data, error: null };
      }
      
      if (!password) {
        // Sign in with magic link
        console.log("Sending magic link to:", email);
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });

        if (error) {
          throw error;
        }

        return { data: { user: null, session: null }, error: null };
      }

      // Standard sign in with credentials
      console.log("Signing in with email/password");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }

      console.log("Sign in successful:", data.user?.id);

      // If successful login but metadata is missing user_type, try to get it from profile
      if (data?.user && (!data.user.user_metadata?.user_type || !data.user.user_metadata?.school_code)) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("user_type, school_code")
            .eq("id", data.user.id)
            .single();
          
          if (!profileError && profileData) {
            console.log("Retrieved profile data for user:", profileData);
            // Update user metadata with profile data
            const updatedMetadata = {
              ...data.user.user_metadata,
              user_type: profileData.user_type,
              school_code: profileData.school_code
            };
            
            // Update the user metadata in local context
            const updatedUser = {
              ...data.user,
              user_metadata: updatedMetadata
            };
            
            // Return the updated user data
            return { 
              data: { 
                user: updatedUser, 
                session: data.session 
              }, 
              error: null 
            };
          }
        } catch (profileLookupError) {
          console.warn("Could not fetch profile data during sign in:", profileLookupError);
          // Continue with regular sign in data
        }
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
      console.log("Signing out user");
      // Check if we're using a test account
      const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
      
      if (usingTestAccount) {
        // For test accounts, just clear the test account flags
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setIsSuperviser(false);
        setSchoolId(null);
      }
      
      // Always sign out from Supabase
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
      console.log(`Setting up test user of type ${type}`);
      // Create a consistent test school ID
      const testSchoolId = `test-school-${schoolIndex}`;
      
      // Mock profile specifically for test users
      const testProfile: UserProfile = {
        id: `test-${type}-${Date.now()}`,
        user_type: type,
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        school_code: TEST_SCHOOL_CODE,
        organization: type === "school" 
          ? {
              id: testSchoolId,
              name: `Test School ${schoolIndex}`,
              code: TEST_SCHOOL_CODE
            } 
          : null
      };
      
      // Set mock states immediately
      setProfile(testProfile);
      setUserRole(type);
      setIsSuperviser(type === "school");
      
      // Important: All test user types need a school ID
      setSchoolId(testSchoolId);
      
      // Create a mock user (with type assertion to fix the type error)
      const mockUser = {
        id: testProfile.id,
        email: `${type}.test@learnable.edu`,
        user_metadata: {
          full_name: testProfile.full_name
        },
        // Add required User properties
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString()
      } as User;
      
      setUser(mockUser);
      
      console.log(`Successfully set up test user of type ${type}`);
      
      // Generate test data for this user (sessions, etc) - only for non-school roles
      if (type !== 'school') {
        try {
          // Using a proper promise handling approach
          console.log("Generating test data for user");
          
          // We'll wrap this in a proper promise with try/catch
          const generateData = () => {
            return new Promise<void>((resolve) => {
              try {
                // Using a timeout to avoid blocking the UI
                setTimeout(() => {
                  // Use the public URL and key constants
                  fetch(`${SUPABASE_PUBLIC_URL}/rest/v1/rpc/populatetestaccountwithsessions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': SUPABASE_PUBLIC_KEY,
                      'Authorization': `Bearer ${SUPABASE_PUBLIC_KEY}`
                    },
                    body: JSON.stringify({
                      userid: mockUser.id,
                      schoolid: testSchoolId,
                      num_sessions: 5
                    })
                  }).then(() => {
                    console.log("Created test sessions data");
                    resolve();
                  }).catch(error => {
                    console.warn("Failed to create test session data:", error);
                    resolve(); // Still resolve to not block the flow
                  });
                }, 100);
              } catch (error) {
                console.warn("Error setting up test data:", error);
                resolve(); // Still resolve to not block the flow
              }
            });
          };
          
          // Execute but don't await - fire and forget
          generateData();
          
        } catch (error) {
          console.warn("Error setting up test data:", error);
          // Don't throw here, we want to continue even if this fails
        }
      }
      
      return mockUser;
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
