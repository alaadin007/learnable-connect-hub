
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
    const { data, error } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userId || '')
      .single();
    
    if (error) {
      console.error("Error getting user school ID:", error);
      return null;
    }
    
    return data?.school_id || null;
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
    const teachersData = await safeQueryArray(
      supabase
        .from('teachers')
        .select('id, is_supervisor, created_at')
        .eq('school_id', schoolId)
    );
    
    if (!teachersData || teachersData.length === 0) {
      return [];
    }
    
    const teacherIds = teachersData.map(t => t.id);
    const profilesData = await safeQueryArray(
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', teacherIds)
    );
    
    return teachersData.map(teacher => {
      const profile = profilesData.find(p => p.id === teacher.id);
      return {
        id: teacher.id,
        isSupevisor: teacher.is_supervisor,
        createdAt: teacher.created_at,
        full_name: profile?.full_name || "Unknown Teacher",
        email: profile?.email || "No email"
      };
    });
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
    const studentsData = await safeQueryArray(
      supabase
        .from('students')
        .select('id, school_id, status, created_at')
        .eq('school_id', schoolId)
    );
    
    if (!studentsData || studentsData.length === 0) {
      return [];
    }
    
    const studentIds = studentsData.map(s => s.id);
    const profilesData = await safeQueryArray(
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
    );
    
    return studentsData.map(student => {
      const profile = profilesData.find(p => p.id === student.id);
      return {
        id: student.id,
        school_id: student.school_id,
        status: student.status,
        created_at: student.created_at,
        full_name: profile?.full_name || "Unknown Student",
        email: profile?.email || "No email"
      };
    });
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
      .from('student_performance_metrics')
      .select('*')
      .eq('school_id', schoolId);
    
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
