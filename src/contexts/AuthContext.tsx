
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
  AuthError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Improved session handling with faster initialization
  useEffect(() => {
    // Set initial loading state
    setIsLoading(true);
    
    // Keep track of active auth state subscription
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Get the initial session immediately to reduce loading time
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session");
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        // Set up the auth state listener right after getting session
        authSubscription = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, currentSession: Session | null) => {
            console.log(`Auth state changed: ${event}`, currentSession?.user?.id);
            
            // Update session and user state immediately
            setSession(currentSession);
            setUser(currentSession?.user || null);
            
            // Only fetch profile if we have a user
            if (currentSession?.user) {
              await fetchProfile(currentSession.user.id);
            } else {
              // Clear user-related state if no session
              setProfile(null);
              setUserRole(null);
              setIsSuperviser(false);
              setSchoolId(null);
              setIsLoading(false);
            }
          }
        ).data.subscription;
        
        // Process initial session if available
        if (initialSession) {
          console.log("Initial session found:", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
        } else {
          console.log("No initial session found");
          setIsLoading(false);
        }
        
        // Mark initial load as complete
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error getting initial session:", error);
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    };

    getInitialSession();

    // Clean up subscription when component unmounts
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [navigate]);

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
        setIsLoading(false);
        return;
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
      
      // Run these checks in parallel to speed up loading
      const [isSupervisor, userSchoolId] = await Promise.all([
        checkIsSuperviser(userId),
        getUserSchoolId(userId)
      ]);
      
      setIsSuperviser(profileData.user_type === "school" || isSupervisor);
      setSchoolId(safeProfileData.organization?.id || userSchoolId);

      // Handle test account data preparation
      if (user && isTestAccount(user.email || '')) {
        await handleTestAccountData(userId, safeProfileData, profileData.user_type);
      }

      // Turn off loading state
      setIsLoading(false);

      // Handle role-based redirections if not at login/register pages and not handling special routes
      const nonRedirectPaths = ['/login', '/register', '/school-registration'];
      const hasSpecialParams = location.search.includes('registered=') || 
                               location.search.includes('completeRegistration=') ||
                               location.search.includes('emailVerificationFailed=');
                               
      if (initialLoadComplete && !nonRedirectPaths.includes(location.pathname) && !hasSpecialParams) {
        handleRoleBasedRedirection(profileData.user_type);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to retrieve profile. Please try again.");
      setIsLoading(false);
    }
  };

  // Handle test account data preparation in a separate function to avoid nesting
  const handleTestAccountData = async (userId: string, safeProfileData: UserProfile, userType?: string) => {
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

    if (userType === "student") {
      await prepareTestStudentData(userId, safeProfileData);
    } else if (userType === "teacher") {
      await prepareTestTeacherData(userId, safeProfileData.organization?.id || "");
    }
  };

  // Role-based redirection handler - Fixed to properly handle school admin redirection
  const handleRoleBasedRedirection = (role: string | undefined) => {
    if (!role) return;
    
    console.log(`AuthContext: Handling redirect for role: ${role}, current path: ${location.pathname}`);
    
    // Avoid redirect loops by checking current path
    const currentPath = location.pathname;
    let targetPath = '';
    
    switch (role) {
      case "school":
        targetPath = "/admin";
        if (currentPath.startsWith("/admin")) return;
        break;
        
      case "teacher":
        targetPath = "/teacher/analytics";
        if (currentPath.startsWith("/teacher")) return;
        break;
        
      case "student":
        targetPath = "/dashboard";
        if (currentPath === "/dashboard") return;
        break;
        
      default:
        return; // Unknown role, don't redirect
    }
    
    // Only redirect if we have a target and aren't already there
    if (targetPath && currentPath !== targetPath) {
      console.log(`AuthContext: Redirecting from ${currentPath} to ${targetPath}`);
      navigate(targetPath, { replace: true });
    }
  };

  // Prepare test data for student accounts
  const prepareTestStudentData = async (userId: string, profile: UserProfile) => {
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
          school_id: profile.organization?.id,
          topic_or_content_used: topics[i % topics.length],
          session_start: pastDate.toISOString(),
          session_end: new Date(pastDate.getTime() + 45 * 60000).toISOString(),
          num_queries: Math.floor(Math.random() * 15) + 5,
        });
      }
    } else {
      await sessionLogger.startSession("Continued Test Session", userId);
    }
  };

  // Prepare test data for teacher accounts
  const prepareTestTeacherData = async (userId: string, orgId: string) => {
    if (orgId) {
      try {
        console.log(`AuthContext: Populating test data for teacher ${userId} with orgId ${orgId}`);
        await populateTestAccountWithSessions(userId, orgId);
        console.log(`AuthContext: Successfully populated test data for teacher ${userId}`);
      } catch (error) {
        console.error("Error populating test data for teacher:", error);
      }
    }
  };

  // Check supervisor status - simplified for performance
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

  // Get user school ID - simplified for performance
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

  // Optimized sign-in function for faster auth
  const signIn = async (email: string, password: string) => {
    console.log(`Signing in user with email: ${email}`);
    
    // If this is a test account email, handle it directly through setTestUser
    if (email.includes(".test@learnable.edu")) {
      let type: "school" | "teacher" | "student" = "student";
      if (email.startsWith("school")) type = "school";
      else if (email.startsWith("teacher")) type = "teacher";
      console.log(`Test account detected: ${type}. Instantly logging in...`);
      await setTestUser(type);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting password-based authentication for real user");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      console.log("Sign in successful:", data.user?.id);
      
      // Show success toast
      toast.success("Login successful");
      
      // NOTE: Don't navigate here - onAuthStateChange will handle that
      // after setting up the user profile correctly
    } catch (error: any) {
      console.error("Sign in error caught:", error);
      
      // Check specifically for email verification errors
      if (error.message?.includes("Email not confirmed") || error.message?.includes("not verified")) {
        throw new Error("Email not verified. Please check your inbox for a verification link or request a new one.");
      }
      
      toast.error(error.message || "Login failed");
      throw error;
    } finally {
      // Loading state will be reset by onAuthStateChange
    }
  };

  // Updated signOut function to handle test accounts differently
  const signOut = async () => {
    try {
      const isTestUser = user?.email?.includes(".test@learnable.edu") || user?.id?.startsWith("test-");
      
      // For student role, try to end the session logging
      if (userRole === "student") {
        try {
          await sessionLogger.endSession("User logged out");
        } catch (e) {
          console.error("Failed to end session", e);
        }
      }
      
      console.log(`Signing out ${isTestUser ? 'test' : 'real'} user`);
      
      // For real users, we sign out from Supabase
      if (!isTestUser) {
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Sign out error:", error);
          toast.error(error.message || "Failed to log out");
          return;
        }
      } else {
        // For test users, just clear the state immediately without Supabase signout
        console.log("Instantly signing out test user");
      }

      // Clear all auth state
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);

      // Redirect to homepage
      navigate("/");
      toast.success(isTestUser ? "Test session ended" : "Logged out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.message || "Failed to log out");
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
      toast.error(error.message || "Registration failed");
      throw error;
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
      
      // Use the edge function to ensure the test account exists and get its info
      const response = await supabase.functions.invoke("create-test-accounts", {
        body: { 
          type,
          schoolIndex
        },
      });
      
      if (response.error) {
        console.error("Error from create-test-accounts function:", response.error);
        throw new Error(`Failed to set up test account: ${response.error.message}`);
      }
      
      console.log("Test account data:", response.data);
      const { 
        userId, 
        schoolId, 
        fullName, 
        email, 
        schoolCode, 
        schoolName 
      } = response.data;
      
      // Create mock user object with consistent properties
      const mockUser: User = {
        id: userId,
        email: email,
        user_metadata: {
          full_name: fullName,
          user_type: type,
          school_name: schoolName,
          school_code: schoolCode
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      // Create mock profile with organization data
      const mockProfile: UserProfile = {
        id: userId,
        user_type: type,
        full_name: fullName,
        organization: {
          id: schoolId,
          name: schoolName,
          code: schoolCode,
        },
      };

      // Set state variables synchronously for test accounts - INSTANT LOGIN
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSuperviser(type === "school");
      setSchoolId(schoolId);
      
      // Keep session null for test users - no authentication needed
      setSession(null);
      
      // Finish loading
      setIsLoading(false);

      console.log(`AuthContext: Test user set up successfully. User role: ${type}`);
      
      // Show success toast
      toast.success(`Logged in as ${type === "school" ? "School Admin" : 
                                  type === "teacher" ? "Teacher" : "Student"}`);

      // Define redirect paths based on account type
      let redirectPath = "/dashboard";
      
      if (type === "school") {
        redirectPath = "/admin";
      } else if (type === "teacher") {
        redirectPath = "/teacher/analytics";
      }

      console.log(`TestAccounts: Navigating to ${redirectPath} for ${type}`);
      
      // Navigate with proper state parameters
      navigate(redirectPath, {
        replace: true,
        state: { 
          fromTestAccounts: true,
          accountType: type,
          preserveContext: true,
          timestamp: Date.now()
        }
      });

      // Create mock sessions and data for different user types (in background)
      if (type === "student") {
        sessionLogger.startSession("Test Login Session", userId)
          .catch(e => console.error("Error starting test session:", e));
      }
    } catch (error: any) {
      console.error("Error setting test user:", error);
      setIsLoading(false);
      toast.error(error.message || "Failed to set up test account");
      throw new Error("Failed to set up test account");
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
