
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import { StudentPerformanceMetric } from '@/components/analytics/types';

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
    const { data, error } = await supabase
      .rpc('get_user_school_id_safely', { uid: userId || undefined });
    
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
    if (!userId) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
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
    const { data, error } = await supabase
      .rpc('get_teachers_for_school', { school_id_param: schoolId });
    
    if (error) {
      console.error("Error getting teachers:", error);
      return [];
    }
    
    return data.map(teacher => ({
      id: teacher.id,
      isSupevisor: teacher.is_supervisor,
      createdAt: teacher.created_at,
      full_name: teacher.full_name || "Unknown Teacher",
      email: teacher.email || "No email"
    }));
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
    const { data, error } = await supabase
      .rpc('get_students_for_school', { school_id_param: schoolId });
    
    if (error) {
      console.error("Error getting students:", error);
      return [];
    }
    
    return data.map(student => ({
      id: student.id,
      school_id: schoolId,
      status: student.status,
      created_at: student.created_at,
      full_name: student.full_name || "Unknown Student",
      email: student.email || "No email"
    }));
  } catch (error) {
    console.error("Unexpected error fetching students:", error);
    return [];
  }
}

/**
 * Get student performance metrics with error handling
 */
export async function getStudentPerformanceMetrics(schoolId: string): Promise<StudentPerformanceMetric[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_student_metrics_for_school', { school_id_param: schoolId });
    
    if (error) {
      console.error("Error getting student performance metrics:", error);
      return [];
    }
    
    return data.map(item => ({
      student_id: item.student_id,
      student_name: item.student_name || 'Unknown Student',
      avg_score: Number(item.avg_score) || 0,
      assessments_taken: Number(item.assessments_taken) || 0,
      completion_rate: Number(item.completion_rate) || 0,
      avg_time_spent_seconds: Number(item.avg_time_spent_seconds) || 0,
      top_strengths: item.top_strengths || '',
      top_weaknesses: item.top_weaknesses || '',
      last_active: null
    }));
  } catch (error) {
    console.error("Unexpected error getting student performance:", error);
    return [];
  }
}
