
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'school' | 'teacher' | 'student';

type Profile = {
  id: string;
  user_type: UserRole;
  full_name?: string;
  school_code?: string;
  school_name?: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
};

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isSupervisor: boolean;
  schoolId: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get user profile data including organization info
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_type,
          full_name,
          school_code,
          school_name
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // If user is a school admin or teacher, get the organization info
      if (data && (data.user_type === 'school' || data.user_type === 'teacher')) {
        // Get school ID for this user
        const { data: userData, error: userError } = await supabase.rpc('get_user_school_id');
        
        if (!userError && userData) {
          setSchoolId(userData);
          
          // Fetch school details
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name, code')
            .eq('id', userData)
            .single();
            
          if (!schoolError && schoolData) {
            data.organization = schoolData;
          }
        }
        
        // Check if user is a supervisor (for teachers)
        if (data.user_type === 'teacher' || data.user_type === 'school') {
          const { data: supervisorData, error: supervisorError } = await supabase.rpc('is_supervisor');
          
          if (!supervisorError) {
            setIsSupervisor(!!supervisorData);
          }
        }
      } else if (data && data.user_type === 'student') {
        // For students, get their school_id
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('school_id')
          .eq('id', userId)
          .single();
          
        if (!studentError && studentData) {
          setSchoolId(studentData.school_id);
          
          // Fetch school details
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name, code')
            .eq('id', studentData.school_id)
            .single();
            
          if (!schoolError && schoolData) {
            data.organization = schoolData;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Check for existing session on page load
  useEffect(() => {
    const setupAuth = async () => {
      try {
        setIsLoading(true);
        
        // Set up the auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session);
            setUser(session?.user || null);
            
            if (session?.user) {
              // Using setTimeout prevents Supabase auth deadlocks when fetching data
              // during auth state changes
              setTimeout(async () => {
                const profileData = await fetchProfile(session.user.id);
                if (profileData) {
                  setProfile(profileData);
                  setUserRole(profileData.user_type);
                }
              }, 0);
            } else {
              setProfile(null);
              setUserRole(null);
              setIsSupervisor(false);
              setSchoolId(null);
            }
          }
        );
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
            setUserRole(profileData.user_type);
          }
        }
        
        return () => {
          subscription?.unsubscribe();
        };
      } catch (error: any) {
        console.error('Error setting up auth:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupAuth();
  }, []);

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    userRole,
    isSupervisor,
    schoolId,
    signUp,
    signIn,
    signOut,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
