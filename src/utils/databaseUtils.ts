
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
    
    // Try getting school info directly from user metadata first
    if (user.user_metadata?.school_code) {
      console.log("Found school code in user metadata:", user.user_metadata.school_code);
      
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("code", user.user_metadata.school_code)
          .single();
          
        if (!schoolError && schoolData) {
          console.log("Found school from user metadata:", schoolData);
          return {
            school_id: schoolData.id,
            school_name: schoolData.name,
            school_code: schoolData.code,
            contact_email: null // Not all school records might have this
          };
        } else {
          console.log("Could not find school with code:", user.user_metadata.school_code, schoolError);
        }
      } catch (error) {
        console.error("Error querying schools by code:", error);
      }
    }

    // Try direct query to get school_id from teachers table
    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("id", user.id)
        .single();
        
      if (!teacherError && teacherData?.school_id) {
        console.log("Found school ID from teachers table:", teacherData.school_id);
        
        try {
          const { data: school, error: schoolError } = await supabase
            .from("schools")
            .select("id, name, code, contact_email")
            .eq("id", teacherData.school_id)
            .single();

          if (!schoolError && school) {
            console.log("Found school details:", school);
            return {
              school_id: school.id,
              school_name: school.name,
              school_code: school.code,
              contact_email: school.contact_email
            };
          }
        } catch (schoolQueryError) {
          console.error("Error looking up school details:", schoolQueryError);
        }
      } else {
        console.log("No teacher record found, checking students table...");
        
        // Try students table
        try {
          const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id, school_id")
            .eq("id", user.id)
            .single();

          if (!studentError && student?.school_id) {
            console.log("Found school ID from students table:", student.school_id);
            
            const { data: school, error: schoolError } = await supabase
              .from("schools")
              .select("id, name, code, contact_email")
              .eq("id", student.school_id)
              .single();

            if (!schoolError && school) {
              console.log("Found school via students table:", school);
              return {
                school_id: school.id,
                school_name: school.name,
                school_code: school.code,
                contact_email: school.contact_email
              };
            }
          }
        } catch (studentQueryError) {
          console.error("Error looking up student:", studentQueryError);
        }
      }
    } catch (queryError) {
      console.error("Error in direct table queries:", queryError);
    }
    
    // Try using the RPC function as a last resort
    try {
      const { data: schoolId, error: schoolIdError } = await supabase
        .rpc("get_user_school_id");
      
      if (!schoolIdError && schoolId) {
        console.log("Found school ID via RPC:", schoolId);
        
        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code, contact_email")
          .eq("id", schoolId)
          .single();

        if (!schoolError && school) {
          return {
            school_id: school.id,
            school_name: school.name,
            school_code: school.code,
            contact_email: school.contact_email
          };
        }
      } else {
        console.log("RPC returned error or no school ID:", schoolIdError);
      }
    } catch (rpcError) {
      console.log("Error in RPC call:", rpcError);
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
      console.error("getUserDocuments: User ID is required");
      throw new Error("User ID is required");
    }

    console.log("Fetching documents for user:", userId);

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error in getUserDocuments Supabase query:", error);
      throw new Error(error.message);
    }
    
    console.log(`Retrieved ${data?.length || 0} documents for user ${userId}`);
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
      console.error("getDocumentContent: Document ID is required");
      throw new Error("Document ID is required");
    }

    console.log("Fetching content for document:", documentId);

    const { data, error } = await supabase
      .from('document_content')
      .select('*')
      .eq('document_id', documentId)
      .order('section_number', { ascending: true });
      
    if (error) {
      console.error("Error in getDocumentContent Supabase query:", error);
      throw new Error(error.message);
    }
    
    console.log(`Retrieved ${data?.length || 0} content sections for document ${documentId}`);
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
