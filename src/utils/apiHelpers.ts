
// Import the necessary utilities
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/AuthContext";

// Function to get user school ID in a safe way
export async function getUserSchoolId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }
    
    // Try to get from teachers table first
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('school_id')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (teacherData?.school_id) {
      return teacherData.school_id;
    }
    
    // If not found in teachers, check students table
    const { data: studentData } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (studentData?.school_id) {
      return studentData.school_id;
    }
    
    // Try profiles table as last resort
    const { data: profileData } = await supabase
      .from('profiles')
      .select('school_id, organization')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (profileData?.school_id) {
      return profileData.school_id;
    }
    
    // Check organization property
    if (profileData?.organization) {
      const org = profileData.organization;
      // Check if organization is an object with an id property
      if (typeof org === 'object' && org !== null && 'id' in org) {
        return String(org.id);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return null;
  }
}

// Function to get current user role
export async function getUserRole(): Promise<UserRole | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }
    
    // Check profiles table for user_type
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .maybeSingle();
      
    if (profileData?.user_type) {
      // Map profile user_type to our UserRole type
      if (profileData.user_type === 'school_admin' || profileData.user_type === 'school') {
        return 'school';
      } else if (profileData.user_type === 'teacher' || profileData.user_type === 'teacher_supervisor') {
        return 'teacher';
      } else if (profileData.user_type === 'student') {
        return 'student';
      }
    }
    
    // Check if user is school admin
    const { data: adminData } = await supabase
      .from('school_admins')
      .select('id')
      .eq('id', session.user.id);
    
    if (adminData && adminData.length > 0) {
      return 'school';
    }
    
    // Check if user is teacher
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', session.user.id);
    
    if (teacherData && teacherData.length > 0) {
      return 'teacher';
    }
    
    // Check if user is student
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('id', session.user.id);
    
    if (studentData && studentData.length > 0) {
      return 'student';
    }
    
    return 'school';
  } catch (error) {
    console.error("Error getting user role:", error);
    return 'school';
  }
}

// Check if a user is a school admin
export function isSchoolAdmin(role: UserRole | null): boolean {
  return role === 'school' || role === 'school_admin';
}

// Generic function to invoke edge functions in a consistent manner
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload || {}
    });
    
    if (error) {
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// These functions are being kept as fallbacks during transition
export function getUserRoleWithFallback(): UserRole | null {
  return 'school';
}

export function getSchoolIdWithFallback(): string | null {
  return null;
}
