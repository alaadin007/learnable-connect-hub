
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the school ID for the currently logged in user
 * Handles fallbacks between different tables/methods
 */
export const getCurrentUserSchoolId = async (): Promise<string | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Try teachers table
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .single();
    
    if (teacherData?.school_id) {
      return teacherData.school_id;
    }
    
    // Try students table
    const { data: studentData } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", user.id)
      .single();
    
    if (studentData?.school_id) {
      return studentData.school_id;
    }
    
    // Try from profile data with school_code
    const { data: profileData } = await supabase
      .from("profiles")
      .select("school_code")
      .eq("id", user.id)
      .single();
    
    // Only proceed if we have valid profile data and school_code
    if (profileData?.school_code) {
      // Get school ID from code
      const { data: schoolData } = await supabase
        .from("schools")
        .select("id")
        .eq("code", profileData.school_code)
        .single();
        
      if (schoolData?.id) {
        return schoolData.id;
      }
    }
    
    // Try from user metadata
    if (user.user_metadata?.school_code) {
      // Get school ID from code in user metadata
      const { data: metadataSchoolData } = await supabase
        .from("schools")
        .select("id")
        .eq("code", user.user_metadata.school_code)
        .single();
        
      if (metadataSchoolData?.id) {
        return metadataSchoolData.id;
      }
    }
    
    console.error("Could not determine school ID through any method");
    return null;
  } catch (error) {
    console.error("Error getting school ID:", error);
    return null;
  }
};

/**
 * Get additional information about a school
 */
export const getSchoolInfo = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting school info:", error);
    return null;
  }
};
