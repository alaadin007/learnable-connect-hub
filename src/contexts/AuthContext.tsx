import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { getUserRoleWithFallback } from '@/utils/apiHelpers';

export type UserRole = 'student' | 'teacher' | 'school' | 'school_admin' | null;

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole;
  isSuperviser: boolean;
  schoolId: string | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTestUser: (accountType: "school" | "teacher" | "student", schoolIndex?: number) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  userRole: null,
  isSuperviser: false,
  schoolId: null,
  isLoading: false,
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  setTestUser: async () => {},
  signUp: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isSuperviser, setIsSuperviser] = useState<boolean>(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Optimized auth initialization
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Update session and user synchronously
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Use setTimeout with 0ms to defer profile fetch without adding delay
          fetchUserProfile(currentSession.user);
        } else {
          setProfile(null);
          setUserRole(null);
          setIsSuperviser(false);
          setSchoolId(null);
          
          // Clear localStorage when logged out
          localStorage.removeItem('userRole');
          localStorage.removeItem('schoolId');
        }
      }
    );

    // Check for existing session
    const checkSession = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user);
      }
      setIsLoading(false);
    };

    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkIfUserIsSchoolAdmin = async (userId: string): Promise<boolean> => {
    try {
      // First check if user exists in school_admins table
      const { data: adminData, error: adminError } = await supabase
        .from('school_admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (adminError) {
        console.error("Error checking school_admins table:", adminError);
      } else if (adminData) {
        return true;
      }
      
      // Check if user has a profile with supervisor status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_supervisor')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error checking if user is school admin:", profileError);
      } else if (profileData?.is_supervisor === true) {
        return true;
      }
      
      // Check if user is in teachers table with supervisor flag
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('is_supervisor')
        .eq('id', userId)
        .maybeSingle();
      
      if (teacherError) {
        console.error("Error checking teacher supervisor status:", teacherError);
      } else if (teacherData?.is_supervisor === true) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Exception checking if user is school admin:", error);
      return false;
    }
  };

  const fetchUserProfile = async (currentUser: User) => {
    try {
      setIsLoading(true);
      // Fetch profile data directly to avoid RPC calls that might cause recursion
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, organization:school_id(*)')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Fallback to checking if user is a school admin
        const isAdmin = await checkIfUserIsSchoolAdmin(currentUser.id);
        setIsSuperviser(isAdmin);
      }

      // Convert the profileData to Profile type
      const fetchedProfile: Profile | null = profileData ? {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        user_type: profileData.user_type,
        is_supervisor: profileData.is_supervisor,
        organization_id: profileData.school_id,
        school_id: profileData.school_id,
        school_code: profileData.school_code,
        school_name: profileData.school_name,
        is_active: profileData.is_active,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        organization: typeof profileData.organization === 'object' && profileData.organization !== null ? 
          {
            id: (profileData.organization as Record<string, any>)?.id,
            name: (profileData.organization as Record<string, any>)?.name,
            code: (profileData.organization as Record<string, any>)?.code
          } : 
          undefined
      } : null;
      
      setProfile(fetchedProfile);

      // Set school ID
      const effectiveSchoolId = fetchedProfile?.organization_id || fetchedProfile?.school_id || null;
      setSchoolId(effectiveSchoolId);
      
      // Store schoolId in localStorage for components that need it without context
      if (effectiveSchoolId) {
        localStorage.setItem('schoolId', effectiveSchoolId);
      }

      // Determine user role based on profile data
      let role: UserRole = null;
      
      if (fetchedProfile?.user_type === 'school' || fetchedProfile?.is_supervisor) {
        role = fetchedProfile.user_type === 'school' ? 'school' : 'school_admin';
      } else if (fetchedProfile?.user_type === 'teacher') {
        role = 'teacher';
      } else if (fetchedProfile?.user_type === 'student') {
        role = 'student';
      }
      
      // Store determined role in localStorage
      if (role) {
        localStorage.setItem('userRole', role);
      }
      
      // Set user role in context
      setUserRole(role);

      // Set isSuperviser
      const isSupervisor = fetchedProfile?.is_supervisor === true || await checkIfUserIsSchoolAdmin(currentUser.id);
      setIsSuperviser(isSupervisor);
    } catch (error) {
      console.error("Error fetching user profile or determining role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the magic link to sign in.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear all auth-related state
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      
      // Navigate is handled by the component calling this function
    } catch (error) {
      console.error("AuthContext: Error signing out:", error);
      throw error; // Rethrow to allow component to handle the error
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        ...updates,
      });

      if (error) {
        throw error;
      }

      // Optimistically update the profile in the context
      setProfile((prevProfile) => ({ ...prevProfile, ...updates } as Profile));
    } catch (error: any) {
      alert(error.error_description || error.message);
    }
  };
  
  const refreshProfile = async () => {
    if (!user) {
      return;
    }
    
    try {
      await fetchUserProfile(user);
    } catch (error) {
      console.error("AuthContext: Error refreshing user profile:", error);
    }
  };
  
  const setTestUser = async (accountType: "school" | "teacher" | "student", schoolIndex: number = 0) => {
    try {
      // Log out any existing user first
      await supabase.auth.signOut();
      
      // Set up mock data
      const mockUserData = {
        id: `test-${accountType}-${Date.now()}`,
        email: `${accountType}.test@learnable.edu`,
        user_metadata: { 
          full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`,
          user_type: accountType
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      
      const mockUser = mockUserData as unknown as User;
      
      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: mockUser.user_metadata.full_name,
        user_type: accountType,
        email: mockUser.email,
        is_supervisor: accountType === "school",
        organization_id: `school-org-${schoolIndex}`,
        organization: {
          id: `school-org-${schoolIndex}`,
          name: `Test School ${schoolIndex}`,
          code: `TEST${schoolIndex}`
        },
        school_id: `school-org-${schoolIndex}`,
        school_name: `Test School ${schoolIndex}`,
        is_active: true
      };
      
      // Update context state
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType as UserRole);
      setIsSuperviser(accountType === "school");
      setSchoolId(mockProfile.organization_id || null);
      
      // Create a mock session
      const mockSession = {
        provider_token: null,
        provider_refresh_token: null,
        access_token: `mock-token-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      } as Session;
      
      setSession(mockSession);
      
    } catch (error) {
      console.error("Error setting test user:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    isSuperviser,
    schoolId,
    isLoading,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    setTestUser,
    signUp
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
