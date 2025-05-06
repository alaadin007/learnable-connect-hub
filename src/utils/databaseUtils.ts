import { supabase } from "@/integrations/supabase/client";

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
      
      if (schoolIdError || !schoolId) {
        console.error('Error fetching school ID:', schoolIdError);
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

import { toast } from "sonner";

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
