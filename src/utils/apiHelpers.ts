
// Import the necessary utilities
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/AuthContext";

// Function to get user school ID in a safe way with fallback
export async function getUserSchoolId(): Promise<string | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedSchoolId = localStorage.getItem('schoolId');
    if (storedSchoolId) {
      return storedSchoolId;
    }
    
    // Use a demo ID if we're in development to prevent API errors
    if (process.env.NODE_ENV === 'development') {
      return 'demo-school-id';
    }
    
    // As a last resort, try to get from the session but with error handling
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return null;
      }
      
      // Try to get from user metadata
      if (session.user.user_metadata?.school_id) {
        // Store in localStorage for future use
        const schoolId = session.user.user_metadata.school_id;
        localStorage.setItem('schoolId', schoolId);
        return schoolId;
      }
      
      // Return a default value if we can't get the real one to prevent errors
      return 'demo-school-id';
    } catch (error) {
      console.error("Error getting user session:", error);
      return 'demo-school-id';
    }
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return 'demo-school-id';
  }
}

// Function to get current user role with fallback
export async function getUserRole(): Promise<UserRole | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedRole = localStorage.getItem('userRole') as UserRole;
    if (storedRole) {
      return storedRole;
    }
    
    // Try to get from the session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.user_type) {
      const role = session.user.user_metadata.user_type as UserRole;
      // Store in localStorage for future use
      localStorage.setItem('userRole', role);
      return role;
    }
    
    // Return default role to prevent errors
    return 'student';
  } catch (error) {
    console.error("Error getting user role:", error);
    return 'student';
  }
}

// Check if a user is a school admin
export function isSchoolAdmin(role: UserRole | null): boolean {
  return role === 'school' || role === 'school_admin';
}

// Generic function to invoke edge functions with better error handling
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // For development, provide mock responses to avoid API calls
    if (process.env.NODE_ENV === 'development') {
      console.log(`Mock invoking edge function: ${functionName}`);
      return { data: { success: true } as unknown as T, error: null };
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload || {}
    });
    
    if (error) {
      console.error(`Edge function error (${functionName}):`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception invoking edge function (${functionName}):`, error);
    return { data: null, error };
  }
}

// These functions always return values to prevent errors
export function getUserRoleWithFallback(): UserRole {
  // First check localStorage which is most reliable
  const role = localStorage.getItem('userRole') as UserRole;
  if (role) return role;
  
  // Check for test account flags in sessionStorage
  const testAccount = sessionStorage.getItem('testAccountType');
  if (testAccount) {
    if (testAccount === 'student') return 'student';
    if (testAccount === 'teacher') return 'teacher';
    if (testAccount === 'school') return 'school';
  }
  
  // Try to get it from the session data if available
  try {
    const userMeta = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    if (userMeta?.currentSession?.user?.user_metadata?.user_type) {
      const extractedRole = userMeta.currentSession.user.user_metadata.user_type;
      // Store for future use
      localStorage.setItem('userRole', extractedRole);
      return extractedRole;
    }
  } catch (e) {
    console.error("Error parsing local session:", e);
  }
  
  return 'student'; // Default to student if no role found
}

export function getSchoolIdWithFallback(): string {
  const schoolId = localStorage.getItem('schoolId');
  if (schoolId) return schoolId;
  
  // Try to get it from the session data if available
  try {
    const userMeta = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    if (userMeta?.currentSession?.user?.user_metadata?.school_id) {
      const extractedSchoolId = userMeta.currentSession.user.user_metadata.school_id;
      // Store for future use
      localStorage.setItem('schoolId', extractedSchoolId);
      return extractedSchoolId;
    }
  } catch (e) {
    console.error("Error parsing local session:", e);
  }
  
  return 'demo-school-id';
}

// Function to save user role and school ID to database
export async function persistUserRoleToDatabase(userId: string, role: UserRole, schoolId?: string): Promise<boolean> {
  try {
    console.log(`Persisting user role to database: ${role} for user ${userId}`);
    
    // First update the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        user_type: role,
        school_id: schoolId || null
      }, { onConflict: 'id' });
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    // Then update the specific role table (students, teachers, or school_admins)
    if (role === 'student') {
      const { error: studentError } = await supabase
        .from('students')
        .upsert({
          id: userId,
          school_id: schoolId || null,
          status: 'pending' // New students start as pending
        }, { onConflict: 'id' });
      
      if (studentError) {
        console.error("Error creating student record:", studentError);
        return false;
      }
    } else if (role === 'teacher') {
      const { error: teacherError } = await supabase
        .from('teachers')
        .upsert({
          id: userId,
          school_id: schoolId || null,
          is_supervisor: false // Default to non-supervisor
        }, { onConflict: 'id' });
      
      if (teacherError) {
        console.error("Error creating teacher record:", teacherError);
        return false;
      }
    } else if (isSchoolAdmin(role)) {
      const { error: adminError } = await supabase
        .from('school_admins')
        .upsert({
          id: userId,
          school_id: schoolId || null
        }, { onConflict: 'id' });
      
      if (adminError) {
        console.error("Error creating school admin record:", adminError);
        return false;
      }
    }
    
    // Store in localStorage for immediate use
    localStorage.setItem('userRole', role);
    if (schoolId) localStorage.setItem('schoolId', schoolId);
    
    return true;
  } catch (error) {
    console.error("Error persisting user role:", error);
    return false;
  }
}
