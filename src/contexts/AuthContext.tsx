
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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
        setProfile(profileData as UserProfile);
        setUserRole(profileData.user_type as UserRole);
        
        // Check if user is a supervisor
        if (profileData.user_type === 'school' || profileData.user_type === 'teacher') {
          const { data: supervisorData, error: supervisorError } = await supabase
            .rpc('is_supervisor', { user_id: userId });
            
          if (!supervisorError) {
            setIsSuperviser(supervisorData || false);
          }
        }

        // Get school ID
        const { data: schoolIdData, error: schoolIdError } = await supabase
          .rpc('get_user_school_id');

        if (!schoolIdError && schoolIdData) {
          setSchoolId(schoolIdData);
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
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Reset state if user logs out
        if (!newSession?.user) {
          setProfile(null);
          setIsSuperviser(false);
          setUserRole(null);
          setSchoolId(null);
        } else {
          // Defer fetching user profile using setTimeout
          setTimeout(() => {
            fetchUserData(newSession.user.id);
          }, 0);
        }

        // Handle sign-in and sign-out events
        if (event === 'SIGNED_IN') {
          toast.success("Signed in successfully!");
          navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          toast.info("Signed out successfully!");
          navigate('/');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
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
      // Check if this is a test account by looking at the email domain
      const isTestAccount = email.endsWith('@testschool.edu');
      
      // For test accounts, directly sign in after registration to bypass email verification
      if (isTestAccount) {
        // Register user first
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

        // Immediately sign in for test accounts
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          toast.error(signInError.message);
          throw signInError;
        }

        toast.success("Test account created and logged in successfully!");
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
