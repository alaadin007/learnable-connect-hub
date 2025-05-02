
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
  setTestUser: (type: 'school' | 'teacher' | 'student', schoolIndex?: number) => Promise<void>;
}

// Create mock user data for test accounts
const createTestUserData = (type: 'school' | 'teacher' | 'student', schoolIndex: number = 0): { user: User, profile: UserProfile } => {
  const mockId = `test-${type}-${Date.now()}`;
  const isSecondSchool = schoolIndex > 0;
  const schoolName = isSecondSchool ? 'Second Test School' : 'Test School';
  const schoolCode = isSecondSchool ? 'SECONDTEST' : TEST_SCHOOL_CODE;
  const emailDomain = isSecondSchool ? 'secondschool.edu' : 'testschool.edu';
  
  const mockProfile: UserProfile = {
    id: mockId,
    user_type: type,
    full_name: type === 'school' ? 'School Admin' : type === 'teacher' ? 'Test Teacher' : 'Test Student',
    school_code: type === 'school' ? null : schoolCode,
    school_name: schoolName,
    school_id: null,
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
    email: `${type === 'school' ? 'admin' : type}@${emailDomain}`,
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
  const setTestUser = async (type: 'school' | 'teacher' | 'student', schoolIndex: number = 0) => {
    try {
      // Create mock user and profile data
      const { user: mockUser, profile: mockProfile } = createTestUserData(type, schoolIndex);
      
      // Set user data in state
      setUser(mockUser);
      setProfile(mockProfile);
      setUserRole(type);
      
      // Set supervisor status based on role
      setIsSuperviser(type === 'school');
      
      // Create a mock school ID for this session
      const mockSchoolId = type === 'school' ? mockUser.id : `test-school-id-${schoolIndex}`;
      setSchoolId(mockSchoolId);
      
      // Ensure the mock profile has a school_id property
      mockProfile.school_id = mockSchoolId;
      
      // Store test user data in session storage
      sessionStorage.setItem('testUserType', type);
      sessionStorage.setItem('testSchoolIndex', schoolIndex.toString());
      
      // Also store the user and profile data for session logging functionality
      sessionStorage.setItem('testUser', JSON.stringify(mockUser));
      sessionStorage.setItem('testProfile', JSON.stringify(mockProfile));
      sessionStorage.setItem('testSchoolId', mockSchoolId);
      
      // Generate mock session data for analytics and recent conversations for the interface
      if (type === 'student' || type === 'school') {
        // Import dynamically to avoid circular dependencies
        const { populateTestAccountWithSessions } = await import('@/utils/sessionLogging');
        
        // Create mock session data and conversations
        await populateTestAccountWithSessions(mockUser.id, mockSchoolId, type === 'school' ? 5 : 10);
        
        // Generate mock conversations with metadata for the test user
        await generateMockConversations(mockUser.id, mockSchoolId);
      }
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error setting test user:", error.message);
      toast.error("Failed to set test user");
      throw error;
    }
  };
  
  // Helper function to generate mock conversations with metadata
  const generateMockConversations = async (userId: string, schoolId: string) => {
    try {
      // Generate 5 conversations with rich metadata for test accounts
      const mockTopics = [
        "Algebra equations",
        "World War II", 
        "Chemical reactions",
        "Shakespeare's Macbeth",
        "Programming basics"
      ];
      
      const mockCategories = ["Homework", "Exam Prep", "Research", "Project", "General Question"];
      
      const now = new Date();
      
      for (let i = 0; i < 5; i++) {
        const topic = mockTopics[i];
        const category = mockCategories[i];
        const summary = `Study session about ${topic} focused on ${Math.random() > 0.5 ? 'understanding concepts' : 'solving problems'}`;
        const tags = [topic.split(' ')[0].toLowerCase(), topic.split(' ')[1].toLowerCase(), category.toLowerCase()];
        
        // Create conversation with metadata
        const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)).toISOString();
        
        const { data: convo, error: convoError } = await supabase.from('conversations').insert({
          user_id: userId,
          school_id: schoolId,
          topic,
          title: `${topic} study session`,
          summary,
          category,
          tags,
          starred: i === 0 || i === 2, // Star a couple of conversations
          last_message_at: timestamp,
          created_at: timestamp
        }).select().single();
        
        if (convoError) {
          console.error("Error creating mock conversation:", convoError);
          continue;
        }
        
        // Create mock messages
        if (convo) {
          const messageContents = [
            { sender: 'user', content: `Hi, I need help with ${topic}.` },
            { sender: 'assistant', content: `I'd be happy to help you with ${topic}. What specific aspect are you struggling with?` },
            { sender: 'user', content: `I'm having trouble understanding the core concepts.` },
            { sender: 'assistant', content: `Let me explain the key principles of ${topic} in a simple way...` }
          ];
          
          for (const message of messageContents) {
            await supabase.from('messages').insert({
              conversation_id: convo.id,
              sender: message.sender,
              content: message.content,
              timestamp: timestamp
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating mock conversations:", error);
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
        
        // Determine if it's for second school
        const isSecondSchool = email.includes('secondschool.edu');
        const schoolIndex = isSecondSchool ? 1 : 0;
        
        // Use our test user function instead
        await setTestUser(userType as 'school' | 'teacher' | 'student', schoolIndex);
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
        sessionStorage.removeItem('testSchoolIndex');
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
          // Get school index from session storage if available
          const schoolIndex = parseInt(sessionStorage.getItem('testSchoolIndex') || '0', 10);
          
          // Restore the test user session
          const { user: mockUser, profile: mockProfile } = createTestUserData(testUserType, schoolIndex);
          setUser(mockUser);
          setProfile(mockProfile);
          setUserRole(testUserType);
          setIsSuperviser(testUserType === 'school');
          setSchoolId(testUserType === 'school' ? mockUser.id : `test-school-id-${schoolIndex}`);
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
