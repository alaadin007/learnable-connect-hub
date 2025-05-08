
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isTestAccount } from '@/integrations/supabase/client';
import { getUserProfileSafely } from '@/utils/supabaseHelpers';
import { toast } from 'sonner';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  userRole: string | null;
  schoolId: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Function to fetch user profile with error handling
  const fetchProfile = async (userId: string) => {
    try {
      const profileData = await getUserProfileSafely(userId);
      
      if (profileData && !profileData.error) {
        console.log("Profile data fetched:", profileData);
        setProfile(profileData);
        setUserRole(profileData.user_type || null);
        setSchoolId(profileData.school_id || null);
        return profileData;
      } else {
        console.error("Error fetching profile:", profileData?.error);
        // For test accounts, we'll be more forgiving about profile errors
        if (user?.email && isTestAccount(user.email)) {
          // Assume test accounts are students by default
          const testProfile = {
            id: userId,
            user_type: 'student',
            full_name: user.user_metadata?.full_name || 'Test User',
            email: user.email,
            school_id: null
          };
          setProfile(testProfile);
          setUserRole('student');
          setSchoolId(null);
          return testProfile;
        }
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  };

  // Function to refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  // Handle auth state changes
  useEffect(() => {
    setIsLoading(true);

    // Fetch initial session
    const setupAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch profile after getting session
          await fetchProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error setting up auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setupAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("AuthContext: Auth state change event:", event);
        
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUserRole(null);
          setSchoolId(null);
        }
        
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setSchoolId(null);
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    userRole,
    schoolId,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
