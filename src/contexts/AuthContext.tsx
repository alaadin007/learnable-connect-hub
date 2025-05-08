import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRole: string | null;
  organization: { id: string; name: string } | null;
  isLoading: boolean;
  schoolId: string | null;
  dbError: boolean | null;
  isSupervisor: boolean; // Add missing property
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>; // Add missing method
  setTestUser: (userData: any) => Promise<void>; // Add missing method
  refreshSession: () => Promise<void>; // Add missing method
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<boolean | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);

  // Function to refresh user profile data
  const refreshProfile = async () => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  // Function to refresh session data
  const refreshSession = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    if (currentSession?.user) {
      await loadUserProfile(currentSession.user.id);
    }
  };

  // Function to set test user for development
  const setTestUser = async (userData: any) => {
    if (userData && userData.user) {
      setUser(userData.user);
      setSession(userData);
      await loadUserProfile(userData.user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
          setOrganization(null);
          setSchoolId(null);
          setIsSupervisor(false);
        }
        
        setIsLoading(false);
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        let organizationData = null;
        
        // If organization data is available in the profile, use it
        if (profileData.organization && typeof profileData.organization === 'object') {
          const orgData = profileData.organization as Record<string, any>;
          if (orgData && orgData.id && orgData.name) {
            organizationData = {
              id: orgData.id,
              name: orgData.name
            };
          }
        }
        // Otherwise, try to construct from school_id if available
        else if (profileData.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id, name')
            .eq('id', profileData.school_id)
            .single();
            
          if (schoolData) {
            organizationData = {
              id: schoolData.id,
              name: schoolData.name
            };
          }
        }

        // Check if user is supervisor
        if (profileData.user_type === 'teacher') {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('is_supervisor')
            .eq('id', userId)
            .single();
          
          setIsSupervisor(teacherData?.is_supervisor || false);
        } else {
          setIsSupervisor(profileData.user_type === 'school_admin');
        }

        // Update the profile
        const formattedProfile = {
          ...profileData,
          organization: organizationData
        };
        
        setProfile(formattedProfile);
        setUserRole(profileData.user_type || null);
        setOrganization(organizationData);
        setSchoolId(profileData.school_id || null);
      }
      
      setDbError(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setDbError(true);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    organization,
    isLoading,
    schoolId,
    dbError,
    isSupervisor,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    setTestUser,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
