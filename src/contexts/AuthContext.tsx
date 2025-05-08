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
import { Json } from "@/integrations/supabase/types";

// Helper function to safely check if a value is a non-null object
function isNonNullObject(value: any): value is object {
  return value !== null && typeof value === "object";
}

// Helper function to safely type-check organization data
function isValidOrganization(org: unknown): org is { id: string; name: string; code?: string } {
  return isNonNullObject(org) && 
         typeof (org as any).id === 'string' && 
         typeof (org as any).name === 'string';
}

export type UserRole = "school" | "school_admin" | "teacher" | "student" | string;

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
      console.log("AuthContext: Fetching profile for user ID:", userId);
      
      // Try to determine user role from auth metadata first
      let determinedUserType: UserRole | null = null;
      let determinedSchoolId: string | null = null;

      // If user has raw_user_metadata, try to extract user_type
      if (user && user.user_metadata) {
        determinedUserType = user.user_metadata.user_type as UserRole;
        console.log("AuthContext: Found user type in metadata:", determinedUserType);
      }
      
      try {
        // Try to get profile data directly
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // We'll continue with metadata-based approach
        } else if (profileData) {
          console.log("AuthContext: Raw profile data:", profileData);

          // Initialize the profile with available data
          let safeProfileData: UserProfile = {
            id: profileData.id,
            user_type: profileData.user_type,
            full_name: profileData.full_name,
            organization: null,
            school_code: profileData.school_code
          };
          
          // Process organization data if it exists in the profile
          if (profileData.organization && isNonNullObject(profileData.organization)) {
            // Type check and safely convert organization data
            if (isValidOrganization(profileData.organization)) {
              safeProfileData.organization = {
                id: profileData.organization.id,
                name: profileData.organization.name,
                code: profileData.organization.code
              };
              determinedSchoolId = profileData.organization.id;
            } else {
              console.warn("AuthContext: Invalid organization structure in profile data", profileData.organization);
            }
          } 
          // Or fetch school data separately if we have a school_id
          else if (profileData.school_id) {
            determinedSchoolId = profileData.school_id;
            try {
              const { data: schoolData, error: schoolError } = await supabase
                .from("schools")
                .select("id, name, code")
                .eq("id", profileData.school_id)
                .single();

              if (!schoolError && schoolData) {
                safeProfileData.organization = {
                  id: schoolData.id,
                  name: schoolData.name,
                  code: schoolData.code
                };
              } else {
                console.log("AuthContext: No school data found or error:", schoolError);
              }
            } catch (schoolFetchError) {
              console.error("Error fetching school data:", schoolFetchError);
            }
          }

          setProfile(safeProfileData);
          
          // Set user type from profile
          determinedUserType = profileData.user_type as UserRole;
        }
      } catch (profileFetchError) {
        console.error("Error during profile fetch attempt:", profileFetchError);
      }
      
      // If profile fetch failed or couldn't determine user type, let's try teachers/students tables
      if (!determinedUserType || !determinedSchoolId) {
        try {
          // Try teachers table
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("school_id, is_supervisor")
            .eq("id", userId)
            .single();
            
          if (teacherData) {
            console.log("AuthContext: Found user in teachers table:", teacherData);
            determinedUserType = "teacher";
            determinedSchoolId = teacherData.school_id;
            setIsSuperviser(teacherData.is_supervisor || false);
          } else {
            // Try students table
            const { data: studentData } = await supabase
              .from("students")
              .select("school_id, status")
              .eq("id", userId)
              .single();
              
            if (studentData) {
              console.log("AuthContext: Found user in students table:", studentData);
              determinedUserType = "student";
              determinedSchoolId = studentData.school_id;
            }
          }
        } catch (tablesError) {
          console.error("Error checking teachers/students tables:", tablesError);
        }
      }
      
      // Final fallback: if we still don't have a role, check user metadata
      if (!determinedUserType && user) {
        // Check user metadata for clues about user type
        if (user.user_metadata) {
          if (user.user_metadata.user_type === "school_admin" || user.user_metadata.user_type === "school") {
            determinedUserType = "school";
          } else if (user.user_metadata.user_type === "teacher") {
            determinedUserType = "teacher";
          } else if (user.user_metadata.user_type === "student") {
            determinedUserType = "student";
          }
        }
        
        // Last resort: check email for patterns like "school@" or "teacher@"
        if (!determinedUserType && user.email) {
          if (user.email.startsWith('school') || user.email.startsWith('admin')) {
            determinedUserType = "school";
          } else if (user.email.startsWith('teacher')) {
            determinedUserType = "teacher";
          } else {
            determinedUserType = "student"; // Default fallback
          }
        }
      }
      
      // Normalize school admin roles for consistency
      if (determinedUserType === "school_admin") {
        determinedUserType = "school";
      }
      
      // Set the determined role and school ID
      console.log("AuthContext: Final determined role:", determinedUserType);
      console.log("AuthContext: Final determined school ID:", determinedSchoolId);
      
      setUserRole(determinedUserType);
      setSchoolId(determinedSchoolId);
      
      // Special handling for school admins
      if (determinedUserType === "school") {
        setIsSuperviser(true);
      }
      
      // If we have incomplete profile info, try to update it
      if (profile === null && user) {
        const minimalProfile: UserProfile = {
          id: userId,
          user_type: determinedUserType || "student",
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
        };
        setProfile(minimalProfile);
        
        // Try to update the profile in the database with what we know
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            user_type: determinedUserType,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email
          });
        } catch (updateError) {
          console.error("Error updating profile:", updateError);
        }
      }

      // Test account special handling for session logs
      if (user && isTestAccount(user.email || '')) {
        console.log("AuthContext: Test account detected");
        
        // Populate test data for appropriate user types
        if (determinedUserType === "student") {
          try {
            await sessionLogger.startSession("Test Session", userId);
          } catch (e) {
            console.error("Failed to start test session", e);
          }
        } else if (determinedUserType === "teacher" && determinedSchoolId) {
          try {
            await populateTestAccountWithSessions(userId, determinedSchoolId);
          } catch (e) {
            console.error("Error populating test data for teacher:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to retrieve profile. Using fallback user information.");
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password?: string) => {
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
      setIsSuperviser(false);
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
