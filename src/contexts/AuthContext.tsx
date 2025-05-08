
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isTestAccount } from '@/integrations/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// Define the profile interface with is_supervisor property
interface UserProfile {
  id: string;
  user_type: string | null;
  full_name: string | null;
  email: string | null;
  school_id: string | null;
  school_code: string | null;
  is_active: boolean;
  organization?: any;
  school_name?: string | null;
  updated_at?: string;
  created_at?: string;
  is_supervisor?: boolean;
}

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: string | null;
  schoolId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any, error?: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, userType: string, schoolCode: string, schoolName?: string) => Promise<{ error?: any }>;
  updateProfile: (updates: any) => Promise<void>;
  setTestUser: (accountType: string) => Promise<boolean>;
  clearSession: () => void;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to prevent flashing
  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const navigate = useNavigate();

  // Handle auth state changes from Supabase
  useEffect(() => {
    // First check for a test account in localStorage
    const isTestSession = localStorage.getItem('usingTestAccount') === 'true';
    const testAccountType = localStorage.getItem('testAccountType');
    
    if (isTestSession && testAccountType) {
      console.log("AuthContext: Setting up test user from localStorage");
      setTestUser(testAccountType)
        .then(() => {
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error restoring test user session:", error);
          clearSession();
          setIsLoading(false);
        });
      return;
    }
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`AuthContext: Auth state change event: ${event}`);
      
      if (event === 'SIGNED_IN') {
        setUser(newSession?.user || null);
        setSession(newSession || null);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        clearSession();
        setIsLoading(false);
      } else if (event === 'USER_UPDATED') {
        setUser(newSession?.user || null);
        setSession(newSession || null);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        }
        setIsLoading(false);
      }
    });

    // Check for existing Supabase session
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);
          setSession(session);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string | undefined) => {
    if (!userId) {
      console.warn("AuthContext: No user ID to fetch profile.");
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      setProfile(profileData);
      setSchoolId(profileData?.school_id || null);
      
      // Map legacy role names for consistency
      let role = profileData?.user_type;
      if (role === 'school_admin') {
        role = 'school';
      }
      setUserRole(role);
      
      // Set supervisor status from the profile data
      if (profileData?.user_type === 'teacher_supervisor' || 
          (profileData?.user_type === 'teacher' && profileData.is_supervisor === true)) {
        setIsSupervisor(true);
      } else {
        setIsSupervisor(false);
      }
      
      console.log("AuthContext: User profile loaded:", profileData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  const refreshSession = async () => {
    try {
      setIsLoading(true);
      
      // Check for test account
      const isTestSession = localStorage.getItem('usingTestAccount') === 'true';
      const testAccountType = localStorage.getItem('testAccountType');
      
      if (isTestSession && testAccountType) {
        await setTestUser(testAccountType);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setSession(session);
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        console.error("Sign in error:", result.error);
      } else if (result.data?.user) {
        // Directly fetch profile data after successful login
        await fetchUserProfile(result.data.user.id);
      }
      
      return result;
    } catch (error: any) {
      console.error("Error signing in:", error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're using a test account
      const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
      
      if (usingTestAccount) {
        // For test accounts, we just need to clear local storage and state
        console.log("AuthContext: Signing out test account");
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
      } else {
        // For real accounts, call Supabase's signOut method
        console.log("AuthContext: Signing out real account");
        await supabase.auth.signOut();
      }
      
      // Always clear session state
      clearSession();
      console.log("AuthContext: User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, userType: string, schoolCode: string, schoolName?: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            school_code: schoolCode,
            school_name: schoolName
          }
        }
      });

      if (error) {
        console.error("Error signing up:", error);
        return { error };
      }

      console.log("AuthContext: User signed up:", data);
      return { data };
    } catch (error: any) {
      console.error("Error in sign up:", error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      // Optimistically update the local profile state
      setProfile(prevProfile => ({ ...prevProfile, ...updates }));
      console.log("AuthContext: Profile updated successfully:", updates);
    } catch (error: any) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTestUser = async (accountType: string) => {
    try {
      setIsLoading(true);
      console.log(`Setting test user for account type: ${accountType}`);
      
      // Create a mock test session with required properties
      const mockSession: Session = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: `test-${accountType}-id`,
          email: `${accountType}.test@learnable.edu`,
          user_metadata: { 
            user_type: accountType,
            full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} User` 
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: '',
        } as User
      };
      
      // Set the current session and user
      setSession(mockSession);
      setUser(mockSession.user);
      
      // Set the profile based on the account type
      const testProfile = {
        id: mockSession.user.id,
        full_name: mockSession.user.user_metadata.full_name,
        user_type: accountType,
        school_id: 'test-school-id',
        school_code: 'TEST123',
        email: mockSession.user.email,
        is_active: true,
        is_supervisor: accountType === 'teacher_supervisor'
      };
      
      setProfile(testProfile);
      setUserRole(accountType);
      
      // Set supervisor status for test users
      if (accountType === 'teacher_supervisor' || accountType === 'school') {
        setIsSupervisor(true);
      } else {
        setIsSupervisor(false);
      }
      
      console.log('Test user set successfully:', {
        user: mockSession.user,
        profile: testProfile,
        role: accountType
      });
      
      return true;
    } catch (error) {
      console.error('Error setting test user:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
    setSchoolId(null);
    setIsSupervisor(false);
    
    // Clear any persisted auth data from localStorage
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.expires_at');
    localStorage.removeItem('supabase.auth.refresh_token');
    localStorage.removeItem('supabase.auth.session');
    
    console.log("AuthContext: Session cleared.");
  };

  const value: AuthContextProps = {
    user,
    session,
    profile,
    userRole,
    schoolId,
    isLoading,
    signIn,
    signOut,
    signUp,
    updateProfile,
    setTestUser,
    clearSession,
    refreshProfile,
    refreshSession,
    isSupervisor
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
