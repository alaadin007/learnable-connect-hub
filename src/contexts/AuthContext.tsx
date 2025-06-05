
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateAndSanitizeForm, authRateLimiter } from '@/utils/security';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_type: 'student' | 'teacher' | 'school_admin' | 'school';
  full_name: string;
  email?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_supervisor?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  userRole: string | null;
  schoolId: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: any; success?: boolean }>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
  isSupervisor: boolean;
  isSchoolAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile with security validation
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        // Validate and sanitize profile data
        const { valid, sanitized } = validateAndSanitizeForm(data);
        
        if (valid) {
          setProfile(sanitized as UserProfile);
        } else {
          console.error('Invalid profile data received');
          toast.error('Profile data validation failed');
        }
      }
    } catch (error) {
      console.error('Exception loading profile:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(email)) {
      toast.error('Too many login attempts. Please try again later.');
      return { error: new Error('Rate limit exceeded') };
    }

    // Validate and sanitize input
    const { valid, sanitized, errors } = validateAndSanitizeForm({ email, password });
    
    if (!valid) {
      toast.error('Invalid input: ' + errors.join(', '));
      return { error: new Error('Invalid input') };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitized.email,
        password: sanitized.password,
      });

      if (error) {
        // Don't expose internal error details
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error('Login failed. Please try again.');
        }
        return { error };
      }

      // Reset rate limiter on successful login
      authRateLimiter.reset(email);
      toast.success('Signed in successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(email)) {
      toast.error('Too many registration attempts. Please try again later.');
      throw new Error('Rate limit exceeded');
    }

    // Validate and sanitize all input data
    const allData = { email, password, ...userData };
    const { valid, sanitized, errors } = validateAndSanitizeForm(allData);
    
    if (!valid) {
      toast.error('Invalid input: ' + errors.join(', '));
      throw new Error('Invalid input');
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: sanitized.email,
        password: sanitized.password,
        options: {
          data: {
            full_name: sanitized.full_name,
            user_type: sanitized.user_type,
            school_code: sanitized.school_code
          }
        }
      });

      if (error) {
        // Don't expose internal error details
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists');
        } else {
          toast.error('Registration failed. Please try again.');
        }
        throw error;
      }

      toast.success('Account created successfully');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setProfile(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
      throw error;
    }
  };

  // Computed properties for user roles
  const isTeacher = profile?.user_type === 'teacher' || profile?.user_type === 'school_admin';
  const isStudent = profile?.user_type === 'student';
  const isSupervisor = Boolean(profile?.is_supervisor);
  const isSchoolAdmin = profile?.user_type === 'school_admin' || profile?.user_type === 'school';
  const userRole = profile?.user_type || null;
  const schoolId = profile?.school_id || null;

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isLoading: loading,
    userRole,
    schoolId,
    signIn,
    signUp,
    signOut,
    isTeacher,
    isStudent,
    isSupervisor,
    isSchoolAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
