import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/components/auth/ProtectedRoute';

interface AuthContextType {
  user: any;
  profile: Profile | null;
  userRole: UserRole | null;
  isSupervisor: boolean;
  isLoading: boolean;  // backward compatibility
  loading: boolean;    // alternative loading property
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setTestUser?: (user: { email: string; password: string; role: string }) => void;
  schoolId: string | undefined;
  session: any; // authentication session data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State declarations
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [testUser, setTestUserInternal] = useState<{ email: string; password: string; role: string } | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  const navigate = useNavigate();

  const schoolId = profile?.school_id;

  // Load initial session and subscribe to auth changes
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);
          setSessionData(session);
          setIsLoggedIn(true);
          await loadProfile(session.user);
        } else if (testUser) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
          });

          if (error) {
            console.error('Test user sign-in error:', error);
            return;
          }

          setUser(data.user);
          setSessionData(data.session);
          setIsLoggedIn(true);
          await loadProfile(data.user);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setSessionData(session);
        setIsLoggedIn(true);
        await loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setIsSupervisor(false);
        setSessionData(null);
        setIsLoggedIn(false);
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [testUser]);

  const loadProfile = async (currentUser: any) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (profileData) {
        const typedRole = profileData.user_type as UserRole;

        let processedOrg: { id: string; name?: string; code?: string } | undefined;

        if (profileData.organization) {
          if (typeof profileData.organization === 'object' && !Array.isArray(profileData.organization)) {
            const org = profileData.organization as any;
            processedOrg = {
              id: org.id || profileData.school_id || '',
              name: org.name || profileData.school_name,
              code: org.code || profileData.school_code,
            };
          } else if (profileData.school_id) {
            processedOrg = {
              id: profileData.school_id,
              name: profileData.school_name,
              code: profileData.school_code,
            };
          }
        } else if (profileData.school_id) {
          processedOrg = {
            id: profileData.school_id,
            name: profileData.school_name,
            code: profileData.school_code,
          };
        }

        const processedProfile: Profile = {
          ...profileData,
          organization: processedOrg,
        };

        setProfile(processedProfile);
        setUserRole(typedRole);
        setIsSupervisor(Boolean(profileData.is_supervisor));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Sign-in error:", error);
        return { error };
      }

      setUser(data.user);
      setSessionData(data.session);
      setIsLoggedIn(true);
      await loadProfile(data.user);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) {
        console.error("Signup error:", error);
        return { error };
      }

      setUser(data.user);
      setSessionData(data.session);
      setIsLoggedIn(true);
      await loadProfile(data.user);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign-out error:", error);
        throw error;
      }

      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSupervisor(false);
      setSessionData(null);
      setIsLoggedIn(false);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }

      let processedOrg: { id: string; name?: string; code?: string } | undefined;

      if (data.organization) {
        if (typeof data.organization === 'object' && !Array.isArray(data.organization)) {
          const org = data.organization as any;
          processedOrg = {
            id: org.id || data.school_id || '',
            name: org.name || data.school_name,
            code: org.code || data.school_code,
          };
        } else if (data.school_id) {
          processedOrg = {
            id: data.school_id,
            name: data.school_name,
            code: data.school_code,
          };
        }
      } else if (data.school_id) {
        processedOrg = {
          id: data.school_id,
          name: data.school_name,
          code: data.school_code,
        };
      }

      const processedProfile: Profile = {
        ...data,
        organization: processedOrg,
      };

      setProfile(processedProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const setTestUser = (user: { email: string; password: string; role: string }) => {
    setTestUserInternal(user);
  };

  const value: AuthContextType = {
    user,
    profile,
    userRole,
    isSupervisor,
    isLoading,
    loading: isLoading, // alias for backward compatibility
    isLoggedIn,
    signIn,
    signUp,
    signOut,
    updateProfile,
    setTestUser,
    schoolId,
    session: sessionData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};