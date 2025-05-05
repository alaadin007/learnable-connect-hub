
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/components/auth/types';
import { getProfile } from '@/components/auth/ProfileManagement';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isTestUser: boolean;
  schoolId: string | null;
  userRole: string | null;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<boolean>;
  updateProfile: (updates: { full_name: string; user_type: string; school_code?: string }) => Promise<any>;
  refreshProfile: () => Promise<any>;
  isLoadingProfile: boolean;
  setTestUser?: (accountType: "school" | "teacher" | "student", index?: number, useLoading?: boolean) => Promise<void>;
  isSupervisor?: boolean;
  isLoading?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedSession = localStorage.getItem('supabase.auth.session');
    if (storedSession) {
      const parsedSession = JSON.parse(storedSession);
      setSession(parsedSession);
      setUser(parsedSession?.user || null);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    }).finally(() => {
      setLoading(false);
    });

    supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log(`Auth event: ${event}`);
      setSession(session);
      setUser(session?.user || null);
    });
  }, [navigate]);

  useEffect(() => {
    if (user) {
      if (user.email?.startsWith('test+')) {
        setIsTestUser(true);
      } else {
        setIsTestUser(false);
      }
      refreshProfile();
    } else {
      setProfile(null);
      setSchoolId(null);
      setUserRole(null);
      setIsSupervisor(false);
    }
  }, [user]);

  const refreshProfile = async () => {
    if (!user) {
      console.log("No user to refresh profile for.");
      return null;
    }

    setIsLoadingProfile(true);
    try {
      const fetchedProfile = await getProfile(user.id);
      if (fetchedProfile) {
        setProfile(fetchedProfile);
        setSchoolId(fetchedProfile.organization?.id || fetchedProfile.school_code || null);
        setUserRole(fetchedProfile.user_type);
        
        // Check if user is a supervisor
        if (fetchedProfile.user_type === 'teacher' || fetchedProfile.user_type === 'school') {
          const { data } = await supabase
            .from('teachers')
            .select('is_supervisor')
            .eq('id', user.id)
            .single();
            
          setIsSupervisor(data?.is_supervisor || fetchedProfile.user_type === 'school');
        }
        
        console.log("Profile refreshed successfully", fetchedProfile);
        return fetchedProfile;
      } else {
        console.warn("No profile found, redirecting to register");
        // if (location.pathname !== '/register') {
        //   navigate('/register');
        // }
        return null;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile. Please try again.");
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const setTestUser = async (accountType: "school" | "teacher" | "student", index: number = 0, useLoading: boolean = true) => {
    try {
      if (useLoading) setLoading(true);
      
      // Set test user data
      const testUserId = `test-${accountType}-${index}`;
      localStorage.setItem('testUserRole', accountType);
      localStorage.setItem('testUserIndex', index.toString());
      
      // Skip authentication for test accounts
      console.log(`Setting up test account: ${testUserId}`);
      
      // For test accounts, we manually set up a mock user and profile
      const mockUser = {
        id: testUserId,
        email: `${accountType}.test@learnable.edu`,
        app_metadata: { provider: 'test' },
        user_metadata: { full_name: `Test ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}` }
      } as unknown as User;
      
      setUser(mockUser);
      
      // Get the test user's profile directly
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();
        
      if (profileData) {
        // Add school data
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id, name, code')
          .eq('id', `test-school-${index}`)
          .single();
          
        const enhancedProfile = {
          ...profileData,
          organization: schoolData
        };
        
        setProfile(enhancedProfile);
        setSchoolId(schoolData?.id || null);
        setUserRole(profileData.user_type);
        setIsTestUser(true);
        
        if (profileData.user_type === 'school' || profileData.user_type === 'teacher') {
          setIsSupervisor(profileData.user_type === 'school');
        }
        
        // Redirect to appropriate dashboard
        if (accountType === 'school') {
          navigate('/admin');
        } else if (accountType === 'teacher') {
          navigate('/teacher/analytics');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error("Error setting up test user:", error);
      toast.error("Failed to set up test account");
    } finally {
      if (useLoading) setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name || '',
            user_type: userData.user_type || '',
          }
        }
      });
      if (error) throw error;
      console.log("Signup data", data);
      return data;
    } catch (error: any) {
      console.error("Signup error", error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log("Signin data", data);
      return data;
    } catch (error: any) {
      console.error("Signin error", error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      console.log("Signed out successfully");
      setUser(null);
      setSession(null);
      setProfile(null);
      setSchoolId(null);
      setUserRole(null);
      localStorage.removeItem('supabase.auth.session');
      return true;
    } catch (error: any) {
      console.error("Signout error", error);
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { full_name: string; user_type: string; school_code?: string }) => {
    try {
      setIsLoadingProfile(true);
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
      if (error) throw error;

      console.log("Profile updated successfully", data);
      await refreshProfile(); // Refresh the profile after updating
      return data;
    } catch (error: any) {
      console.error("Profile update error", error);
      toast.error(error.message);
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isTestUser,
    schoolId,
    userRole,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    isLoadingProfile,
    setTestUser,
    isSupervisor,
    isLoading: loading // Alias for loading for compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
