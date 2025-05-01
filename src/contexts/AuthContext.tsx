
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, isTestAccount } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_type: 'school' | 'teacher' | 'student';
  full_name: string | null;
  school_code: string | null;
  school_name: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'school' | 'teacher' | 'student';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isSuperviser: boolean;
  userRole: UserRole | null;
  schoolId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

// Define test account metadata based on email
const getTestAccountMetadata = (email: string) => {
  if (email === 'admin@testschool.edu') {
    return {
      user_type: 'school',
      full_name: 'School Admin',
      school_name: 'Test School'
    };
  } else if (email === 'teacher@testschool.edu') {
    return {
      user_type: 'teacher',
      full_name: 'Test Teacher',
      school_code: 'TESTCODE',  // This will be overridden if admin account exists
      school_name: 'Test School'
    };
  } else if (email === 'student@testschool.edu') {
    return {
      user_type: 'student',
      full_name: 'Test Student',
      school_code: 'TESTCODE',  // This will be overridden if admin account exists
      school_name: 'Test School'
    };
  }
  return null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      if (profileData) {
        // Type assertion and null check
        const typedProfile = profileData as UserProfile;
        setProfile(typedProfile);
        
        // Safety check before setting user role
        if (typedProfile.user_type) {
          setUserRole(typedProfile.user_type as UserRole);
        }
        
        // Check if user is a supervisor
        if (typedProfile.user_type === 'school' || typedProfile.user_type === 'teacher') {
          const { data: supervisorData, error: supervisorError } = await supabase
            .rpc('is_supervisor', { user_id: userId });
            
          if (!supervisorError) {
            // Convert to boolean to ensure type safety
            setIsSuperviser(supervisorData === true);
          }
        }

        // Get school ID
        const { data: schoolIdData, error: schoolIdError } = await supabase
          .rpc('get_user_school_id');

        if (!schoolIdError && schoolIdData) {
          // Convert to string to ensure type safety
          setSchoolId(String(schoolIdData));
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change:", event, newSession?.user?.email);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Reset state if user logs out
        if (!newSession?.user) {
          setProfile(null);
          setIsSuperviser(false);
          setUserRole(null);
          setSchoolId(null);
        } else {
          // Defer fetching user profile using setTimeout to avoid Supabase deadlocks
          setTimeout(() => {
            fetchUserData(newSession.user.id);
          }, 0);
        }

        // Handle sign-in and sign-out events
        if (event === 'SIGNED_IN') {
          const email = newSession?.user?.email;
          const isTest = email ? isTestAccount(email) : false;
          const message = isTest ? "Test account signed in successfully!" : "Signed in successfully!";
          toast.success(message);
          navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          toast.info("Signed out successfully!");
          navigate('/');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
        
        // For test accounts, create account if it doesn't exist
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: window.location.origin + '/dashboard',
          }
        });

        if (signUpError) {
          toast.error(signUpError.message);
          throw signUpError;
        }
        
        // Try signing in again immediately
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError) {
          toast.error(retryError.message);
          throw retryError;
        }
        
        toast.success("Test account created and signed in!");
      } else if (error) {
        toast.error(error.message);
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    try {
      console.log("Registering account:", email, "with type:", metadata.user_type);
      
      // Check if this is a test account by looking at the email domain
      if (isTestAccount(email)) {
        console.log("Creating test account with direct login:", email);
        
        // For test accounts, try signin first (in case account already exists)
        let existingAccount = false;
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!error && data.user) {
            console.log("Test account already exists, signed in directly");
            existingAccount = true;
            toast.success("Test account signed in successfully!");
            return;
          }
        } catch (err) {
          console.log("Test account doesn't exist yet, will create it:", err);
        }
        
        if (!existingAccount) {
          // Create the account if it doesn't exist
          console.log("Creating new test account:", email);
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata,
              emailRedirectTo: window.location.origin + '/dashboard',
            }
          });

          if (error) {
            toast.error(error.message);
            throw error;
          }
          
          // Sign in immediately after account creation
          console.log("Test account created, signing in directly");
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            toast.error(signInError.message);
            throw signInError;
          }
          
          toast.success("Test account created and signed in!");
        }
      } else {
        // Normal sign up flow with email verification
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: window.location.origin + '/dashboard',
          }
        });

        if (error) {
          toast.error(error.message);
          throw error;
        }

        toast.success("Registration successful! Please check your email for verification.");
      }
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out");
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isSuperviser,
        userRole,
        schoolId,
        signIn,
        signUp,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
