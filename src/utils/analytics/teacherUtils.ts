
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
    // This function uses admin privileges and must be run server-side
    // Since we're replacing edge functions, this would normally require an edge function
    // As a compromise, we'll indicate this limitation
    
    toast.error("Direct teacher creation requires server-side privileges");
    return { 
      success: false, 
      message: "Teacher creation requires admin privileges and cannot be performed directly from the browser. This would typically require server-side code."
    };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};
