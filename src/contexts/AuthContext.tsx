
import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase, isTestAccount, TEST_SCHOOL_CODE } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define types for user profiles and roles
export type UserRole = "school" | "teacher" | "student";

// Type for user profile data
export interface UserProfile {
  id: string;
  user_type: UserRole;
  full_name: string | null;
  school_code: string | null;
  school_name: string | null;
  school_id?: string | null; // Added school_id property
  created_at: string;
  updated_at: string;
}

// Type for the auth context value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  userRole: UserRole | null;
  isSuperviser: boolean;
  schoolId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  setTestUser: (type: 'school' | 'teacher' | 'student') => Promise<void>;
}

// Create mock user data for test accounts
const createTestUserData = (type: 'school' | 'teacher' | 'student'): { user: User, profile: UserProfile } => {
  const mockId = `test-${type}-${Date.now()}`;
  
  const mockProfile: UserProfile = {
    id: mockId,
    user_type: type,
    full_name: type === 'school' ? 'School Admin' : type === 'teacher' ? 'Test Teacher' : 'Test Student',
    school_code: type === 'school' ? null : TEST_SCHOOL_CODE,
    school_name: 'Test School',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const mockUser: User = {
    id: mockId,
    app_metadata: {},
    user_metadata: {
      user_type: type,
      full_name: mockProfile.full_name,
      school_code: mockProfile.school_code,
      school_name: mockProfile.school_name
    },
    aud: 'authenticated',
    created_at: mockProfile.created_at,
    email: `${type}@testschool.edu`,
    role: 'authenticated',
    updated_at: mockProfile.updated_at,
    phone: '',
    last_sign_in_at: mockProfile.created_at,
    confirmed_at: mockProfile.created_at,
    email_confirmed_at: mockProfile.created_at,
    phone_confirmed_at: null,
    factors: null,
    identities: []
  };
  
  return { user: mockUser, profile: mockProfile };
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperviser, setIsSuperviser] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Function to set a test user without authentication
  const setTestUser = async (type: 'school' | 'teacher' | 'student') => {
  try {
    // Create mock user and profile data
    const { user: mockUser, profile: mockProfile } = createTestUserData(type);
    
    // Set user data in state
    setUser(mockUser);
    setProfile(mockProfile);
    setUserRole(type);
    
    // Set supervisor status based on role
    setIsSuperviser(type === 'school');
    
    // Create a mock school ID for this session
    const mockSchoolId = type === 'school' ? mockUser.id : 'test-school-id';
    setSchoolId(mockSchoolId);
    
    // Store test user data in session storage
    sessionStorage.setItem('testUserType', type);
    
    // Also store the user and profile data for session logging functionality
    sessionStorage.setItem('testUser', JSON.stringify(mockUser));
    sessionStorage.setItem('testProfile', JSON.stringify(mockProfile));
    sessionStorage.setItem('testSchoolId', mockSchoolId);
    
    // Generate mock session data for analytics
    if (type === 'school') {
      // Import dynamically to avoid circular dependencies
      const { populateTestAccountWithSessions } = await import('@/utils/sessionLogging');
      
      // For school admin, create mock data for multiple students
      const studentCount = 10;
      for (let i = 0; i < studentCount; i++) {
        const studentId = `test-student-${i}-${Date.now()}`;
        await populateTestAccountWithSessions(studentId, mockSchoolId, 10);
      }
    }
    
    toast.success(`Logged in as Test ${type === 'school' ? 'School Admin' : type === 'teacher' ? 'Teacher' : 'Student'}`);
    navigate("/dashboard");
  } catch (error: any) {
    console.error("Error setting test user:", error.message);
    toast.error("Failed to set test user");
  }
};

  // Function to handle sign-in
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email);
      
      // Check if this is a test account
      if (isTestAccount(email)) {
        // Extract user type from email
        const type = email.split('@')[0] as 'admin' | 'teacher' | 'student';
        const userType = type === 'admin' ? 'school' : type;
        
        // Use our test user function instead
        await setTestUser(userType as 'school' | 'teacher' | 'student');
        return;
      }
      
      // Normal sign-in for real users
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      toast.success("Signed in successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      throw error;
    }
  };

  // Function to handle sign-up
  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    try {
      // Special handling for test accounts - just use our mock function
      if (isTestAccount(email)) {
        const type = email.split('@')[0];
        const userType = type === 'admin' ? 'school' : type as 'teacher' | 'student';
        await setTestUser(userType as 'school' | 'teacher' | 'student');
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      toast.success("Account created successfully! Please check your email for verification.");
    } catch (error: any) {
      console.error("Registration error:", error.message);
      throw error;
    }
  };

  // Function to handle sign-out
  const signOut = async () => {
    try {
      // Check if this is a test user
      const testUserType = sessionStorage.getItem('testUserType');
      
      if (testUserType) {
        // Just clear the session storage and reset state for test users
        sessionStorage.removeItem('testUserType');
        sessionStorage.removeItem('testUser');
        sessionStorage.removeItem('testProfile');
        sessionStorage.removeItem('testSchoolId');
        sessionStorage.removeItem('activeSessionId');
        
        // Clear all auth state
        setUser(null);
        setSession(null);
        setProfile(null);
        setUserRole(null);
        setIsSuperviser(false);
        setSchoolId(null);
        
        navigate("/test-accounts");
        toast.success("Signed out successfully");
        return;
      }
      
      // Normal sign-out for real users
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth state
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setIsSuperviser(false);
      setSchoolId(null);
      
      navigate("/login");
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error.message);
      toast.error("Failed to sign out");
    }
  };

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      // If it's a test user, no need to refresh from database
      const testUserType = sessionStorage.getItem('testUserType');
      if (testUserType) {
        return;
      }
      
      if (!user) return;

      // Get user profile data for real users
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Type assertion since we know the structure
      setProfile(profileData as UserProfile);
      
      // Set user role
      const userTypeRole = profileData?.user_type as UserRole;
      setUserRole(userTypeRole);

      // Check if user is a supervisor
      const { data: isSupervisorData } = await supabase.rpc("is_supervisor", {
        user_id: user.id
      });
      setIsSuperviser(!!isSupervisorData);

      // Get school ID if available
      const { data: schoolIdData } = await supabase.rpc("get_user_school_id");
      if (schoolIdData) {
        setSchoolId(schoolIdData as string);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Set up auth state listener and check for existing session
  useEffect(() => {
    const setupAuth = async () => {
      setLoading(true);
      
      try {
        // Check for a test user in session storage first
        const testUserType = sessionStorage.getItem('testUserType') as 'school' | 'teacher' | 'student' | null;
        
        if (testUserType) {
          // Restore the test user session
          const { user: mockUser, profile: mockProfile } = createTestUserData(testUserType);
          setUser(mockUser);
          setProfile(mockProfile);
          setUserRole(testUserType);
          setIsSuperviser(testUserType === 'school');
          setSchoolId(testUserType === 'school' ? mockUser.id : 'test-school-id');
          setLoading(false);
          return;
        }
        
        // Handle normal authentication for real users
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        if (initialSession?.user) {
          await refreshUserData();
        }
        
        // Set up auth state change subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session);
            setUser(session?.user || null);
            
            if (session?.user) {
              await refreshUserData();
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth setup error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    setupAuth();
  }, []);

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        userRole,
        isSuperviser,
        schoolId,
        signIn,
        signUp,
        signOut,
        refreshUserData,
        setTestUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook for using the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
