
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
    
    // Try teachers table first (school admins are in teachers table)
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
 * Get comprehensive information about a school
 */
export const getSchoolInfo = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();
      
    if (error) {
      console.error("Error fetching school info:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting school info:", error);
    return null;
  }
};

/**
 * Get school information by code
 */
export const getSchoolInfoByCode = async (schoolCode: string) => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("code", schoolCode)
      .single();
      
    if (error) {
      console.error("Error fetching school info by code:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting school info by code:", error);
    return null;
  }
};

/**
 * Generate a student invitation code and store it in the database
 */
export const generateStudentInviteCode = async (): Promise<{ code: string; error: null | string }> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { code: "", error: "No authenticated user found" };
    }
    
    // Get the school ID for the current user
    const schoolId = await getCurrentUserSchoolId();
    if (!schoolId) {
      return { code: "", error: "Could not determine school ID" };
    }
    
    // Generate a random 8-character invitation code
    const generateCode = () => {
      // Use characters that are less likely to be confused with each other
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const inviteCode = generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Set expiry to 7 days from now
    
    // Store the code in the student_invites table
    const { data, error } = await supabase
      .from("student_invites")
      .insert({
        school_id: schoolId,
        code: inviteCode,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
      
    if (error) {
      console.error("Failed to create invitation:", error);
      return { code: "", error: "Failed to create invitation" };
    }
    
    return { code: inviteCode, error: null };
  } catch (error: any) {
    console.error("Error generating invite code:", error);
    return { code: "", error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Get all student invites for the current user's school
 */
export const getStudentInvites = async () => {
  try {
    // Get the school ID for the current user
    const schoolId = await getCurrentUserSchoolId();
    if (!schoolId) {
      return { data: null, error: "Could not determine school ID" };
    }
    
    // Fetch student invites
    const { data, error } = await supabase
      .from("student_invites")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching student invites:", error);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Error getting student invites:", error);
    return { data: null, error: error.message || "An unexpected error occurred" };
  }
};
