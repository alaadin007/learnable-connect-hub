
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { hasData, safeCast, getUserProfile } from '@/utils/supabaseTypeHelpers';

type AuthContextType = {
  user: User | null;
  profile: any;
  schoolId: string | null;
  isTeacher: boolean;
  isSupervisor: boolean;
  isSchoolAdmin: boolean;
  isStudent: boolean;
  session: Session | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: any) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isSchoolAdmin, setIsSchoolAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user || null);
        
        // If we have a user, fetch extended profile information
        if (data.session?.user) {
          loadUserData(data.session.user);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setIsLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user || null);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setSchoolId(null);
        setIsTeacher(false);
        setIsSchoolAdmin(false);
        setIsSupervisor(false);
        setIsStudent(false);
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const loadUserData = async (user: User) => {
    try {
      // Try to get profile data using helper function
      const profileResponse = await getUserProfile(user.id);
      
      if (profileResponse.data) {
        setProfile(profileResponse.data);
        
        // Set user role flags
        const userType = profileResponse.data.user_type;
        setIsTeacher(userType === 'teacher');
        setIsSchoolAdmin(userType === 'school_admin' || userType === 'school');
        setIsStudent(userType === 'student');
        
        // Set school ID
        if (profileResponse.data.school_id) {
          setSchoolId(profileResponse.data.school_id);
        }
      }
      
      // Check if user is a supervisor
      try {
        const { data: supervisorData } = await supabase.rpc('is_user_supervisor_safe');
        setIsSupervisor(Boolean(supervisorData));
      } catch (error) {
        console.error('Error checking supervisor status:', error);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.user) {
        toast.success('Welcome back! You are now logged in.');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      const message = error?.message || 'Failed to sign in';
      toast.error(message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, options?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options });
      if (error) throw error;

      if (data) {
        toast(
          {
            title: 'Sign up successful!', 
            description: 'Please check your email to verify your account.'
          }
        );
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to sign up');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setProfile(null);
      setSchoolId(null);
      setIsTeacher(false);
      setIsSchoolAdmin(false);
      setIsSupervisor(false);
      setIsStudent(false);
      
      toast.success('You have been signed out');
      navigate('/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        schoolId,
        isTeacher,
        isSupervisor,
        isSchoolAdmin,
        isStudent,
        session,
        isLoggedIn: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
