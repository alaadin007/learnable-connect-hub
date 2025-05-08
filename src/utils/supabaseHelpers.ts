
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Helper function to safely handle Supabase queries with error handling
 */
export async function safeQuerySingle<T>(
  queryPromise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T | null> {
  try {
    const { data, error } = await queryPromise;
    
    if (error) {
      console.error("Database query error:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error during database query:", error);
    return null;
  }
}

/**
 * Helper function to safely handle Supabase queries that return arrays
 */
export async function safeQueryArray<T>(
  queryPromise: Promise<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  try {
    const { data, error } = await queryPromise;
    
    if (error) {
      console.error("Database query error:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Unexpected error during database query:", error);
    return [];
  }
}

/**
 * Get user's school ID safely with error handling
 */
export async function getUserSchoolId(userId?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc(
      'get_user_school_id_safely', 
      userId ? { uid: userId } : {}
    );
    
    if (error) {
      console.error("Error getting user school ID:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error getting user school ID:", error);
    return null;
  }
}

/**
 * Get user profile safely with error handling
 */
export async function getUserProfileSafely(userId?: string) {
  try {
    const { data, error } = userId 
      ? await supabase.rpc('get_profile_safely', { uid: userId })
      : await supabase.rpc('get_profile_safely');
    
    if (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error getting user profile:", error);
    return null;
  }
}

/**
 * Safely get profile data for a user by ID
 */
export async function getProfileById(userId: string) {
  return safeQuerySingle(
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  );
}

/**
 * Safely fetch teachers with profile information
 */
export async function getTeachersWithProfiles(schoolId: string) {
  try {
    // Using an explicit JOIN to ensure we get properly typed data
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        is_supervisor,
        created_at,
        profiles!inner(
          id,
          full_name,
          email
        )
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching teachers:", error);
      return [];
    }

    return data.map(teacher => ({
      id: teacher.id,
      isSupevisor: teacher.is_supervisor,
      createdAt: teacher.created_at,
      full_name: teacher.profiles.full_name,
      email: teacher.profiles.email
    })) || [];
  } catch (error) {
    console.error("Unexpected error fetching teachers:", error);
    return [];
  }
}

/**
 * Safely fetch students with profile information
 */
export async function getStudentsWithProfiles(schoolId: string) {
  try {
    // Using an explicit JOIN to ensure we get properly typed data
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        school_id,
        status,
        created_at,
        profiles!inner(
          id,
          full_name,
          email
        )
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching students:", error);
      return [];
    }

    return data.map(student => ({
      id: student.id,
      school_id: student.school_id,
      status: student.status,
      created_at: student.created_at,
      full_name: student.profiles.full_name,
      email: student.profiles.email
    })) || [];
  } catch (error) {
    console.error("Unexpected error fetching students:", error);
    return [];
  }
}

/**
 * Get student performance metrics with error handling
 */
export async function getStudentPerformanceMetrics(schoolId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_student_performance_metrics', { p_school_id: schoolId });
    
    if (error) {
      console.error("Error getting student performance metrics:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Unexpected error getting student performance:", error);
    return [];
  }
}
