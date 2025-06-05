import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserType } from '@/types/profile';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/components/auth/ProtectedRoute';
import { toast } from 'sonner';
import { validateEmail, sanitizeTextInput } from '@/utils/security';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [testUser, setTestUserInternal] = useState<{ email: string; password: string; role: string } | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigate = useNavigate();

  const schoolId = profile?.school_id;

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
      console.log("Loading profile for user:", currentUser.id);
      
      // Use the safe function to get profile data
      const { data: profileData, error } = await supabase.rpc('get_profile_safely', { 
        uid: currentUser.id 
      });

      if (error) {
        console.error("Error fetching profile:", error);
        
        // If the function doesn't exist, fall back to direct query
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.warn("Profile function not available, using direct query");
          
          const { data: directProfile, error: directError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
          if (directError) {
            console.error("Direct profile query also failed:", directError);
            return;
          }
          
          if (directProfile) {
            const processedProfile: Profile = {
              ...directProfile,
              user_type: directProfile.user_type as UserType | undefined,
            };
            setProfile(processedProfile);
            setUserRole(directProfile.user_type as UserRole | null);
          }
        }
        return;
      }

      if (profileData) {
        console.log("Profile loaded successfully:", profileData);
        
        // Parse the JSON response from the function
        const parsedProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        
        const processedProfile: Profile = {
          ...parsedProfile,
          user_type: parsedProfile.user_type as UserType | undefined,
        };

        setProfile(processedProfile);
        setUserRole(parsedProfile.user_type as UserRole | null);
        setIsSupervisor(Boolean(parsedProfile.is_supervisor));

        // Store user role in localStorage for fallback
        try {
          localStorage.setItem('userRole', parsedProfile.user_type || '');
          if (parsedProfile.school_id) {
            localStorage.setItem('schoolId', parsedProfile.school_id);
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
    
    // Security: Validate input
    if (!validateEmail(email)) {
      const error = new Error("Invalid email format");
      setAuthError(error.message);
      return { error };
    }
    
    if (!password || password.length < 6) {
      const error = new Error("Password must be at least 6 characters");
      setAuthError(error.message);
      return { error };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.toLowerCase().trim(), 
        password 
      });

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
    
    // Security: Validate input
    if (!validateEmail(email)) {
      const error = new Error("Invalid email format");
      setAuthError(error.message);
      return { error };
    }
    
    if (!password || password.length < 6) {
      const error = new Error("Password must be at least 6 characters");
      setAuthError(error.message);
      return { error };
    }
    
    // Security: Sanitize metadata
    const sanitizedMetadata = Object.keys(metadata).reduce((acc, key) => {
      if (typeof metadata[key] === 'string') {
        acc[key] = sanitizeTextInput(metadata[key]);
      } else {
        acc[key] = metadata[key];
      }
      return acc;
    }, {} as any);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: sanitizedMetadata },
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
      // Clear local storage items first to ensure they're cleared even if supabase logout fails
      try {
        localStorage.removeItem('userRole');
        localStorage.removeItem('schoolId');
      } catch (e) {
        console.warn("Could not clear localStorage items:", e);
      }
      
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
      
      // Navigate to login page
      navigate('/login');
      
      toast.success("Logged out successfully");
    } catch (error) {
      // We don't set loading state here to avoid flicker
      console.error("Error during sign out:", error);
      toast.error("Failed to sign out properly. Please refresh the page.");
    }
  };

  // No loading state in updateProfile to avoid UI flicker
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    try {
      // Security: Sanitize text inputs in updates
      const sanitizedUpdates = Object.keys(updates).reduce((acc, key) => {
        const value = updates[key as keyof Profile];
        if (typeof value === 'string' && key !== 'id' && key !== 'school_id') {
          acc[key as keyof Profile] = sanitizeTextInput(value) as any;
        } else {
          acc[key as keyof Profile] = value;
        }
        return acc;
      }, {} as Partial<Profile>);

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
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
    } catch (error) {
      console.error("Error updating profile:", error);
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
