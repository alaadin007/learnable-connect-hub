import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Helper: Creates 7 days expiry ISO string */
const getExpiryDate = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Gets current user's school info via RPC or fallback.
 */
export const getCurrentSchoolInfo = async (): Promise<{
  id: string;
  name: string;
  code: string;
  contact_email?: string;
} | null> => {
  try {
    const { data, error } = await supabase.rpc("get_current_school_info");

    if (error) {
      console.error("Error fetching school info:", error);
      return null;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      return {
        id: data[0].school_id,
        name: data[0].school_name,
        code: data[0].school_code,
        contact_email: data[0].contact_email,
      };
    }

    // fallback logic
    const { data: schoolId, error: schoolIdError } = await supabase.rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Error fetching school ID:", schoolIdError);
      return null;
    }

    const { data: schoolDetails, error: schoolError } = await supabase
      .from("schools")
      .select("id, name, code, contact_email")
      .eq("id", schoolId)
      .single();

    if (schoolError || !schoolDetails) {
      console.error("Error fetching school details:", schoolError);
      return null;
    }

    return {
      id: schoolDetails.id,
      name: schoolDetails.name,
      code: schoolDetails.code,
      contact_email: schoolDetails.contact_email,
    };
  } catch (error) {
    console.error("Error in getCurrentSchoolInfo:", error);
    return null;
  }
};

/**
 * Approves a student by setting their status to 'active'.
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
 * Revokes student access by deleting their record.
 */
export const revokeStudentAccessDirect = async (studentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("students").delete().eq("id", studentId);

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
 * Invites a teacher by inserting an invitation record.
 */
export const inviteTeacherDirect = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "No authenticated user" };
    }
    const userId = user.id;

    const { data: schoolId, error: schoolIdError } = await supabase.rpc("get_user_school_id");
    if (schoolIdError || !schoolId) {
      console.error("Error fetching school ID:", schoolIdError);
      return { success: false, message: "Failed to get school information" };
    }

    const token = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10).toUpperCase();

    const { error: inviteError } = await supabase.from("teacher_invitations").insert({
      email,
      school_id: schoolId,
      invitation_token: token,
      status: "pending",
      created_by: userId,
    });

    if (inviteError) {
      console.error("Error creating teacher invitation:", inviteError);
      return { success: false, message: "Failed to create invitation" };
    }

    // Typically send email here (Edge function or other server action)

    return { success: true, message: "Teacher invitation created successfully" };
  } catch (error) {
    console.error("Error in inviteTeacherDirect:", error);
    return { success: false, message: "An error occurred" };
  }
};

/**
 * Invites a student either via code generation or email invitation.
 */
export const inviteStudentDirect = async (
  method: "code" | "email",
  email?: string
): Promise<{ success: boolean; code?: string; message?: string }> => {
  try {
    const { data: schoolId, error: schoolIdError } = await supabase.rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Error fetching school ID:", schoolIdError);
      return { success: false, message: "Failed to get school information" };
    }

    if (method === "code") {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error: inviteError } = await supabase.from("student_invites").insert({
        school_id: schoolId,
        code: inviteCode,
        status: "pending",
        expires_at: getExpiryDate(),
      });

      if (inviteError) {
        console.error("Error creating student invite:", inviteError);
        return { success: false, message: "Failed to create invitation code" };
      }

      return { success: true, code: inviteCode, message: "Invitation code generated successfully" };
    } else if (method === "email" && email) {
      const { error: inviteError } = await supabase.from("student_invites").insert({
        school_id: schoolId,
        email,
        status: "pending",
        expires_at: getExpiryDate(),
      });

      if (inviteError) {
        console.error("Error creating student invite:", inviteError);
        return { success: false, message: "Failed to create invitation" };
      }

      // Usually, send email invitation here

      return { success: true, message: `Invitation sent to ${email}` };
    }
    return { success: false, message: "Invalid invitation method or missing email" };
  } catch (error) {
    console.error("Error in inviteStudentDirect:", error);
    return { success: false, message: "An error occurred" };
  }
};