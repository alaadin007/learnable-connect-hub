import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { checkIfSchoolAdmin, getUserRoleWithFallback } from '@/utils/apiHelpers';

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
  // Add missing properties
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
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  // Add missing properties to default context
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

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);

        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user);
        }
      } catch (error) {
        console.error("Session load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user);
        } else {
          setProfile(null);
          setUserRole(null);
          setIsSuperviser(false);
          setSchoolId(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (currentUser: User) => {
    setIsLoading(true);
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Fallback to checking if user is a school admin
        const isAdmin = await checkIfSchoolAdmin(currentUser.id);
        setIsSuperviser(isAdmin);
      }

      // Fix for TS2322 error by explicitly converting the profileData to Profile type
      const fetchedProfile: Profile | null = profileData ? {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        user_type: profileData.user_type,
        is_supervisor: profileData.is_supervisor,
        organization_id: profileData.school_id, // Using school_id as organization_id
        school_id: profileData.school_id,
        school_code: profileData.school_code,
        school_name: profileData.school_name,
        is_active: profileData.is_active,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        // Convert the organization from Json to expected format
        organization: typeof profileData.organization === 'object' && profileData.organization !== null ? 
          {
            id: (profileData.organization as Record<string, any>)?.id,
            name: (profileData.organization as Record<string, any>)?.name,
            code: (profileData.organization as Record<string, any>)?.code
          } : 
          undefined
      } : null;
      
      setProfile(fetchedProfile);

      // Set school ID from profile or null
      setSchoolId(fetchedProfile?.organization_id || fetchedProfile?.school_id || null);

      // Determine user role
      const role = await getUserRoleWithFallback(currentUser);
      // Fix type issue here - convert string to UserRole type using type assertion
      setUserRole(role as UserRole);

      // Set isSuperviser based on profile or fallback
      setIsSuperviser(fetchedProfile?.is_supervisor === true || await checkIfSchoolAdmin(currentUser.id));
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
      
      console.log("User successfully signed out");
      
      // Navigate is handled by the component calling this function
    } catch (error) {
      console.error("Error signing out:", error);
      throw error; // Rethrow to allow component to handle the error
    }
  };

  const updateProfile = async (updates: any) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Add the missing functions that cause TypeScript errors
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      await fetchUserProfile(user);
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const setTestUser = async (accountType: "school" | "teacher" | "student", schoolIndex: number = 0) => {
    try {
      // Log out any existing user first
      await supabase.auth.signOut();
      
      // For test accounts, we'll set up mock data
      // Fix TS2352 error by first defining a partial mock object and then casting it as any then User
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
        organization_id: accountType === "school" ? `school-org-${schoolIndex}` : `school-org-0`,
        organization: {
          id: accountType === "school" ? `school-org-${schoolIndex}` : `school-org-0`,
          name: `Test School ${schoolIndex}`,
          code: `TEST${schoolIndex}` // Adding code property for SchoolAdmin component
        },
        school_name: `Test School ${schoolIndex}` // Adding school_name for SchoolAdmin component
      };
      
      // Update context state
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(accountType as UserRole);
      setIsSuperviser(accountType === "school");
      setSchoolId(mockProfile.organization_id || null);
      
      console.log(`Set test user: ${accountType}`, mockUser, mockProfile);
    } catch (error) {
      console.error("Error setting test user:", error);
      throw error;
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
