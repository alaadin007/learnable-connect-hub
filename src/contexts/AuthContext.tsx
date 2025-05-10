
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserType } from '@/types/profile';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/components/auth/ProtectedRoute';
import { toast } from 'sonner';

interface AuthContextType {
  user: any;
  profile: Profile | null;
  userRole: UserRole | null;
  isSupervisor: boolean;
  isLoading: boolean;  // backward compatibility
  loading: boolean;    // alternative loading property
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setTestUser?: (user: { email: string; password: string; role: string }) => void;
  schoolId: string | undefined;
  session: any; // authentication session data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State declarations
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false to avoid initial loading state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [testUser, setTestUserInternal] = useState<{ email: string; password: string; role: string } | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigate = useNavigate();

  const schoolId = profile?.school_id;

  // Immediate role check for specific email addresses - temporary fix
  const hardcodedRoleCheck = (email: string) => {
    if (email === 'salman.k.786000@gmail.com') {
      return 'school_admin' as UserRole;
    }
    return null;
  };

  // Load initial session and subscribe to auth changes
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log("User session found:", session.user.email);
          setUser(session.user);
          setSessionData(session);
          setIsLoggedIn(true);
          await loadProfile(session.user);
        } else if (testUser) {
          console.log("Test user sign-in:", testUser.email);
          const { data, error } = await supabase.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
          });

          if (error) {
            console.error('Test user sign-in error:', error);
            return;
          }

          setUser(data.user);
          setSessionData(data.session);
          setIsLoggedIn(true);
          await loadProfile(data.user);
        }
      } catch (error) {
        console.error("Session loading error:", error);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email);
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setSessionData(session);
        setIsLoggedIn(true);
        await loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setIsSupervisor(false);
        setSessionData(null);
        setIsLoggedIn(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSessionData(session);
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [testUser]);

  const loadProfile = async (currentUser: any) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      // Check for hardcoded role override
      const hardcodedRole = hardcodedRoleCheck(currentUser.email);

      if (profileData) {
        // Ensure user_type is a valid UserType or undefined
        let userTypeValue = profileData.user_type as UserType | undefined;
        
        // Override with hardcoded role if it exists
        if (hardcodedRole) {
          userTypeValue = hardcodedRole;
          
          // Update the database with the correct role - this fixes the issue permanently
          if (currentUser.email === 'salman.k.786000@gmail.com') {
            await supabase
              .from('profiles')
              .update({ user_type: 'school_admin' })
              .eq('id', currentUser.id);

            // Also update user's role in roles table
            await supabase.rpc('assign_role', { 
              user_id_param: currentUser.id, 
              role_param: 'school_admin' 
            });
          }
        }
        
        const typedRole = userTypeValue as UserRole | null;

        let processedOrg: { id: string; name?: string; code?: string } | undefined;

        if (profileData.organization) {
          if (typeof profileData.organization === 'object' && !Array.isArray(profileData.organization)) {
            const org = profileData.organization as any;
            processedOrg = {
              id: org.id || profileData.school_id || '',
              name: org.name || profileData.school_name,
              code: org.code || profileData.school_code,
            };
          } else if (profileData.school_id) {
            processedOrg = {
              id: profileData.school_id,
              name: profileData.school_name,
              code: profileData.school_code,
            };
          }
        } else if (profileData.school_id) {
          processedOrg = {
            id: profileData.school_id,
            name: profileData.school_name,
            code: profileData.school_code,
          };
        }

        const processedProfile: Profile = {
          ...profileData,
          organization: processedOrg,
          user_type: userTypeValue,
        };

        setProfile(processedProfile);
        setUserRole(typedRole);
        setIsSupervisor(Boolean(profileData.is_supervisor));

        // Store user role in localStorage for fallback
        try {
          localStorage.setItem('userRole', typedRole || '');
          if (profileData.school_id) {
            localStorage.setItem('schoolId', profileData.school_id);
          }
        } catch (e) {
          console.warn("Could not store user role in localStorage:", e);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Sign-in error:", error);
        setAuthError(error.message);
        return { error };
      }

      setUser(data.user);
      setSessionData(data.session);
      setIsLoggedIn(true);
      await loadProfile(data.user);

      // Let the redirect happen via useEffect in Login component
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected sign-in error:", error);
      setAuthError(error.message || "An unexpected error occurred");
      return { error };
    }
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) {
        console.error("Signup error:", error);
        setAuthError(error.message);
        return { error };
      }

      // For immediate sign-in apps
      if (data.session) {
        setUser(data.user);
        setSessionData(data.session);
        setIsLoggedIn(true);
        await loadProfile(data.user);
      }
      
      return { success: true, session: data.session };
    } catch (error: any) {
      console.error("Unexpected signup error:", error);
      setAuthError(error.message || "An unexpected error occurred");
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign-out error:", error);
        toast.error("Error signing out. Please try again.");
        throw error;
      }

      // Clear all auth state
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setIsSupervisor(false);
      setSessionData(null);
      setIsLoggedIn(false);
      
      // Clear local storage - but keep theme and other preferences
      try {
        localStorage.removeItem('userRole');
        localStorage.removeItem('schoolId');
      } catch (e) {
        console.warn("Could not clear localStorage items:", e);
      }
      
      // Navigate to login page
      navigate('/login');
    } finally {
      // We don't set loading state here to avoid flicker
    }
  };

  // No loading state in updateProfile to avoid UI flicker
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }

      // Ensure user_type is a valid UserType or undefined
      const userTypeValue = data.user_type as UserType | undefined;

      let processedOrg: { id: string; name?: string; code?: string } | undefined;

      if (data.organization) {
        if (typeof data.organization === 'object' && !Array.isArray(data.organization)) {
          const org = data.organization as any;
          processedOrg = {
            id: org.id || data.school_id || '',
            name: org.name || data.school_name,
            code: org.code || data.school_code,
          };
        } else if (data.school_id) {
          processedOrg = {
            id: data.school_id,
            name: data.school_name,
            code: data.school_code,
          };
        }
      } else if (data.school_id) {
        processedOrg = {
          id: data.school_id,
          name: data.school_name,
          code: data.school_code,
        };
      }

      const processedProfile: Profile = {
        ...data,
        organization: processedOrg,
        user_type: userTypeValue,
      };

      setProfile(processedProfile);
    }
  };

  const setTestUser = (user: { email: string; password: string; role: string }) => {
    setTestUserInternal(user);
  };

  const value: AuthContextType = {
    user,
    profile,
    userRole,
    isSupervisor,
    isLoading,
    loading: isLoading, // alias for backward compatibility
    isLoggedIn,
    signIn,
    signUp,
    signOut,
    updateProfile,
    setTestUser,
    schoolId,
    session: sessionData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
