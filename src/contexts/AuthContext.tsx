import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase, isTestAccount, TEST_SCHOOL_CODE } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define types for user profiles and roles
export type UserRole = "school" | "teacher" | "student";

// Type for user profile data
export interface UserProfile {
  id: string;
  user_type: UserRole;
  full_name: string | null;
  school_code: string | null;
  school_name: string | null;
  created_at: string;
  updated_at: string;
}

// Type for the auth context value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  userRole: UserRole | null;
  isSuperviser: boolean;
  schoolId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

// Helper function to get test account metadata
const getTestAccountMetadata = (email: string): Record<string, any> | null => {
  if (email === "admin@testschool.edu") {
    return {
      user_type: 'school',
      full_name: 'School Admin',
      school_name: 'Test School'
    };
  } else if (email === "teacher@testschool.edu") {
    return {
      user_type: 'teacher',
      full_name: 'Test Teacher',
      school_code: TEST_SCHOOL_CODE,
      school_name: 'Test School'
    };
  } else if (email === "student@testschool.edu") {
    return {
      user_type: 'student',
      full_name: 'Test Student',
      school_code: TEST_SCHOOL_CODE,
      school_name: 'Test School'
    };
  }
  return null;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Function to handle sign-in
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email);
      
      // Check if this is a test account
      const isTest = isTestAccount(email);
      
      // First try normal sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If we get an error and this is a test account, try to create it
      if (error && isTest) {
        console.log("Test account signin failed, attempting to create it:", error.message);
        
        // Get test account metadata
        const metadata = getTestAccountMetadata(email);
        
        if (!metadata) {
          throw new Error("Unknown test account type");
        }

        // For test accounts, we'll create them directly without email validation
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) {
          toast.error(signUpError.message);
          throw signUpError;
        }
        
        // Try signing in directly after creating the account
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast.error(signInError.message);
          throw signInError;
        }
        
        toast.success("Test account created and signed in!");
      } else if (error) {
        toast.error(error.message);
        throw error;
      }
      
      // If we got here, sign-in was successful
      toast.success("Signed in successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      throw error;
    }
  };

  // Function to handle sign-up
  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    try {
      // Special handling for test accounts to bypass email validation
      if (isTestAccount(email)) {
        return signIn(email, password);
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      toast.success("Account created successfully! Please check your email for verification.");
      
      // Don't automatically navigate after sign up - wait for email confirmation
      // navigate("/login");
    } catch (error: any) {
      console.error("Registration error:", error.message);
      throw error;
    }
  };

  // Function to handle sign-out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth state
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      
      navigate("/login");
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error.message);
      toast.error("Failed to sign out");
    }
  };

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      if (!user) return;

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Type assertion since we know the structure
      setProfile(profileData as UserProfile);
      
      // Set user role
      const userTypeRole = profileData?.user_type as UserRole;
      setUserRole(userTypeRole);

      // Check if user is a supervisor
      const { data: isSupervisorData } = await supabase.rpc("is_supervisor", {
        user_id: user.id
      });
      setIsSuperviser(!!isSupervisorData);

      // Get school ID if available
      const { data: schoolIdData } = await supabase.rpc("get_user_school_id");
      if (schoolIdData) {
        setSchoolId(schoolIdData as string);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Set up auth state listener and check for existing session
  useEffect(() => {
    const setupAuth = async () => {
      setLoading(true);
      
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        if (initialSession?.user) {
          await refreshUserData();
        }
        
        // Set up auth state change subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session);
            setUser(session?.user || null);
            
            if (session?.user) {
              await refreshUserData();
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth setup error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    setupAuth();
  }, []);

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        userRole,
        isSuperviser,
        schoolId,
        signIn,
        signUp,
        signOut,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook for using the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
