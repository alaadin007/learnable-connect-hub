
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Approve student
export const approveStudent = async (studentId: string, schoolId: string): Promise<boolean> => {
  try {
    // Update student status to "active"
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
    // Delete the student record
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
export const inviteStudent = async (method: "code" | "email", schoolId: string, email?: string): Promise<{
  success: boolean; 
  code?: string; 
  email?: string;
  message?: string;
}> => {
  try {
    if (method === "code") {
      // Generate a unique invite code
      const inviteCode = generateInviteCode();
      
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

// Get school data by ID
export const getSchoolData = async (schoolId: string): Promise<{name: string; code: string} | null> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('name, code')
      .eq('id', schoolId)
      .single();
    
    if (error) {
      console.error('Error fetching school data:', error);
      toast.error('Could not load school information');
      return null;
    }
    
    if (data) {
      console.log('School data retrieved successfully:', data);
      return {
        name: data.name,
        code: data.code
      };
    }
    
    console.warn('No school data found for ID:', schoolId);
    return null;
  } catch (error) {
    console.error('Error in getSchoolData:', error);
    toast.error('An unexpected error occurred');
    return null;
  }
};

// Fetch all students for a school
export const fetchSchoolStudents = async (schoolId: string) => {
  try {
    // Get students with their status for this school
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, status, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
      
    if (studentError) throw studentError;
    
    if (!studentData || studentData.length === 0) {
      return [];
    }
    
    // Get user profiles for these students
    const studentIds = studentData.map(s => s.id);
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
      
    if (profileError) throw profileError;
    
    // Combine the data
    return studentData.map(student => {
      const profile = profileData?.find(p => p.id === student.id);
      return {
        id: student.id,
        email: student.id, // Using ID as placeholder since we can't access auth.users
        full_name: profile?.full_name || null,
        status: student.status || "pending",
        created_at: student.created_at
      };
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    toast.error("Failed to load students");
    return [];
  }
};
