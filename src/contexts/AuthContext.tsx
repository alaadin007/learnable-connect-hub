import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase, isTestAccount } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define types for our context
interface AuthContextProps {
  user: any | null;
  profile: any | null;
  schoolId: string | null;
  userRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperviser: boolean;
  signIn: (email: string, password: string) => Promise<{success: boolean, error?: string}>;
  signUp: (email: string, password: string, userData: any) => Promise<{success: boolean, error?: string}>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser?: (email: string) => Promise<void>;
  session: any;
}

interface AuthProviderProps {
  children: ReactNode;
}

// User role type for protected routes
export type UserRole = 'student' | 'teacher' | 'school' | 'school_admin' | 'any';

// Create the context
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [session, setSession] = useState<any | null>(null);

  // Fetch profile data without using RPC to avoid recursion
  const fetchProfileData = useCallback(async (userId: string) => {
    try {
      console.log("Fetching profile data for user:", userId);
      
      // First get the basic profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }
      
      if (!profileData) {
        console.warn("No profile found for user:", userId);
        return null;
      }
      
      console.log("Profile data fetched:", profileData);
      
      // Get school info if school_id exists
      let schoolData = null;
      if (profileData.school_id) {
        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .select("*")
          .eq("id", profileData.school_id)
          .single();
          
        if (!schoolError && school) {
          schoolData = school;
          console.log("School data fetched:", schoolData);
        } else if (schoolError) {
          console.error("Error fetching school:", schoolError);
        }
      }
      
      // Check if user is a supervisor
      let isSupervisor = false;
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("is_supervisor")
        .eq("id", userId)
        .single();
        
      if (!teacherError && teacherData) {
        isSupervisor = teacherData.is_supervisor || false;
      }
      
      // Merge the data
      const enrichedProfile = {
        ...profileData,
        organization: schoolData,
        is_supervisor: isSupervisor
      };
      
      return enrichedProfile;
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
      return null;
    }
  }, []);

  // Refresh the user's profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log("Refreshing profile for user:", user.id);
      const profileData = await fetchProfileData(user.id);
      
      if (profileData) {
        setProfile(profileData);
        setSchoolId(profileData.school_id || profileData.organization?.id || null);
        setUserRole(profileData.user_type || null);
        setIsSuperviser(profileData.is_supervisor || false);
        console.log("Profile refreshed successfully:", profileData);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  }, [user, fetchProfileData]);

  // Initialize auth state
  useEffect(() => {
    console.log("Initializing auth state...");
    
    const initializeAuthState = async () => {
      setIsLoading(true);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        console.log("Session data:", sessionData);
        
        if (sessionData?.session) {
          const { data: userData } = await supabase.auth.getUser();
          setSession(sessionData.session);
          
          if (userData?.user) {
            console.log("User authenticated:", userData.user);
            setUser(userData.user);
            setIsAuthenticated(true);
            
            // Fetch profile data
            const profileData = await fetchProfileData(userData.user.id);
            if (profileData) {
              setProfile(profileData);
              setSchoolId(profileData.school_id || profileData.organization?.id || null);
              setUserRole(profileData.user_type || null);
              setIsSuperviser(profileData.is_supervisor || false);
              console.log("Profile data set:", profileData);
              console.log("User role set:", profileData.user_type);
              console.log("School ID set:", profileData.school_id || profileData.organization?.id || null);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Fetch profile data
          const profileData = await fetchProfileData(session.user.id);
          if (profileData) {
            setProfile(profileData);
            setSchoolId(profileData.school_id || profileData.organization?.id || null);
            setUserRole(profileData.user_type || null);
            setIsSuperviser(profileData.is_supervisor || false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSchoolId(null);
          setUserRole(null);
          setIsAuthenticated(false);
          setIsSuperviser(false);
        }
      }
    );
    
    initializeAuthState();
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileData]);

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{success: boolean, error?: string}> => {
    console.log("Attempting to sign in with email:", email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Sign in error:", error);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log("Sign in successful:", data);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected sign in error:", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred during sign in"
      };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, userData: any): Promise<{success: boolean, error?: string}> => {
    console.log("Attempting to sign up with email:", email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        console.error("Sign up error:", error);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log("Sign up successful:", data);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected sign up error:", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred during sign up"
      };
    }
  };

  // Set test user function (for development only)
  const setTestUser = async (email: string) => {
    // Implementation for test accounts if needed
  };

  // Sign out function
  const signOut = async () => {
    console.log("Signing out...");
    
    try {
      await supabase.auth.signOut();
      
      // Reset all state
      setUser(null);
      setProfile(null);
      setSchoolId(null);
      setUserRole(null);
      setIsAuthenticated(false);
      setIsSuperviser(false);
      setSession(null);
      
      console.log("Sign out successful");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Context value
  const contextValue: AuthContextProps = {
    user,
    profile,
    schoolId,
    userRole,
    isLoading,
    isAuthenticated,
    isSuperviser,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    session,
    setTestUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
