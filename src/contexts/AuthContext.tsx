
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (type: UserRole) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  sendEmailVerification: (email: string) => Promise<void>;
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

  // Fetch user profile + organization info
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_type, full_name, school_code, school_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // For school/teacher, fetch org info and supervisor status
      if (data && ['school', 'teacher'].includes(data.user_type)) {
        const { data: userData, error: userError } = await supabase.rpc('get_user_school_id');
        if (!userError && userData) {
          setSchoolId(userData);
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name, code')
            .eq('id', userData)
            .single();

          if (!schoolError && schoolData) {
            const profileWithOrg = { ...data, organization: schoolData } as Profile;

            // Check supervisor status
            const { data: supervisorData, error: supervisorError } = await supabase.rpc('is_supervisor');
            if (!supervisorError) {
              setIsSupervisor(!!supervisorData);
            }
            return profileWithOrg;
          }
        }
      }

      // For students, fetch school_id and org details
      if (data && data.user_type === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('school_id')
          .eq('id', userId)
          .single();

        if (!studentError && studentData) {
          setSchoolId(studentData.school_id);
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name, code')
            .eq('id', studentData.school_id)
            .single();

          if (!schoolError && schoolData) {
            const profileWithOrg = { ...data, organization: schoolData } as Profile;
            return profileWithOrg;
          }
        }
      }

      return data as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Refresh profile data manually
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        setUserRole(profileData.user_type);
      }
    }
  };

  // Setup test user, for demo / development without actual auth
  const setTestUser = async (type: UserRole): Promise<boolean> => {
    try {
      const mockUser = {
        id: `test-${type}-${Date.now()}`,
        email: `${type}.test@learnable.edu`,
        user_metadata: { user_type: type },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: null,
        confirmed_at: new Date().toISOString(),
      } as unknown as User;

      const mockProfile: Profile = {
        id: mockUser.id,
        user_type: type,
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)} User`,
        school_code: 'TEST123',
        school_name: 'Test School',
      };

      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      setIsSupervisor(type === 'school');
      setSchoolId('test-school-id');

      return true;
    } catch (error) {
      console.error('Error setting up test user:', error);
      return false;
    }
  };

  // Send email verification
  const sendEmailVerification = async (email: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (error) throw error;
      
      toast.success('Verification email sent!', {
        description: 'Please check your inbox (and spam folder) for the verification link.'
      });
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      setError(error.message);
      toast.error('Failed to send verification email', {
        description: error.message
      });
    }
  };

  useEffect(() => {
    const setupAuth = async () => {
      try {
        setIsLoading(true);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
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
        });

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

        return () => subscription?.unsubscribe();
      } catch (error: any) {
        console.error('Error setting up auth:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    setupAuth();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      return await supabase.auth.signInWithPassword({ email, password });
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message);
      throw error;
    }
  };

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

  const value: AuthContextProps = {
    session,
    user,
    profile,
    userRole,
    isSupervisor,
    schoolId,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    setTestUser,
    isLoading,
    error,
    sendEmailVerification,
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
