
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import {
  Session,
  User,
  AuthError,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner'; // Add missing toast import

// Define the types for the context
export type ProfileWithRole = {
  id: string;
  created_at: string;
  updated_at: string;
  user_type: 'student' | 'teacher' | 'school' | null;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_supervisor: boolean;
  school_id: string | null;
  school_code: string | null;
  school_name: string | null;
  organization: any; // TODO: Define organization type
};

type AuthContextType = {
  user: User | null;
  profile: ProfileWithRole | null;
  schoolId: string | null;
  loading: boolean;
  error: string | null;
  userRole: 'student' | 'teacher' | 'school' | null; // Add userRole
  session: Session | null; // Add session
  signIn: (email: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, full_name: string, school_code: string, user_type: 'student' | 'teacher') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  updateProfile: (updates: { full_name: string }) => Promise<{ error: AuthError | null }>;
  setTestUser: (type: 'student' | 'teacher' | 'school') => void;
  refreshProfile: () => Promise<void>; // Add refreshProfile method
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  schoolId: null,
  loading: true,
  error: null,
  userRole: null, // Add userRole
  session: null, // Add session
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  checkAuthStatus: async () => false,
  updateProfile: async () => ({ error: null }),
  setTestUser: () => {},
  refreshProfile: async () => {}, // Add refreshProfile
});

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Session['user'] | null>(null);
  const [profile, setProfile] = useState<ProfileWithRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null); // Add session state
  const navigate = useNavigate();
  const location = useLocation();

  // Compute userRole from profile
  const userRole = useMemo(() => {
    return profile?.user_type || null;
  }, [profile]);

  useEffect(() => {
    const checkAuth = async () => {
      await checkAuthStatus();
    };

    checkAuth();

    // Set up listener for supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setSchoolId(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to load user profile
  const loadUserProfile = async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    setProfile(userProfile);
    const userSchoolId = await getUserSchoolId(userId);
    setSchoolId(userSchoolId);
    setLoading(false);
  };

  // Helper function to get a user's profile
  const getUserProfile = async (userId: string): Promise<ProfileWithRole | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as ProfileWithRole;
    } catch (e) {
      console.error('Unexpected error getting user profile:', e);
      return null;
    }
  };

  // Get the school ID for a user
  const getUserSchoolId = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_user_school_id_safely', {
        uid: userId,
      });

      if (error) {
        console.error('Error getting school ID:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error in getUserSchoolId:', e);
      return null;
    }
  };

  // Add refreshProfile method
  const refreshProfile = async (): Promise<void> => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await loadUserProfile(user.id);
    } catch (e) {
      console.error('Error refreshing profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const setTestUser = (type: 'student' | 'teacher' | 'school'): void => {
    // Create mock data based on type
    const mockUser = {
      id: `test-${type}-${Date.now()}`,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    
    const mockProfile: ProfileWithRole = {
      id: mockUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_type: type,
      email: `test-${type}@example.com`,
      full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      is_active: true,
      is_supervisor: type === 'teacher',
      school_id: 'test-school-id',
      school_code: 'TEST',
      school_name: 'Test School',
      organization: null as any,
    };
    
    // Set the mocked state
    setUser(mockUser as any);
    setProfile(mockProfile);
    setSchoolId('test-school-id');
    setLoading(false);
    setError(null);
  };

  const signIn = async (email: string): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setError(error.message);
        return { error };
      }
      toast.success(`Check your email (${email}) for the magic link to sign in.`);
      return { error: null };
    } catch (e: any) {
      setError(e.message);
      return { error: e };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    full_name: string, 
    school_code: string, 
    user_type: 'student' | 'teacher'
  ): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    setError(null);
    try {
      // First, sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: Math.random().toString(36).slice(-8), // Generate a random password
        options: {
          data: {
            full_name: full_name,
            user_type: user_type,
          },
        },
      });

      if (error) {
        setError(error.message);
        return { error };
      }

      // Now, update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: full_name,
          school_code: school_code,
          user_type: user_type,
        })
        .eq('id', data.user?.id);

      if (profileError) {
        setError(profileError.message);
        // Convert PostgrestError to AuthError
        const authError: AuthError = {
          message: profileError.message,
          status: 400,
          __isAuthError: true,
        };
        return { error: authError };
      }

      // Finally, insert the user into the appropriate table
      const tableName = user_type === 'teacher' ? 'teachers' : 'students';
      const { error: tableError } = await supabase
        .from(tableName)
        .insert({
          id: data.user?.id,
          school_code: school_code,
        });

      if (tableError) {
        setError(tableError.message);
        // Convert PostgrestError to AuthError
        const authError: AuthError = {
          message: tableError.message,
          status: 400,
          __isAuthError: true,
        };
        return { error: authError };
      }

      toast.success(`Check your email (${email}) for the magic link to verify your account.`);
      return { error: null };
    } catch (e: any) {
      setError(e.message);
      // Create an AuthError from the caught error
      const authError: AuthError = {
        message: e.message,
        status: 400,
        __isAuthError: true,
      };
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSchoolId(null);
      setSession(null);
      navigate('/login'); // Redirect to login page after sign out
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        return false;
      }

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await loadUserProfile(session.user.id);
        return true;
      } else {
        // If not authenticated, redirect to login page, but only if we're not already there
        if (location.pathname !== '/login' && location.pathname !== '/signup') {
          navigate('/login', { state: { from: location.pathname } });
        }
        return false;
      }
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { full_name: string }): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) {
        throw new Error("User ID is not available.");
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        setError(error.message);
        // Convert PostgrestError to AuthError
        const authError: AuthError = {
          message: error.message,
          status: 400,
          __isAuthError: true,
        };
        return { error: authError };
      }

      // Optimistically update the local profile state
      setProfile((prevProfile) =>
        prevProfile ? { ...prevProfile, full_name: updates.full_name } : null
      );

      toast.success("Profile updated successfully!");
      return { error: null };
    } catch (e: any) {
      setError(e.message);
      // Create an AuthError from the caught error
      const authError: AuthError = {
        message: e.message,
        status: 400,
        __isAuthError: true,
      };
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const authContextValue = useMemo(
    () => ({
      user,
      profile,
      schoolId,
      loading,
      error,
      userRole,
      session,
      signIn,
      signUp,
      signOut,
      checkAuthStatus,
      updateProfile,
      setTestUser,
      refreshProfile,
    }),
    [user, profile, schoolId, loading, error, userRole, session]
  );

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

// Create a custom hook to use the auth context
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth };
