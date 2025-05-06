
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

// Create teacher directly
export const createTeacherDirect = async (email: string, full_name?: string): Promise<{
  success: boolean;
  message?: string;
  data?: {
    email: string;
    temp_password?: string;
  };
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
      return { success: false, message: "Only school supervisors can create teacher accounts" };
    }

    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return { success: false, message: "Could not determine your school" };
    }

    // Generate a temporary password
    const tempPassword = generateTemporaryPassword();

    // Create the user account using the Supabase API and school_admin role
    const { error: createUserError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        user_type: 'teacher',
        school_id: schoolId
      }
    });

    if (createUserError) {
      console.error("Error creating teacher account:", createUserError);
      return { success: false, message: createUserError.message };
    }

    // Return success response with temp password
    return { 
      success: true, 
      message: "Teacher account created successfully",
      data: {
        email: email,
        temp_password: tempPassword
      }
    };
  } catch (error: any) {
    console.error("Error in createTeacher:", error);
    return { success: false, message: error.message || "Internal error" };
  }
};

// Helper function to generate a temporary password
function generateTemporaryPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}
