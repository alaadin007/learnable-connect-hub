
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
  isLoading: true,
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
    console.log("AuthContext: Starting auth initialization");
    setIsLoading(true);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("AuthContext: Auth state change event:", event);
        
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
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const checkSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      console.log("AuthContext: Initial session check:", initialSession ? "Session exists" : "No session");
      
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user);
      } else {
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Modified function to avoid infinite recursion
  const checkIfUserIsSchoolAdmin = async (userId: string): Promise<boolean> => {
    try {
      // Direct database query instead of RPC to avoid recursion
      const { data, error } = await supabase
        .from('school_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking if user is school admin:", error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error("Exception checking if user is school admin:", error);
      return false;
    }
  };

  const fetchUserProfile = async (currentUser: User) => {
    console.log("AuthContext: Fetching user profile for:", currentUser.id);
    try {
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
      
      console.log("AuthContext: Fetched profile:", fetchedProfile);
      setProfile(fetchedProfile);

      // Set school ID
      setSchoolId(fetchedProfile?.organization_id || fetchedProfile?.school_id || null);

      // Determine user role
      const role = await getUserRoleWithFallback(currentUser);
      console.log("AuthContext: User role determined:", role);
      
      // Set user role
      setUserRole(role as UserRole);

      // Set isSuperviser - avoid using checkIfSchoolAdmin and use local function
      setIsSuperviser(fetchedProfile?.is_supervisor === true || await checkIfUserIsSchoolAdmin(currentUser.id));
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
      console.log("AuthContext: Attempting to sign out");
      await supabase.auth.signOut();
      
      // Clear all auth-related state
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      
      console.log("AuthContext: User successfully signed out");
      
      // Navigate is handled by the component calling this function
    } catch (error) {
      console.error("AuthContext: Error signing out:", error);
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
  
  const refreshProfile = async () => {
    if (!user) {
      console.log("AuthContext: Cannot refresh profile - no user");
      return;
    }
    
    try {
      console.log("AuthContext: Refreshing profile for user:", user.id);
      setIsLoading(true);
      await fetchUserProfile(user);
    } catch (error) {
      console.error("AuthContext: Error refreshing user profile:", error);
    } finally {
      setIsLoading(false);
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
        organization_id: accountType === "school" ? `school-org-${schoolIndex}` : `school-org-0`,
        organization: {
          id: accountType === "school" ? `school-org-${schoolIndex}` : `school-org-0`,
          name: `Test School ${schoolIndex}`,
          code: `TEST${schoolIndex}`
        },
        school_name: `Test School ${schoolIndex}`
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
