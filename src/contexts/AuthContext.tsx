import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isTestAccount } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  profile: any | null;
  userType: string | null;
  schoolId: string | null;
  isCheckingSession: boolean;
  isTestAccount: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  refreshSession: () => Promise<void>;
  setTestUser: (type: 'student' | 'teacher' | 'school') => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  profile: null,
  userType: null,
  schoolId: null,
  isCheckingSession: true,
  isTestAccount: false,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  updateProfile: async () => {},
  refreshSession: async () => {},
  setTestUser: () => {},
});

// Function to safely check and get profile data
const getProfileSafely = async (userId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getProfileSafely:', err);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isTestAccount, setIsTestAccount] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Login error:', error.message);
      return false;
    }
  };

  // Create a function to set test user without actual authentication
  const setTestUser = (type: 'student' | 'teacher' | 'school') => {
    // Create mock user data
    const mockUser = {
      id: `test-${type}-${Date.now()}`,
      email: `${type}.test@learnable.edu`,
      user_metadata: {
        full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        user_type: type,
      },
    } as User;
    
    // Mock profile data
    const mockProfile = {
      id: mockUser.id,
      full_name: mockUser.user_metadata.full_name,
      user_type: type,
      school_id: 'test-school-001',
    };
    
    // Set the states
    setUser(mockUser);
    setProfile(mockProfile);
    setUserType(type);
    setSchoolId(mockProfile.school_id);
    setIsTestAccount(true);
    setIsAuthenticated(true);
    setIsCheckingSession(false);
    
    console.log('Test user set:', { type, mockUser, mockProfile });
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Registration error:', error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setProfile(null);
      setUserType(null);
      setSchoolId(null);
    } catch (error: any) {
      console.error('Error signing out:', error.message);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) throw new Error('No user logged in');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      setProfile({ ...profile, ...updates });
    } catch (error: any) {
      console.error('Profile update error:', error.message);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setUser(data.session?.user || null);
    } catch (error: any) {
      console.error('Session refresh error:', error.message);
    }
  };
  
  // Simplified user session check - avoids RLS recursion
  const checkSession = useCallback(async () => {
    try {
      setIsCheckingSession(true);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setIsAuthenticated(false);
        setIsCheckingSession(false);
        return;
      }
      
      if (!sessionData.session) {
        setIsAuthenticated(false);
        setIsCheckingSession(false);
        return;
      }
      
      const userId = sessionData.session.user.id;
      setUser(sessionData.session.user);
      
      // Fetch profile data directly without using RPC functions
      const profileData = await getProfileSafely(userId);
      
      if (profileData) {
        setProfile(profileData);
        setUserType(profileData.user_type);
        setSchoolId(profileData.school_id);
        setIsTestAccount(isTestAccount(sessionData.session.user.email || ''));
      }
      
      setIsAuthenticated(true);
      setIsCheckingSession(false);
      
    } catch (err) {
      console.error('Error checking session:', err);
      setIsAuthenticated(false);
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        // Use setTimeout to prevent recursion issues
        setTimeout(() => {
          checkSession();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        setUserType(null);
        setSchoolId(null);
        setIsTestAccount(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    profile,
    userType,
    schoolId,
    isCheckingSession,
    isTestAccount,
    login,
    register,
    logout,
    updateProfile,
    refreshSession,
    setTestUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
