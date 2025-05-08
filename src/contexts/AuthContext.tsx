
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type UserRole = 'student' | 'teacher' | 'school' | null;

interface ProfileData {
  id: string;
  full_name: string | null;
  user_type: UserRole;
  school_id?: string;
  organization?: {
    id: string;
    name: string;
  } | null;
}

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  schoolId: string | null;
  profile: ProfileData | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData?: any) => Promise<any>; // Added signUp function
  signOut: () => Promise<void>;
  setTestUser: (userType: 'school' | 'teacher' | 'student') => Promise<User | null>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Added refreshProfile function
  isSupervisor: boolean; // Added isSupervisor property
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          await handleAuthChange(currentSession);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed, event:", _event);
        await handleAuthChange(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle auth changes
  const handleAuthChange = async (session: Session | null) => {
    setSession(session);
    
    if (session?.user) {
      setUser(session.user);
      console.log("User authenticated:", session.user.id);
      
      // Check if we're using test accounts
      const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
      const testAccountType = localStorage.getItem('testAccountType') as UserRole;
      
      if (usingTestAccount && testAccountType) {
        console.log("Using test account type:", testAccountType);
        setUserRole(testAccountType);
        
        // Set a mock school ID for test accounts
        setSchoolId('00000000-0000-0000-0000-000000000000');
        
        // Set a mock profile for test accounts
        setProfile({
          id: session.user.id,
          full_name: `Test ${testAccountType.charAt(0).toUpperCase() + testAccountType.slice(1)}`,
          user_type: testAccountType,
          organization: testAccountType === 'school' ? {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Test School'
          } : null
        });
        
        // Set supervisor status for test school accounts
        setIsSupervisor(testAccountType === 'school');
      } else {
        // Get user profile data
        await fetchUserProfile(session.user.id);
      }
    } else {
      // Reset state when user is signed out
      setUser(null);
      setUserRole(null);
      setSchoolId(null);
      setProfile(null);
      setIsSupervisor(false);
    }
  };

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          user_type,
          school_id
        `)
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      if (profileData) {
        // Normalize user_type from older values
        let normalizedUserType: UserRole = null;
        if (profileData.user_type === 'school_admin') {
          normalizedUserType = 'school';
        } else if (profileData.user_type === 'teacher_supervisor') {
          normalizedUserType = 'teacher';
        } else if (['school', 'teacher', 'student'].includes(profileData.user_type)) {
          normalizedUserType = profileData.user_type as UserRole;
        }

        setUserRole(normalizedUserType);
        
        // Set school ID from profile
        setSchoolId(profileData.school_id);

        // If user is school admin, get school details
        if (normalizedUserType === 'school' && profileData.school_id) {
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name')
            .eq('id', profileData.school_id)
            .single();

          if (!schoolError && schoolData) {
            setProfile({
              ...profileData,
              user_type: normalizedUserType,
              organization: {
                id: schoolData.id,
                name: schoolData.name
              }
            });
          } else {
            setProfile({
              ...profileData,
              user_type: normalizedUserType
            });
          }
          
          // Set supervisor status for school admin
          setIsSupervisor(true);
        } else if (normalizedUserType === 'teacher' && profileData.school_id) {
          // Check if teacher is a supervisor
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select('is_supervisor')
            .eq('id', userId)
            .single();
            
          if (!teacherError && teacherData) {
            setIsSupervisor(teacherData.is_supervisor || false);
          }
          
          setProfile({
            ...profileData,
            user_type: normalizedUserType
          });
        } else {
          setProfile({
            ...profileData,
            user_type: normalizedUserType
          });
          
          // Non-school users are not supervisors by default
          setIsSupervisor(false);
        }
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
    }
  };

  // Refresh user profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  // Sign in a user with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  };
  
  // Sign up a new user
  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Sign out a user
  const signOut = async () => {
    try {
      // Clear test account state
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setSchoolId(null);
      setProfile(null);
      setIsSupervisor(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // For testing: set a mock user
  const setTestUser = async (userType: 'school' | 'teacher' | 'student'): Promise<User | null> => {
    try {
      // Create a mock user based on type
      const mockEmail = `${userType}.test@learnable.edu`;
      const mockName = `Test ${userType.charAt(0).toUpperCase() + userType.slice(1)}`;
      
      // Sign in with the test account
      const { data, error } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: 'password123'
      });

      if (error) {
        console.log("Test user login failed, attempting anonymous session");
        
        // For demo purposes, create a mock session if auth fails
        // Cast to User type using 'as User'
        const mockUser = {
          id: `test-${userType}-${Date.now()}`,
          email: mockEmail,
          user_metadata: {
            full_name: mockName,
            user_type: userType
          }
        } as unknown as User; // Cast to unknown first, then to User

        setUser(mockUser);
        setUserRole(userType);
        
        // Set test account flags
        localStorage.setItem('usingTestAccount', 'true');
        localStorage.setItem('testAccountType', userType);

        // Set mock profile
        setProfile({
          id: mockUser.id,
          full_name: mockName,
          user_type: userType,
          organization: userType === 'school' ? {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Test School'
          } : null
        });
        
        // Set mock school ID
        setSchoolId('00000000-0000-0000-0000-000000000000');
        
        // Set supervisor status for school accounts
        setIsSupervisor(userType === 'school');
        
        return mockUser;
      }

      // Set test account flags
      localStorage.setItem('usingTestAccount', 'true');
      localStorage.setItem('testAccountType', userType);

      console.log("Test user created successfully:", data.user);
      return data.user;
    } catch (error) {
      console.error("Error setting test user:", error);
      return null;
    }
  };

  // Force refresh the session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }

      if (data.session) {
        await handleAuthChange(data.session);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  const authValues: AuthContextProps = {
    user,
    session,
    userRole,
    schoolId,
    profile,
    isLoading,
    signIn,
    signUp, // Added signUp function
    signOut,
    setTestUser,
    refreshSession,
    refreshProfile, // Added refreshProfile function
    isSupervisor // Added isSupervisor property
  };

  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};
