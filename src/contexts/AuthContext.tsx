
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the UserRole type
export type UserRole = 'school' | 'teacher' | 'student';

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface UserProfile {
  id: string;
  email?: string;
  user_type: UserRole;
  full_name?: string;
  school_code?: string;
  school_name?: string;
  organization?: Organization;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  schoolId: string | null;
  userRole: UserRole | null;
  isSuperviser: boolean;
  loading: boolean;
  setTestUser: (type: 'school' | 'teacher' | 'student', schoolIndex?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signIn: async () => ({}),
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  schoolId: null,
  userRole: null,
  isSuperviser: false,
  loading: true,
  setTestUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSuperviser, setIsSuperviser] = useState(false);

  // Get user role from profile
  const userRole = profile?.user_type as UserRole | null;
  const loading = isLoading;

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
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

      return data as UserProfile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Fetch school ID based on user type
  const fetchSchoolId = async (userId: string, userType: string) => {
    try {
      if (userType === 'teacher' || userType === 'school') {
        const { data, error } = await supabase
          .from('teachers')
          .select('school_id')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching teacher school_id:', error);
          return null;
        }

        return data.school_id;
      } else if (userType === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('school_id')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching student school_id:', error);
          return null;
        }

        return data.school_id;
      }
      return null;
    } catch (error) {
      console.error('Error in fetchSchoolId:', error);
      return null;
    }
  };

  // Check if user is a supervisor
  const fetchIsSupervisor = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('is_supervisor')
        .eq('id', userId)
        .single();

      if (error) {
        return false;
      }

      return !!data.is_supervisor;
    } catch (error) {
      return false;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
      const schoolIdData = await fetchSchoolId(user.id, profileData.user_type);
      setSchoolId(schoolIdData);
      
      if (profileData.user_type === 'teacher' || profileData.user_type === 'school') {
        const isSupervisor = await fetchIsSupervisor(user.id);
        setIsSuperviser(isSupervisor);
      }
    }
  };

  // Set a test user for demo purposes
  const setTestUser = async (type: 'school' | 'teacher' | 'student', schoolIndex: number = 0) => {
    // Create mock profile and session data for test users
    const mockUserId = `test-${type}-${schoolIndex}`;
    const mockSchoolId = `school-${schoolIndex}`;
    const mockSchoolName = schoolIndex === 0 ? 'Test School' : `Test School ${schoolIndex + 1}`;
    
    // Create test user profile
    const testProfile: UserProfile = {
      id: mockUserId,
      user_type: type,
      full_name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      school_code: `TEST${schoolIndex}`,
      school_name: mockSchoolName,
      organization: {
        id: mockSchoolId,
        name: mockSchoolName,
        code: `TEST${schoolIndex}`
      }
    };
    
    // Create mock user - cast as unknown first, then as User to satisfy TypeScript
    const testUser = {
      id: mockUserId,
      email: `${type}.test@example.com`,
      user_metadata: {
        full_name: testProfile.full_name
      }
    } as unknown as User;
    
    // Set state for test user session
    setUser(testUser);
    setProfile(testProfile);
    setSchoolId(mockSchoolId);
    setIsSuperviser(type === 'school');
    
    // Show success message
    toast.success(`Logged in as Test ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Don't fetch profile here, use a setTimeout to avoid race conditions
        if (currentSession?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            if (profileData) {
              setProfile(profileData);
              const schoolIdData = await fetchSchoolId(currentSession.user.id, profileData.user_type);
              setSchoolId(schoolIdData);
              
              if (profileData.user_type === 'teacher' || profileData.user_type === 'school') {
                const isSupervisor = await fetchIsSupervisor(currentSession.user.id);
                setIsSuperviser(isSupervisor);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setSchoolId(null);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfile(currentSession.user.id);
          if (profileData) {
            setProfile(profileData);
            const schoolIdData = await fetchSchoolId(currentSession.user.id, profileData.user_type);
            setSchoolId(schoolIdData);
            
            if (profileData.user_type === 'teacher' || profileData.user_type === 'school') {
              const isSupervisor = await fetchIsSupervisor(currentSession.user.id);
              setIsSuperviser(isSupervisor);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        throw response.error;
      }
      
      return response;
      // Auth state change listener will handle state updates
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        throw error;
      }
      
      // Auth state change listener will handle state updates
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      // Auth state change listener will handle state updates
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        schoolId,
        userRole,
        isSuperviser,
        loading,
        setTestUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
