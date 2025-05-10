import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  hasData, 
  getUserProfile, 
  hasProperty, 
  isNotNullOrUndefined,
  UserType
} from '@/utils/supabaseTypeHelpers';

export type UserRole = 'student' | 'teacher' | 'school_admin' | 'school' | null;

interface ProfileData {
  user_type: UserType;
  school_id?: string | null;
}

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
  userRole: UserRole;
  connectionError: boolean;
  signIn: (email: string, password: string) => Promise<{data?: any, error?: AuthError}>;
  signUp: (email: string, password: string, options?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [connectionError, setConnectionError] = useState(false);
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
        setConnectionError(true);
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
        setUserRole(null);
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
      
      if (hasData(profileResponse) && profileResponse.data) {
        // Safe to access profileData properties now
        const profileData = profileResponse.data;
        setProfile(profileData);
        
        // Set user role flags
        const userType = profileData.user_type as UserType;
        setIsTeacher(userType === 'teacher');
        setIsSchoolAdmin(userType === 'school_admin' || userType === 'school');
        setIsStudent(userType === 'student');
        setUserRole(userType);
        
        // Set school ID
        if (profileData.school_id) {
          setSchoolId(profileData.school_id);
        }
      }
      
      // Check if user is a supervisor
      try {
        const { data: supervisorData, error } = await supabase.rpc('is_user_supervisor_safe');
        if (!error && supervisorData !== null) {
          setIsSupervisor(Boolean(supervisorData));
        }
      } catch (error) {
        console.error('Error checking supervisor status:', error);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserData(user);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) throw result.error;

      if (result.data?.user) {
        toast.success('Welcome back! You are now logged in.');
        navigate('/');
      }
      
      return result;
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
        toast.success('Sign up successful! Please check your email to verify your account.');
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
      setUserRole(null);
      
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
        userRole,
        connectionError,
        signIn,
        signUp,
        signOut,
        refreshProfile,
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
