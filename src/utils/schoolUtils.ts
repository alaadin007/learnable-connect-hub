
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's school ID
 */
export const getCurrentUserSchoolId = async () => {
  try {
    // Check if this is a test account
    const testUserRole = localStorage.getItem("testUserRole");
    const testUserIndex = localStorage.getItem("testUserIndex") || "0";
    
    if (testUserRole) {
      // For test accounts, use the predefined school ID
      const schoolId = `test-school-${testUserIndex}`;
      console.log(`Using predefined school ID for test account: ${schoolId}`);
      return schoolId;
    }
    
    // If not a test account, proceed with normal lookup
    
    // First try to use the RPC function
    const { data, error } = await supabase.rpc('get_user_school_id');
    
    if (error) {
      console.error("Error getting user school ID from RPC:", error);
      
      // Fallback to direct query if RPC fails
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Try to get school ID from teachers table first
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("id", user.id)
        .maybeSingle();
        
      if (teacherData?.school_id) {
        return teacherData.school_id;
      }
      
      // If not a teacher, check students table
      const { data: studentData } = await supabase
        .from("students")
        .select("school_id")
        .eq("id", user.id)
        .maybeSingle();
        
      if (studentData?.school_id) {
        return studentData.school_id;
      }
      
      // Last resort - try to get school by code from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("school_code")
        .eq("id", user.id)
        .maybeSingle();
        
      if (profileData?.school_code) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id")
          .eq("code", profileData.school_code)
          .maybeSingle();
          
        if (schoolData?.id) {
          return schoolData.id;
        }
      }
      
      // Could not determine school ID
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return null;
  }
};

/**
 * Generate an invitation code for a student
 */
export const generateStudentInviteCode = async () => {
  try {
    if (!supabase) {
      return { code: null, error: "Supabase client not initialized" };
    }
    
    // First, get the school ID
    const schoolId = await getCurrentUserSchoolId();
    
    if (!schoolId) {
      console.error("Could not determine school ID");
      return { code: null, error: "Could not determine school ID" };
    }
    
    // Try using the database function directly
    try {
      const { data, error } = await supabase.rpc('create_student_invitation', {
        school_id_param: schoolId
      });
      
      if (error) {
        console.error("Error generating invite code with RPC:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        return { code: data[0].code, error: null };
      }
    } catch (rpcError) {
      console.error("RPC method failed, trying fallback:", rpcError);
      // Fallback to edge function if RPC fails
    }
    
    // Fallback to directly inserting a code
    try {
      console.log("Using direct table insertion fallback method");
      
      // Generate a random code
      const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      const inviteCode = generateCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      // Insert directly into student_invites table
      const { data: inviteData, error: insertError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          code: inviteCode,
          status: "pending",
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
        
      if (insertError) {
        throw insertError;
      }
      
      return { code: inviteCode, error: null };
    } catch (directError: any) {
      console.error("Direct insertion failed:", directError);
      return { code: null, error: directError.message || "Failed to create invitation" };
    }
  } catch (error: any) {
    console.error("Error generating student invite code:", error);
    return { code: null, error: error.message || "An unknown error occurred" };
  }
};

/**
 * Get information about the current school
 * @returns Either an object with school_id, school_name, school_code or
 * a direct school record with id, name, code
 */
export const getCurrentSchoolInfo = async () => {
  try {
    // Check if this is a test account
    const testUserRole = localStorage.getItem("testUserRole");
    const testUserIndex = localStorage.getItem("testUserIndex") || "0";
    
    if (testUserRole) {
      // For test accounts, return predefined school info
      const schoolId = `test-school-${testUserIndex}`;
      
      // First check if this test school exists in the database
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();
      
      if (!schoolError && schoolData) {
        console.log("Found test school in database:", schoolData);
        return schoolData;
      }
      
      // If the school doesn't exist in the database, return mock data
      console.log("Test school not found, returning mock data");
      return {
        id: schoolId,
        name: `Test School${testUserIndex > 0 ? ' ' + testUserIndex : ''}`,
        code: `TEST${testUserIndex}`,
        contact_email: `school.test${testUserIndex > 0 ? testUserIndex : ''}@learnable.edu`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: "This is a test school for development purposes",
        notifications_enabled: true
      };
    }
    
    // If not a test account, proceed with normal lookup
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('get_current_school_info');
    
    if (error) {
      console.error("Error getting current school info from RPC:", error);
      
      // Fallback to manual lookup
      const schoolId = await getCurrentUserSchoolId();
      
      if (!schoolId) {
        throw new Error("Could not determine school ID");
      }
      
      // Get school details directly
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();
        
      if (schoolError) {
        throw schoolError;
      }
      
      return schoolData;
    }
    
    return data[0];
  } catch (error) {
    console.error("Error getting current school info:", error);
    return null;
  }
};

/**
 * Get all student invites for the current school
 */
export const getStudentInvites = async () => {
  try {
    // Get the school ID first
    const schoolId = await getCurrentUserSchoolId();
    
    if (!schoolId) {
      return { data: null, error: "Could not determine school ID" };
    }
    
    // Now fetch the invites
    const { data, error } = await supabase
      .from('student_invites')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching student invites:", error);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching student invites:", error);
    return { data: null, error: error.message || "Error fetching student invites" };
  }
};

/**
 * Generate a new school code
 */
export const generateNewSchoolCode = async () => {
  // This is a placeholder, as we would typically use a database function for this
  // We'll implement this when needed
  return { code: null, error: "Not implemented yet" };
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
 * Check if test user is properly set up
 */
export const validateTestUserSetup = async (userId: string) => {
  try {
    // Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
      
    if (profileError || !profile) {
      console.error("Test user profile not found:", profileError);
      return { valid: false, error: "Test user profile not found" };
    }
    
    // Get user type
    const userType = profile.user_type;
    
    // Check if user exists in appropriate role table
    if (userType === 'teacher' || userType === 'school') {
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("id", userId)
        .maybeSingle();
        
      if (teacherError || !teacher?.school_id) {
        console.error("Test teacher record invalid:", teacherError);
        return { valid: false, error: "Teacher record invalid or missing school ID" };
      }
      
      return { 
        valid: true, 
        schoolId: teacher.school_id,
        userType,
        profile
      };
    } 
    else if (userType === 'student') {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("school_id")
        .eq("id", userId)
        .maybeSingle();
        
      if (studentError || !student?.school_id) {
        console.error("Test student record invalid:", studentError);
        return { valid: false, error: "Student record invalid or missing school ID" };
      }
      
      return { 
        valid: true, 
        schoolId: student.school_id,
        userType,
        profile
      };
    }
    
    return { valid: false, error: "Invalid user type" };
  } catch (error: any) {
    console.error("Error validating test user setup:", error);
    return { valid: false, error: error.message || "Error validating test user" };
  }
};
