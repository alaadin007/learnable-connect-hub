
import { supabase } from "@/integrations/supabase/client";
import { isValidUUID } from "./analytics/validationUtils";

/**
 * Fetch all teachers for a school
 */
export const fetchTeachers = async (
  schoolId: string
): Promise<{ id: string; name: string }[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for teachers, using demo data");
      return getMockTeachers();
    }

    // Fetch teachers from the database
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        profiles(full_name)
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching teachers:", error);
      return getMockTeachers();
    }

    // Transform the data to the expected format
    return (data || []).map(teacher => {
      // Safely access profile data - using type assertion to avoid TypeScript errors
      const profileData = teacher.profiles as any;
      let teacherName = 'Unknown Teacher';
      
      if (profileData) {
        if (Array.isArray(profileData) && profileData.length > 0) {
          teacherName = profileData[0]?.full_name || 'Unknown Teacher';
        } else if (typeof profileData === 'object') {
          teacherName = profileData.full_name || 'Unknown Teacher';
        }
      }
        
      return {
        id: teacher.id,
        name: teacherName
      };
    });
  } catch (error) {
    console.error("Error in fetchTeachers:", error);
    return getMockTeachers();
  }
};

// Helper function for mock teachers data
function getMockTeachers(): { id: string; name: string }[] {
  return [
    { id: '1', name: 'Teacher Smith' },
    { id: '2', name: 'Teacher Johnson' },
    { id: '3', name: 'Teacher Williams' },
    { id: '4', name: 'Teacher Brown' },
    { id: '5', name: 'Teacher Jones' }
  ];
}
