
// Import the necessary utilities
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/AuthContext";

// Function to get user school ID in a safe way
export async function getUserSchoolId(): Promise<string | null> {
  try {
    console.log("Getting user school ID");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn("No session or user found when getting school ID");
      return null;
    }
    
    console.log("Found user session, checking for school ID");
    
    // Try to get from teachers table first
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('school_id')
      .eq('id', session.user.id)
      .single();
    
    if (teacherError) {
      console.log("Not found in teachers table or error:", teacherError);
    }
    
    if (teacherData?.school_id) {
      console.log("Found school ID in teachers table:", teacherData.school_id);
      return teacherData.school_id;
    }
    
    // If not found in teachers, check students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', session.user.id)
      .single();
    
    if (studentError) {
      console.log("Not found in students table or error:", studentError);
    }
    
    if (studentData?.school_id) {
      console.log("Found school ID in students table:", studentData.school_id);
      return studentData.school_id;
    }
    
    // Try profiles table as last resort
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, organization')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.log("Not found in profiles table or error:", profileError);
    }
    
    if (profileData?.school_id) {
      console.log("Found school ID in profiles table:", profileData.school_id);
      return profileData.school_id;
    }
    
    // Fixed TypeScript errors by safely checking organization properties
    if (profileData?.organization) {
      const org = profileData.organization;
      // Check if organization is an object with an id property
      if (typeof org === 'object' && org !== null && 'id' in org) {
        console.log("Found school ID in organization data:", org.id);
        return String(org.id);
      }
    }
    
    console.warn("No school ID found for user");
    return null;
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return null;
  }
}

// Function to get current user role
export async function getUserRole(): Promise<UserRole | null> {
  try {
    console.log("Getting user role");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn("No session or user found when getting user role");
      return null;
    }
    
    console.log("Found user session, checking for role");
    
    // Check if user is school admin
    const { data: adminData, error: adminError } = await supabase
      .from('school_admins')
      .select('id')
      .eq('id', session.user.id);
    
    if (adminError) {
      console.log("Error checking school_admins table:", adminError);
    }
    
    if (adminData && adminData.length > 0) {
      console.log("User is a school admin");
      return 'school';
    }
    
    // Check profiles table for user_type
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      console.log("Error checking profiles table:", profileError);
    } else if (profileData?.user_type) {
      console.log("Found user type in profiles:", profileData.user_type);
      // Map profile user_type to our UserRole type
      if (profileData.user_type === 'school_admin' || profileData.user_type === 'school') {
        return 'school';
      } else if (profileData.user_type === 'teacher' || profileData.user_type === 'teacher_supervisor') {
        return 'teacher';
      } else if (profileData.user_type === 'student') {
        return 'student';
      }
    }
    
    // Check if user is teacher
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', session.user.id);
    
    if (teacherError) {
      console.log("Error checking teachers table:", teacherError);
    }
    
    if (teacherData && teacherData.length > 0) {
      console.log("User is a teacher");
      return 'teacher';
    }
    
    // Check if user is student
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', session.user.id);
    
    if (studentError) {
      console.log("Error checking students table:", studentError);
    }
    
    if (studentData && studentData.length > 0) {
      console.log("User is a student");
      return 'student';
    }
    
    // If we're here, default to school admin as a fallback
    console.warn("Couldn't determine role, defaulting to 'school'");
    return 'school';
  } catch (error) {
    console.error("Error getting user role:", error);
    // Default to school admin in case of error
    return 'school';
  }
}

// Check if a user is a school admin - UPDATED to ensure consistent logic
export function isSchoolAdmin(role: UserRole | null): boolean {
  // Both 'school' and 'school_admin' roles are considered school admins
  return role === 'school' || role === 'school_admin';
}

// Generic function to invoke edge functions in a consistent manner
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    console.log(`Invoking edge function: ${functionName} with payload:`, payload);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload || {}
    });
    
    if (error) {
      console.error(`Error invoking edge function ${functionName}:`, error);
      return { data: null, error };
    }
    
    console.log(`Edge function ${functionName} successful response:`, data);
    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception invoking edge function ${functionName}:`, error);
    return { data: null, error };
  }
}

// These functions are being kept as fallbacks during transition, but they should 
// eventually be removed since we're removing localStorage
export function getUserRoleWithFallback(): UserRole | null {
  // Default to school admin for fallback
  return 'school';
}

export function getSchoolIdWithFallback(): string | null {
  return null;
}
