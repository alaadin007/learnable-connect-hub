
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
// Import the needed functions from supabaseTypeHelpers
import { 
  ProfileData, 
  hasData, 
  getUserProfile,
  UserType,
  isSchoolAdmin
} from '@/utils/supabaseTypeHelpers';

// For the test account feature
export type TestUserType = {
  email: string;
  password: string;
  role: string;
  name?: string;
};

// Define the context type
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    message?: string;
    error?: AuthError;
  }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Object) => Promise<{
    success: boolean;
    message?: string;
    error?: AuthError;
  }>;
  schoolId: string | null;
  userRole: string | null;
  isSuperviser: boolean;
  isSchoolAdmin: boolean;
  setTestUser?: (user: TestUserType) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ success: false, message: "Not implemented" }),
  signOut: async () => {},
  signUp: async () => ({ success: false, message: "Not implemented" }),
  schoolId: null,
  userRole: null,
  isSuperviser: false,
  isSchoolAdmin: false
});

interface AuthProviderProps {
  children: React.ReactNode;
  enableTestMode?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, enableTestMode = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Derived states
  const schoolId = profile?.school_id || null;
  const userRole = profile?.user_type || null;
  const isSuperviser = profile?.is_supervisor || false;
  const isSchoolAdminVar = isSchoolAdmin(userRole);
  
  // Handle session changes
  useEffect(() => {
    const setupAuth = async () => {
      setLoading(true);
      try {
        // Get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Get the user profile
          const userProfile = await getUserProfile(currentSession.user.id);
          setProfile(userProfile);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error setting up auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    setupAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Get the user profile
        const userProfile = await getUserProfile(currentSession.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return {
          success: false,
          message: error.message,
          error
        };
      }
      
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        
        // Get the user profile
        const userProfile = await getUserProfile(data.user.id);
        setProfile(userProfile);
        
        return {
          success: true
        };
      }
      
      return {
        success: false,
        message: "No user returned from sign in"
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  };
  
  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };
  
  // Sign up function
  const signUp = async (email: string, password: string, metadata?: Object) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (error) {
        return {
          success: false,
          message: error.message,
          error
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  };

  // Test user function (only if enableTestMode is true)
  const setTestUser = enableTestMode ? (testUser: TestUserType) => {
    toast.info(`Signing in as test ${testUser.role}: ${testUser.email}`);
    
    // Create a mock profile based on the test user role
    const mockProfile: ProfileData = {
      id: `test-${testUser.role}-id`,
      user_type: testUser.role as UserType,
      full_name: testUser.name || `Test ${testUser.role}`,
      email: testUser.email,
      school_id: `test-school-id`,
      school_name: 'Test School',
      is_active: true,
      is_supervisor: testUser.role === 'school_admin' || testUser.role === 'teacher_supervisor'
    };
    
    // Create a mock user
    const mockUser = {
      id: mockProfile.id,
      app_metadata: {},
      user_metadata: {
        full_name: mockProfile.full_name,
        user_type: mockProfile.user_type
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: mockProfile.email,
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString()
    } as User;
    
    // Set the mock user and profile
    setUser(mockUser);
    setProfile(mockProfile);
    // Not setting a session for test users as it's not needed
    
    localStorage.setItem('testUser', JSON.stringify({
      user: mockUser,
      profile: mockProfile
    }));
    
    toast.success(`Signed in as test ${testUser.role}`);
  } : undefined;
  
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        profile, 
        loading, 
        signIn, 
        signOut, 
        signUp,
        schoolId,
        userRole,
        isSuperviser,
        isSchoolAdmin: isSchoolAdminVar,
        setTestUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
