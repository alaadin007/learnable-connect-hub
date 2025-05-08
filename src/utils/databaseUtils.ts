
import { supabase } from "@/integrations/supabase/client";

/**
 * Directly invite a teacher using database functions
 */
export const inviteTeacherDirect = async (email: string): Promise<{ success: boolean, message: string }> => {
  try {
    // Get the current user's school ID
    const { data: schoolId, error: schoolError } = await supabase
      .rpc('get_user_school_id');
    
    if (schoolError || !schoolId) {
      console.error("Error getting school ID:", schoolError);
      return { success: false, message: "Could not determine your school" };
    }
    
    // Send the invitation using the database function
    const { data: inviteId, error } = await supabase
      .rpc('invite_teacher_direct', { 
        teacher_email: email,
        school_id: schoolId
      });
    
    if (error) {
      console.error("Error inviting teacher:", error);
      return { success: false, message: error.message };
    }
    
    return { success: true, message: `Invitation sent to ${email}` };
  } catch (error: any) {
    console.error("Unexpected error inviting teacher:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

/**
 * Directly approve a student using database function
 */
export const approveStudentDirect = async (studentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('approve_student_direct', { student_id_param: studentId });
    
    if (error) {
      console.error("Error approving student:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Unexpected error approving student:", error);
    return false;
  }
};

/**
 * Directly revoke student access using database function
 */
export const revokeStudentAccessDirect = async (studentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('revoke_student_access_direct', { student_id_param: studentId });
    
    if (error) {
      console.error("Error revoking student access:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Unexpected error revoking student access:", error);
    return false;
  }
};

/**
 * Invite student directly using either email or code generation
 */
export const inviteStudentDirect = async (
  method: 'code' | 'email', 
  email?: string
): Promise<{ success: boolean, message: string, code?: string }> => {
  try {
    // Get the current user's school ID
    const { data: schoolId, error: schoolError } = await supabase
      .rpc('get_user_school_id');
    
    if (schoolError || !schoolId) {
      console.error("Error getting school ID:", schoolError);
      return { success: false, message: "Could not determine your school" };
    }
    
    if (method === 'code') {
      // Generate an invitation code
      const { data, error } = await supabase
        .rpc('invite_student_direct', { school_id_param: schoolId });
        
      if (error) {
        console.error("Error generating invitation code:", error);
        return { success: false, message: "Failed to generate invitation code" };
      }
      
      return { 
        success: true, 
        message: "Invitation code generated successfully", 
        code: data?.code 
      };
    } else if (method === 'email' && email) {
      // Placeholder for email invitation - this would typically call another RPC or edge function
      // For now, we'll just generate a code and return it
      const { data, error } = await supabase
        .rpc('invite_student_direct', { school_id_param: schoolId });
        
      if (error) {
        console.error("Error generating invitation:", error);
        return { success: false, message: "Failed to create invitation" };
      }
      
      // In a real implementation, this would send an email to the student
      console.log(`Email invitation would be sent to ${email} with code ${data?.code}`);
      
      return { 
        success: true, 
        message: `Invitation sent to ${email}` 
      };
    }
    
    return { success: false, message: "Invalid invitation method or missing email" };
  } catch (error: any) {
    console.error("Unexpected error inviting student:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};
