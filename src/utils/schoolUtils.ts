
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the school ID for the currently logged in user
 * Handles fallbacks between different tables/methods
 */
export const getCurrentUserSchoolId = async (): Promise<string | null> => {
  try {
    // Try the RPC function first
    const { data: schoolId, error: rpcError } = await supabase
      .rpc("get_user_school_id");
    
    if (schoolId && !rpcError) {
      console.log("Found school ID from RPC:", schoolId);
      return schoolId;
    }
    
    // If RPC fails, try manual lookup
    if (rpcError) {
      console.warn("RPC error when fetching school ID:", rpcError);
    }
    
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
      console.log("Found school ID from teachers table:", teacherData.school_id);
      return teacherData.school_id;
    }
    
    // Try students table
    const { data: studentData } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", user.id)
      .single();
    
    if (studentData?.school_id) {
      console.log("Found school ID from students table:", studentData.school_id);
      return studentData.school_id;
    }
    
    // Try from profile data
    const { data: profileData } = await supabase
      .from("profiles")
      .select("school_code")
      .eq("id", user.id)
      .single();
    
    if (profileData?.school_code) {
      // Get school ID from code
      const { data: schoolData } = await supabase
        .from("schools")
        .select("id")
        .eq("code", profileData.school_code)
        .single();
        
      if (schoolData?.id) {
        console.log("Found school ID from school code:", schoolData.id);
        return schoolData.id;
      }
    }
    
    console.error("Could not determine school ID");
    return null;
  } catch (error) {
    console.error("Error getting school ID:", error);
    return null;
  }
};
