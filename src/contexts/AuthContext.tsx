import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isTestAccount } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRole: string | null;
  schoolId: string | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, userType: string, schoolCode: string, schoolName?: string) => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  setTestUser: (accountType: string) => Promise<boolean>;
  clearSession: () => void;
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
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
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

    // Subscribe to auth state changes
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthContext: Auth state change event: ${event}`);
      
      if (event === 'signed_in') {
        setUser(session?.user || null);
        setSession(session || null);
        await fetchUserProfile(session?.user?.id);
      } else if (event === 'signed_out') {
        clearSession();
      } else if (event === 'user_updated') {
        setUser(session?.user || null);
        setSession(session || null);
        await fetchUserProfile(session?.user?.id);
      }
    });

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
      setUserRole(profileData?.user_type || null);
      console.log("AuthContext: User profile loaded:", profileData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const signIn = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the magic link to sign in.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      clearSession();
      console.log("AuthContext: User signed out.");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, userType: string, schoolCode: string, schoolName?: string) => {
    setIsLoading(true);
    try {
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
        throw error;
      }

      console.log("AuthContext: User signed up:", data);
      alert('Check your email to verify your account!');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    setIsLoading(true);
    try {
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
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setTestUser = async (accountType: string) => {
    try {
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
        is_active: true
      };
      setProfile(testProfile);
      
      // Set the role
      setUserRole(accountType);
      
      console.log('Test user set successfully:', {
        user: mockSession.user,
        profile: testProfile,
        role: accountType
      });
      
      return true;
    } catch (error) {
      console.error('Error setting test user:', error);
      return false;
    }
  };

  const clearSession = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
    setSchoolId(null);
    localStorage.removeItem('supabase.auth.token');
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
    clearSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
