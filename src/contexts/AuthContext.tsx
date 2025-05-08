
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthError, Session } from '@supabase/supabase-js';

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
  userRole?: string;
  schoolId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTestAccount: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string, userType: UserType, schoolCode?: string, inviteCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setTestUser: (type: UserType) => void;
  signUp: (email: string, password: string, userData: any) => Promise<boolean>;
  signOut?: () => Promise<void>;
  refreshProfile?: () => Promise<void>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("loadUserProfile - user:", user);
      
      if (user) {
        // Fetch the user's profile from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, organization:schools(*)')
          .eq('id', user.id)
          .single();
        
        console.log("loadUserProfile - profile data:", profileData, "error:", profileError);
        
        if (profileError) {
          throw profileError;
        }
        
        if (profileData) {
          const profile = profileData as Profile;
          setProfile(profile);
          setUserType(profile.user_type);
          setSchoolId(profile.school_id || null);
          setIsTestAccount(false);
          setUser(user);
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
    console.log("Refreshing user profile...");
    return loadUserProfile();
  };

  useEffect(() => {
    if (initialized) return;
    
    console.log("Setting up auth state listener...");
    
    const loadInitialState = async () => {
      try {
        setLoading(true);
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change event:', event, session?.user?.id);
            
            if (event === 'SIGNED_IN') {
              setSession(session);
              setUser(session?.user ?? null);
              await loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setSession(null);
              setProfile(null);
              setUserType(null);
              setSchoolId(null);
              setIsTestAccount(false);
              setLoading(false);
            }
          }
        );
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session check:", session?.user?.id);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          await loadUserProfile();
        } else {
          setLoading(false);
        }
        
        setInitialized(true);
        
        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up auth:', error);
        setLoading(false);
      }
    };

    loadInitialState();
  }, [initialized]);

  // Update the signup implementation to match the expected signature in the interface
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
      console.log("Signup initiated:", { email, fullName, userType, schoolCode });
      
      // For school admin registrations, we need to verify the school code
      if (userType === 'school' && !schoolCode) {
        throw createCustomAuthError('School code is required for school admin registration');
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
      
      console.log("Signup response:", data, error);
      
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
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add signUp implementation that matches the expected signature
  const signUp = async (email: string, password: string, userData: any): Promise<boolean> => {
    // Extract the data from userData to call our existing signup method
    const { fullName, userType, schoolCode, inviteCode } = userData;
    return signup(email, password, fullName, userType as UserType, schoolCode, inviteCode);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log("Login initiated:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      console.log("Login response:", data?.user?.id, error);
      
      if (error) {
        throw error;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      
      // Fetch user profile after successful login
      await loadUserProfile();
      
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'An error occurred during login';
      toast.error(errorMsg);
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("Logout initiated");
      await supabase.auth.signOut();
      console.log("Logout completed");
      
      // Clear local state
      setUser(null);
      setSession(null);
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
      signOut: logout,
      refreshProfile,
      setTestUser,
      isTestAccount,
      session
    }}>
      {children}
    </AuthContext.Provider>
  );
};
