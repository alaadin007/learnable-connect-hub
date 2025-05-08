
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthError } from '@supabase/supabase-js';

type UserType = 'student' | 'teacher' | 'school';

interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  email: string;
  school_id?: string;
  school_code?: string;
  is_active: boolean;
  is_supervisor?: boolean;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  userType: UserType | null;
  userRole?: string; // Added missing property
  schoolId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTestAccount: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string, userType: UserType, schoolCode?: string, inviteCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setTestUser: (type: UserType) => void;
  signUp?: (email: string, password: string, userData: any) => Promise<boolean>; // Added missing method
  signOut?: () => Promise<void>; // Added missing method
  refreshProfile?: () => Promise<void>; // Added missing method
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

// Create custom AuthError for consistency
const createCustomAuthError = (message: string, status: number = 400): AuthError => {
  return {
    message,
    status,
    name: 'AuthError',
    code: 'custom',
    __isAuthError: true
  } as unknown as AuthError; // Use type assertion to handle protected property
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isTestAccount, setIsTestAccount] = useState(false);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch the user's profile from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, organization:schools(*)')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        if (profileData) {
          const profile = profileData as Profile;
          setProfile(profile);
          setUserType(profile.user_type);
          setSchoolId(profile.school_id || null);
          setIsTestAccount(false);
        } else {
          console.warn('No profile found for user', user.id);
          setProfile(null);
          setUserType(null);
          setSchoolId(null);
          setIsTestAccount(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setUserType(null);
        setSchoolId(null);
        setIsTestAccount(false);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'An error occurred while loading user profile';
      toast.error(errorMsg);
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add the refreshProfile method
  const refreshProfile = async () => {
    return loadUserProfile();
  };

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setUser(session.user);
          await loadUserProfile();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        toast.error('Failed to load session');
        setLoading(false);
      }
    };

    loadSession();
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event);
        if (event === 'INITIAL_SESSION') {
          // Skip initial session event
          return;
        }
        
        if (session) {
          setUser(session.user);
          await loadUserProfile();
        } else {
          setUser(null);
          setProfile(null);
          setUserType(null);
          setSchoolId(null);
          setIsTestAccount(false);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    userType: UserType,
    schoolCode?: string,
    inviteCode?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // For school admin registrations, we need to verify the school code
      if (userType === 'school' && !schoolCode) {
        throw createCustomAuthError('School code is required for school admin registration');
      }
      
      // For student registrations, we need to verify the invite code
      if (userType === 'student' && !inviteCode) {
        throw createCustomAuthError('Invite code is required for student registration');
      }
      
      // Register user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            school_code: schoolCode || null
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Verification email has been sent
      toast.success('Registration successful! Check your email to verify your account.');
      
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'An error occurred during signup';
      toast.error(errorMsg);
      console.error('Signup error:', error);
      setLoading(false);
      return false;
    }
  };

  // Add signUp alias for compatibility
  const signUp = signup;

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Fetch user profile after successful login
      await loadUserProfile();
      
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'An error occurred during login';
      toast.error(errorMsg);
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setUserType(null);
      setSchoolId(null);
      setIsTestAccount(false);
      // No need to set loading to false here as loadUserProfile will do that eventually
    } catch (error: any) {
      const errorMsg = error.message || 'An error occurred during logout';
      toast.error(errorMsg);
      console.error('Logout error:', error);
    }
  };

  // Add signOut alias for compatibility
  const signOut = logout;

  // Function to set a test user - used for demo purposes only
  const setTestUser = (type: UserType) => {
    const testUserEmail = `test.${type}@learnable.edu`;
    const testProfile: Profile = {
      id: 'test-user-id',
      user_type: type,
      full_name: `Test ${type}`,
      email: testUserEmail,
      school_id: 'test-school-id',
      school_code: 'TESTCODE',
      is_active: true,
      organization: {
        id: 'test-school-id',
        name: 'Test School',
        code: 'TESTCODE'
      }
    };

    setUser({
      id: 'test-user-id',
      email: testUserEmail,
      app_metadata: {
        provider: 'test',
      },
      user_metadata: {
        full_name: `Test ${type}`,
        user_type: type,
        school_code: 'TESTCODE',
      },
    });
    setProfile(testProfile);
    setUserType(type);
    setSchoolId('test-school-id');
    setIsTestAccount(true);
  };

  // Calculate userRole based on userType for compatibility
  const userRole = userType;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userType,
      userRole,
      schoolId,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
      logout,
      signUp,
      signOut,
      refreshProfile,
      setTestUser,
      isTestAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};
