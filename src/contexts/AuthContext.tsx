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
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  setTestUser: (userType: 'school' | 'teacher' | 'student') => Promise<User | null>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSupervisor: boolean;
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
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // First set up the auth listener
        const { data } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            console.log("Auth state changed, event:", _event);
            setSession(newSession);
            setUser(newSession?.user || null);
            
            // Check if we're using test accounts
            const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
            const testAccountType = localStorage.getItem('testAccountType') as UserRole;
            
            if (newSession?.user) {
              if (usingTestAccount && testAccountType) {
                console.log("Auth state change: Using test account type:", testAccountType);
                setUserRole(testAccountType);
                setSchoolId('00000000-0000-0000-0000-000000000000');
                setProfile({
                  id: newSession.user.id,
                  full_name: `Test ${testAccountType.charAt(0).toUpperCase() + testAccountType.slice(1)}`,
                  user_type: testAccountType,
                  organization: testAccountType === 'school' ? {
                    id: '00000000-0000-0000-0000-000000000000',
                    name: 'Test School'
                  } : null
                });
                setIsSupervisor(testAccountType === 'school');
              } else {
                // Use setTimeout to avoid potential deadlock with Supabase auth
                setTimeout(() => {
                  fetchUserProfile(newSession.user.id);
                }, 0);
              }
            } else {
              // Clear user data on sign out
              setUserRole(null);
              setSchoolId(null);
              setProfile(null);
              setIsSupervisor(false);
            }
          }
        );
        
        authSubscription = data.subscription;

        // After setting up the listener, check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Update session state immediately
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Check if we're using test accounts
        const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
        const testAccountType = localStorage.getItem('testAccountType') as UserRole;
        
        if (currentSession?.user) {
          if (usingTestAccount && testAccountType) {
            console.log("Init: Using test account type:", testAccountType);
            setUserRole(testAccountType);
            setSchoolId('00000000-0000-0000-0000-000000000000');
            setProfile({
              id: currentSession.user.id,
              full_name: `Test ${testAccountType.charAt(0).toUpperCase() + testAccountType.slice(1)}`,
              user_type: testAccountType,
              organization: testAccountType === 'school' ? {
                id: '00000000-0000-0000-0000-000000000000',
                name: 'Test School'
              } : null
            });
            setIsSupervisor(testAccountType === 'school');
          } else {
            await fetchUserProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Fetch user profile data with improved error handling
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      
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
        toast.error("Could not fetch your profile data");
        return;
      }

      if (!profileData) {
        console.error("No profile found for user:", userId);
        toast.error("Your profile data was not found");
        return;
      }

      console.log("Fetched profile:", profileData);
      
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
      setSchoolId(profileData.school_id || null);

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
          
          if (schoolError) {
            console.error("Error fetching school data:", schoolError);
          }
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
        } else if (teacherError) {
          console.error("Error checking if teacher is supervisor:", teacherError);
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
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      toast.error("Failed to load profile data");
    }
  };

  // Refresh user profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  // Sign in a user with email and password - improved error handling
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Signing in with email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }

      // Check if email is verified
      if (data.user?.confirmed_at === null) {
        toast.warning("Your email is not verified. Please check your inbox.");
      }

      return data;
    } catch (error: any) {
      console.error("Sign in error:", error);
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
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out");
        throw error;
      }
      
      // Reset state when user signs out
      setUser(null);
      setSession(null);
      setUserRole(null);
      setSchoolId(null);
      setProfile(null);
      setIsSupervisor(false);
      
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
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
        const mockUser = {
          id: `test-${userType}-${Date.now()}`,
          email: mockEmail,
          user_metadata: {
            full_name: mockName,
            user_type: userType
          }
        } as unknown as User; 

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
        console.error("Error refreshing session:", error);
        toast.error("Failed to refresh session");
        throw error;
      }

      if (data.session) {
        // Update session and user state immediately
        setSession(data.session);
        setUser(data.session.user);
        
        // Check if we're using test accounts
        const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
        const testAccountType = localStorage.getItem('testAccountType') as UserRole;
        
        if (usingTestAccount && testAccountType) {
          setUserRole(testAccountType);
          
          // Set a mock school ID for test accounts
          setSchoolId('00000000-0000-0000-0000-000000000000');
          
          // Set a mock profile for test accounts
          setProfile({
            id: data.session.user.id,
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
          await fetchUserProfile(data.session.user.id);
        }
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      toast.error("Failed to refresh session");
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
    signUp,
    signOut,
    setTestUser,
    refreshSession,
    refreshProfile,
    isSupervisor
  };

  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};
