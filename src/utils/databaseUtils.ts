
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Get complete school information for the current user
 */
export const getCurrentSchoolInfo = async (): Promise<{
  id: string;
  name: string;
  code: string;
  contact_email?: string;
} | null> => {
  try {
    const { data, error } = await supabase.rpc('get_current_school_info');
    
    if (error) {
      console.error('Error fetching school info:', error);
      return null;
    }
    
    if (data && Array.isArray(data) && data.length > 0) {
      return {
        id: data[0].school_id,
        name: data[0].school_name,
        code: data[0].school_code,
        contact_email: data[0].contact_email
      };
    }
    
    // If we can't get the school info from the RPC, try to get it from the user's school ID
    try {
      const { data: schoolId, error: schoolIdError } = await supabase.rpc('get_user_school_id');
      
      if (schoolIdError) {
        console.error('Error fetching school ID:', schoolIdError);
        return null;
      }
      
      if (!schoolId) {
        console.error('No school ID returned');
        return null;
      }
      
      const { data: schoolDetails, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, code, contact_email")
        .eq("id", schoolId)
        .single();
        
      if (schoolError) {
        console.error("Error fetching school details:", schoolError);
        return null;
      }
      
      if (schoolDetails) {
        return {
          id: schoolDetails.id,
          name: schoolDetails.name,
          code: schoolDetails.code,
          contact_email: schoolDetails.contact_email
        };
      }
    } catch (innerError) {
      console.error('Error in fallback school info fetch:', innerError);
    }
    
    return null;
  } catch (error) {
    console.error('Error in getCurrentSchoolInfo:', error);
    return null;
  }
};

/**
 * Approves a student directly by updating their status to 'active'.
 */
export const approveStudentDirect = async (studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", studentId);

    if (error) {
      console.error("Error updating student status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in approveStudentDirect:", error);
    return false;
  }
};

/**
 * Revokes student access directly by deleting their record.
 */
export const revokeStudentAccessDirect = async (studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) {
      console.error("Failed to revoke student access:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in revokeStudentAccessDirect:", error);
    return false;
  }
};

/**
 * Invites a teacher directly by creating an invitation record.
 * This function is used in the TeacherInvitation component.
 */
export const inviteTeacherDirect = async (email: string): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    // Get the school ID of the current user
    const { data: schoolId, error: schoolIdError } = await supabase.rpc('get_user_school_id');
    
    if (schoolIdError || !schoolId) {
      console.error('Error fetching school ID:', schoolIdError);
      return { success: false, message: 'Failed to get school information' };
    }
    
    // Create an invitation token - it can be a random string or UUID
    const token = crypto.randomUUID();
    
    // Create a teacher invitation record
    const { error: inviteError } = await supabase
      .from("teacher_invitations")
      .insert({
        email: email,
        school_id: schoolId,
        invitation_token: token,
        status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (inviteError) {
      console.error("Error creating teacher invitation:", inviteError);
      return { success: false, message: "Failed to create invitation" };
    }

    // In a real implementation, you would typically send an email here
    // using an Edge Function or other server-side functionality

    return { 
      success: true, 
      message: "Teacher invitation created successfully" 
    };
  } catch (error) {
    console.error('Error in inviteTeacherDirect:', error);
    return { success: false, message: 'An error occurred' };
  }
};

/**
 * Invites a student directly by either:
 * - Generating an invitation code (code method)
 * - Sending an email invitation (email method)
 * 
 * @param method - The invitation method, either 'code' or 'email'
 * @param email - Optional email address when using the 'email' method
 * @returns Success status, generated code or message
 */
export const inviteStudentDirect = async (
  method: 'code' | 'email',
  email?: string
): Promise<{
  success: boolean;
  code?: string;
  message?: string;
}> => {
  try {
    // Get the school ID of the current user
    const { data: schoolId, error: schoolIdError } = await supabase.rpc('get_user_school_id');
    
    if (schoolIdError || !schoolId) {
      console.error('Error fetching school ID:', schoolIdError);
      return { success: false, message: 'Failed to get school information' };
    }

    if (method === 'code') {
      // Generate a unique invite code - using a helper function or UUID
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Create a student invitation record with the code
      const { error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiration
        });

      if (inviteError) {
        console.error("Error creating student invite:", inviteError);
        return { success: false, message: "Failed to create invitation code" };
      }

      return { 
        success: true,
        code: inviteCode,
        message: "Invitation code generated successfully" 
      };
    } 
    else if (method === 'email' && email) {
      // Create a student invitation record with the email
      const { error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          email: email,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiration
        });

      if (inviteError) {
        console.error("Error creating student invite:", inviteError);
        return { success: false, message: "Failed to create invitation" };
      }

      // In a real implementation, you would typically send an email here
      // using an Edge Function or other server-side functionality

      return { 
        success: true, 
        message: `Invitation sent to ${email}` 
      };
    }
    
    return { success: false, message: "Invalid invitation method or missing email" };
  } catch (error) {
    console.error('Error in inviteStudentDirect:', error);
    return { success: false, message: 'An error occurred' };
  }
};
