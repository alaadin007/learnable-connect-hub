import { supabase } from "@/integrations/supabase/client";
import { generateInviteCode } from './analytics/commonUtils';

// Improved function to provide more robust school info retrieval
export const getCurrentSchoolInfo = async () => {
  try {
    console.log("Getting current school info...");

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user found");
      return null;
    }

    console.log("Current user ID:", user.id);

    // First, try to get school info directly from Supabase RPC function
    try {
      const { data: schoolInfo, error: rpcError } = await supabase
        .rpc('get_current_school_info');

      if (!rpcError && schoolInfo && schoolInfo.length > 0) {
        console.log("School info via RPC:", schoolInfo[0]);
        return {
          id: schoolInfo[0].school_id,
          name: schoolInfo[0].school_name,
          code: schoolInfo[0].school_code
        };
      }
    } catch (rpcError) {
      console.warn("RPC get_current_school_info failed, using fallback methods");
    }

    // Try to get school_id directly from auth context first using standard RPC function
    const { data: schoolId, error: rpcError } = await supabase.rpc('get_user_school_id');

    if (!rpcError && schoolId) {
      console.log("Found school ID via RPC:", schoolId);
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, code")
        .eq("id", schoolId)
        .single();

      if (!schoolError && school) {
        console.log("Found school details:", school);
        return school;
      }
    }

    console.log("Standard RPC failed, trying direct queries...");

    // First check teachers table
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id, school_id")
      .eq("id", user.id)
      .single();

    if (!teacherError && teacher?.school_id) {
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, code")
        .eq("id", teacher.school_id)
        .single();

      if (!schoolError && school) {
        console.log("Found school via teachers table:", school);
        return school;
      }
    } else {
      console.log("No teacher record found, checking students table...");
      // Try students table
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, school_id")
        .eq("id", user.id)
        .single();

      if (!studentError && student?.school_id) {
        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("id", student.school_id)
          .single();

        if (!schoolError && school) {
          console.log("Found school via students table:", school);
          return school;
        }
      }
    }
    
    console.log("Could not determine school through any method");
    return null;

  } catch (error) {
    console.error("Error in getCurrentSchoolInfo:", error);
    return null;
  }
};

// Add a dedicated function to get documents for a user
export const getUserDocuments = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getUserDocuments:", error);
    throw error;
  }
};

// Get document content by document ID
export const getDocumentContent = async (documentId: string) => {
  try {
    if (!documentId) {
      throw new Error("Document ID is required");
    }

    const { data, error } = await supabase
      .from('document_content')
      .select('*')
      .eq('document_id', documentId)
      .order('section_number', { ascending: true });
      
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getDocumentContent:", error);
    throw error;
  }
};

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
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Get the school_id of the logged in teacher
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.error("Only teachers can revoke student access:", teacherError);
      return false;
    }

    // Verify that the student belongs to the teacher's school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", studentId)
      .eq("school_id", teacherData.school_id)
      .single();

    if (studentError || !studentData) {
      console.error("Student not found or not in your school:", studentError);
      return false;
    }

    // Delete the student record (this doesn't delete the auth user, only revokes access)
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
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return { success: false, message: "Could not determine school ID" };
    }

    if (method === "code") {
      // Generate a unique invite code
      const { data: inviteData, error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          teacher_id: user.id,
          code: generateInviteCode(),
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        code: inviteData.code,
        message: "Student invite code generated successfully" 
      };
    } 
    else if (method === "email" && email) {
      // Generate a unique invite code for email
      const { data: inviteData, error: inviteError } = await supabase
        .from("student_invites")
        .insert({
          school_id: schoolId,
          teacher_id: user.id,
          code: generateInviteCode(),
          email: email,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: "Failed to create invite" };
      }

      return { 
        success: true, 
        code: inviteData.code,
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

// Add teacher invite function
export const inviteTeacherDirect = async (email: string): Promise<{
  success: boolean; 
  message?: string;
}> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "You must be logged in to invite a teacher" };
    }

    // Get the school ID of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabase
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return { success: false, message: "Could not determine your school" };
    }

    // Check if user has permission to invite teachers (must be admin or supervisor)
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('is_supervisor', { user_id: user.id });

    if (roleError || !isAdmin) {
      console.error("Permission check failed:", roleError);
      return { success: false, message: "You don't have permission to invite teachers" };
    }

    // Generate a unique invitation token
    const token = generateInviteCode();

    // Create the invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from("teacher_invitations")
      .insert({
        school_id: schoolId,
        email: email,
        invitation_token: token,
        created_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      
      // Check if it's a duplicate email error
      if (inviteError.message?.includes('duplicate')) {
        return { 
          success: false, 
          message: "This email has already been invited" 
        };
      }
      
      return { success: false, message: "Failed to create invitation" };
    }

    return { 
      success: true, 
      message: "Teacher invitation created successfully" 
    };
  } catch (error) {
    console.error("Error in inviteTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};
