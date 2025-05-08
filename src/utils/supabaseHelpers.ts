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
