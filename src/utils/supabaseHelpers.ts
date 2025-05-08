
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

// Fix the TypeScript error by properly handling the Promise types
export async function getStudentsWithProfiles(schoolId: string): Promise<any[]> {
  try {
    if (!schoolId) {
      console.error("No school ID provided");
      return [];
    }

    // Fix the Promise handling
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        school_id,
        status,
        created_at,
        profiles:profiles (
          full_name,
          email
        )
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching students:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.error("No data returned or invalid format");
      return [];
    }

    // Format the data to match the expected structure
    const formattedStudents = data.map((student) => ({
      id: student.id,
      school_id: student.school_id,
      status: student.status,
      created_at: student.created_at,
      full_name: student.profiles?.full_name || "Unknown",
      email: student.profiles?.email || "No email"
    }));

    return formattedStudents;
  } catch (error) {
    console.error("Error in getStudentsWithProfiles:", error);
    return [];
  }
}

// Add the missing getTeachersWithProfiles function
export async function getTeachersWithProfiles(schoolId: string): Promise<any[]> {
  try {
    if (!schoolId) {
      console.error("No school ID provided");
      return [];
    }

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        school_id,
        is_supervisor,
        created_at,
        profiles:profiles (
          full_name,
          email
        )
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching teachers:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.error("No data returned or invalid format");
      return [];
    }

    // Format the data to match the expected structure
    const formattedTeachers = data.map((teacher) => ({
      id: teacher.id,
      school_id: teacher.school_id,
      isSupevisor: teacher.is_supervisor,
      createdAt: teacher.created_at,
      full_name: teacher.profiles?.full_name || "Unknown",
      email: teacher.profiles?.email || "No email"
    }));

    return formattedTeachers;
  } catch (error) {
    console.error("Error in getTeachersWithProfiles:", error);
    return [];
  }
}

// Add the missing getStudentPerformanceMetrics function
export async function getStudentPerformanceMetrics(schoolId: string, teacherId?: string): Promise<any[]> {
  try {
    if (!schoolId) {
      console.error("No school ID provided");
      return [];
    }

    // Call the Supabase RPC function to get student performance metrics
    const { data, error } = await supabase
      .rpc('get_student_performance_metrics', { p_school_id: schoolId });

    if (error) {
      console.error("Error fetching student performance metrics:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.error("No student metrics data returned or invalid format");
      return [];
    }

    // Filter by teacher if provided
    const filteredData = teacherId 
      ? data.filter((metric) => metric.teacher_id === teacherId) 
      : data;

    return filteredData;
  } catch (error) {
    console.error("Error in getStudentPerformanceMetrics:", error);
    return [];
  }
}
