
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
      .single();
    
    if (teacherData?.school_id) {
      return teacherData.school_id;
    }
    
    // If not found in teachers, check students table
    const { data: studentData } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', session.user.id)
      .single();
    
    if (studentData?.school_id) {
      return studentData.school_id;
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
    
    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
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
      console.error(`Error invoking edge function ${functionName}:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception invoking edge function ${functionName}:`, error);
    return { data: null, error };
  }
}

// These functions are being kept as fallbacks during transition, but they should 
// eventually be removed since we're removing localStorage
export function getUserRoleWithFallback(): UserRole | null {
  return null;
}

export function getSchoolIdWithFallback(): string | null {
  return null;
}
