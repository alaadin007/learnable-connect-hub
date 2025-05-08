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
  login: (email?: string) => Promise<void>;
  register: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  profile: null,
  userType: null,
  schoolId: null,
  isCheckingSession: true,
  isTestAccount: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  refreshSession: async () => {},
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

  const login = async (email?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email || '', options: { shouldCreateUser: false } });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (error: any) {
      alert(error.error_description || error.message);
    }
  };

  const register = async (email?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email || '', options: { shouldCreateUser: true } });
      if (error) throw error;
      alert('Check your email to complete your registration!');
    } catch (error: any) {
      alert(error.error_description || error.message);
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
      alert(error.message);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error;
      setUser(data.session?.user || null);
    } catch (error: any) {
      alert(error.message);
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

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        setUserType(null);
        setSchoolId(null);
        setIsTestAccount(false);
      }
    });
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
