
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define Student type to match returned structure
export type Student = {
  id: string;
  email: string;       // Ideally actual email, fallback if not available
  full_name: string | null;
  status: string;
  created_at: string;
};

// Get school data by ID
export const getSchoolData = async (schoolId: string): Promise<{ name: string; code: string } | null> => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("name, code")
      .eq("id", schoolId)
      .single();

    if (error) {
      console.error("Error fetching school data:", error);
      return null;
    }

    if (data) {
      console.log("School data retrieved successfully:", data);
      return { name: data.name, code: data.code };
    }

    console.warn("No school data found for ID:", schoolId);
    return null;
  } catch (error) {
    console.error("Error in getSchoolData:", error);
    return null;
  }
};

// Fetch all students for a school
export const fetchSchoolStudents = async (schoolId: string): Promise<Student[]> => {
  try {
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, status, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (studentError) throw studentError;

    if (!studentData?.length) {
      return [];
    }

    const studentIds = studentData.map((s) => s.id);

    // Fetch profiles, include full_name if available
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      // Proceed with partial data
    }

    return studentData.map((student) => {
      // Only use profile data if the request was successful and there's a match
      const profile = profileData && !profileError 
        ? profileData.find((p) => p.id === student.id) 
        : null;
        
      return {
        id: student.id,
        email: student.id, // Use user ID as fallback email
        full_name: profile ? profile.full_name : null,
        status: student.status || "pending",
        created_at: student.created_at,
      };
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    toast.error("Failed to load students");
    return [];
  }
};

// Approve student
export const approveStudent = async (studentId: string, schoolId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("students")
      .update({ status: "active" })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (error) {
      console.error("Error updating student status:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in approveStudent:", error);
    return false;
  }
};

// Revoke student access
export const revokeStudentAccess = async (studentId: string, schoolId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (error) {
      console.error("Failed to revoke student access:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in revokeStudentAccess:", error);
    return false;
  }
};

// Generate a random invite code
export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Invite student via code or email
export const inviteStudent = async (
  method: "code" | "email",
  schoolId: string,
  email?: string
): Promise<{
  success: boolean;
  code?: string;
  email?: string;
  message?: string;
}> => {
  try {
    if (method === "code") {
      try {
        const { data, error } = await supabase.rpc("create_student_invitation", {
          school_id_param: schoolId,
        });

        if (!error && data && data.length > 0) {
          return {
            success: true,
            code: data[0].code,
            message: "Student invite code generated successfully",
          };
        }
      } catch (rpcError) {
        console.error("RPC error, falling back to direct insert:", rpcError);
      }

      const inviteCode = generateInviteCode();

      const { error: inviteError } = await supabase.from("student_invites").insert({
        school_id: schoolId,
        code: inviteCode,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return {
        success: true,
        code: inviteCode,
        message: "Student invite code generated successfully",
      };
    } else if (method === "email" && email) {
      const { error: inviteError } = await supabase.from("student_invites").insert({
        school_id: schoolId,
        email: email,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return {
        success: true,
        email,
        message: "Student invite created successfully",
      };
    } else {
      return { success: false, message: "Invalid request parameters" };
    }
  } catch (error) {
    console.error("Error in inviteStudent:", error);
    return { success: false, message: "Internal error" };
  }
};
