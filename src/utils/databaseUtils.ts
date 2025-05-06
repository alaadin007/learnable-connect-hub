
import { supabase } from "@/integrations/supabase/client";

// Approve student directly
export const approveStudentDirect = async (studentId: string): Promise<boolean> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Get the school_id of the logged in teacher
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return false;
    }

    // Check if student exists and belongs to the same school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentError || !studentData) {
      console.error("Student not found or not in your school:", studentError);
      return false;
    }

    // Update student status to "active"
    const { error: updateError } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (updateError) {
      console.error("Error updating student status:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in approveStudent:", error);
    return false;
  }
};

// Revoke student access directly
export const revokeStudentAccessDirect = async (studentId: string): Promise<boolean> => {
  try {
    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return false;
    }

    // Verify that the student belongs to the user's school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentError || !studentData) {
      console.error("Student not found or not in your school:", studentError);
      return false;
    }

    // Delete the student record
    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (deleteError) {
      console.error("Failed to revoke student access:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in revokeStudentAccess:", error);
    return false;
  }
};

// Invite student directly
export const inviteStudentDirect = async (method: "code" | "email", email?: string): Promise<{
  success: boolean; 
  code?: string; 
  email?: string;
  message?: string;
}> => {
  try {
    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return { success: false, message: "Could not determine school ID" };
    }

    if (method === "code") {
      // Generate a unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          code: inviteCode,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        code: inviteCode,
        message: "Student invite code generated successfully" 
      };
    } 
    else if (method === "email" && email) {
      const { error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          email: email,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        email: email,
        message: "Student invite created successfully" 
      };
    } 
    else {
      return { success: false, message: "Invalid request parameters" };
    }
  } catch (error) {
    console.error("Error in inviteStudent:", error);
    return { success: false, message: "Internal error" };
  }
};

// Invite teacher directly
export const inviteTeacherDirect = async (email: string): Promise<{
  success: boolean;
  inviteId?: string;
  message?: string;
}> => {
  try {
    // Verify the user is logged in and is a school supervisor
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if user is a school supervisor
    const { data: isSupervisor, error: supervisorError } = await supabase
      .rpc("is_supervisor", { user_id: user.id });

    if (supervisorError || !isSupervisor) {
      return { success: false, message: "Only school supervisors can invite teachers" };
    }

    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // Use RPC to invite teacher with existing function
    const { data: inviteResult, error: inviteError } = await supabase
      .rpc("invite_teacher", {
        teacher_email: email
      });

    if (inviteError) {
      console.error("Error inviting teacher:", inviteError);
      return { success: false, message: inviteError.message };
    }

    return { 
      success: true, 
      inviteId: inviteResult,
      message: "Teacher invitation sent successfully" 
    };
  } catch (error) {
    console.error("Error in inviteTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};

// Generate school code for registration
export const generateSchoolCode = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc("generate_school_code");
    
    if (error) {
      console.error("Error generating school code:", error);
      // Fallback to client-side generation if RPC fails
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    
    return data || Math.random().toString(36).substring(2, 10).toUpperCase();
  } catch (error) {
    console.error("Error in generateSchoolCode:", error);
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
};

// Get school data including name and code
export const getSchoolDataByUserId = async (userId?: string): Promise<{ name: string; code: string } | null> => {
  try {
    // Get school ID from user's profile
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id", { user_id: userId });

    if (schoolIdError || !schoolId) {
      console.error("Error getting user's school ID:", schoolIdError);
      return null;
    }

    // Get school info
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("name, code")
      .eq("id", schoolId)
      .single();

    if (schoolError || !schoolData) {
      console.error("Error getting school data:", schoolError);
      return null;
    }

    return {
      name: schoolData.name,
      code: schoolData.code
    };
  } catch (error) {
    console.error("Error in getSchoolDataByUserId:", error);
    return null;
  }
};

// Get current school information
export const getCurrentSchoolInfo = async (): Promise<{ id: string; name: string; code: string } | null> => {
  try {
    const { data: schoolInfo, error } = await supabase.rpc("get_current_school_info");
    
    if (error || !schoolInfo || schoolInfo.length === 0) {
      console.error("Error getting current school info:", error);
      return null;
    }
    
    return {
      id: schoolInfo[0].school_id,
      name: schoolInfo[0].school_name,
      code: schoolInfo[0].school_code
    };
  } catch (error) {
    console.error("Error in getCurrentSchoolInfo:", error);
    return null;
  }
};
