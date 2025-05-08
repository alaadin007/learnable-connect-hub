
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
  isSupervisor: boolean; 
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>; 
  setTestUser: (userType: string) => Promise<boolean>; // Updated return type
  refreshSession: () => Promise<void>;
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
  const setTestUser = async (userType: string): Promise<boolean> => {
    try {
      // Create a mock user based on the userType
      const mockUser = {
        id: `test-${userType}-${Date.now()}`,
        email: `${userType}.test@learnable.edu`,
        user_metadata: { 
          user_type: userType,
          full_name: `Test ${userType.charAt(0).toUpperCase() + userType.slice(1)} User`,
        }
      };
      
      // Create a mock session
      const mockSession = {
        user: mockUser,
        access_token: `mock-token-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`
      } as Session;
      
      // Set the user and session in the context
      setUser(mockUser as User);
      setSession(mockSession);
      
      // Create a mock profile based on the user type
      const mockProfile = {
        id: mockUser.id,
        user_type: userType,
        full_name: mockUser.user_metadata.full_name,
        email: mockUser.email,
        school_id: userType === 'student' ? 'test-school-id' : null,
      };
      
      // Set up organization data based on user type
      if (userType === 'school') {
        mockProfile.user_type = 'school_admin';
        setIsSupervisor(true);
      } else if (userType === 'teacher') {
        setIsSupervisor(userType === 'teacher');
      }
      
      // Set mock organization
      const mockOrganization = {
        id: 'test-school-id',
        name: 'Test School'
      };
      
      // Update state with mock data
      setProfile(mockProfile);
      setUserRole(mockProfile.user_type);
      setOrganization(mockOrganization);
      setSchoolId('test-school-id');
      
      console.log(`AuthContext: Set up test user for ${userType}`);
      
      return true;
    } catch (error) {
      console.error("Error setting up test user:", error);
      return false;
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
