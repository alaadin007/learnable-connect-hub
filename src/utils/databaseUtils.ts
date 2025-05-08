import { supabase } from '@/integrations/supabase/client';

export async function fetchSchoolCodes() {
  const { data, error } = await supabase.from('schools').select('code');
  if (error) {
    console.error('Error fetching school codes:', error);
    return [];
  }
  return data.map(item => item.code);
}

export async function fetchSchoolData(code: string) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('Error fetching school data:', error);
    return null;
  }
  return data;
}

// Get invitations for a specific school
export async function getTeacherInvitationsForSchool(schoolId: string) {
  try {
    // Use the teacher_invitations table instead
    const { data, error } = await supabase
      .from('teacher_invitations')
      .select('*')
      .eq('school_id', schoolId);
      
    if (error) {
      console.error('Error fetching teacher invitations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTeacherInvitationsForSchool:', error);
    return [];
  }
}

// Generate a student invitation code
export async function generateStudentInvitationCode(schoolId: string) {
  try {
    // Fix the RPC function name to match the one in the database
    const { data, error } = await supabase.rpc('create_student_invitation', {
      school_id_param: schoolId,
    });
    
    if (error) {
      console.error('Error generating student invitation code:', error);
      return null;
    }
    
    if (!data) {
      console.error('No invitation code returned');
      return null;
    }
    
    // Cast data to the appropriate type or access code directly
    return typeof data === 'object' ? (data as any).code : data;
  } catch (error) {
    console.error('Error in generateStudentInvitationCode:', error);
    return null;
  }
}

// Get student invitation codes for a school
export async function getStudentInvitationCodes(schoolId: string) {
  try {
    // Fix the RPC function name to match the one in the database
    const { data, error } = await supabase
      .from('student_invites')
      .select('*')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error('Error fetching student invitation codes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getStudentInvitationCodes:', error);
    return [];
  }
}

// Approve a student - Function that was missing
export async function approveStudentDirect(studentId: string): Promise<boolean> {
  try {
    // Update the student status to active
    const { error } = await supabase
      .from('students')
      .update({ status: 'active' })
      .eq('id', studentId);

    if (error) {
      console.error('Error approving student:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in approveStudentDirect:', error);
    return false;
  }
}

// Revoke student access - Function that was missing
export async function revokeStudentAccessDirect(studentId: string): Promise<boolean> {
  try {
    // Delete the student record
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error revoking student access:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in revokeStudentAccessDirect:', error);
    return false;
  }
}

// Invite a student directly - Function that was missing
export async function inviteStudentDirect(
  method: 'code' | 'email',
  email?: string
): Promise<{ success: boolean; code?: string; message?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }
    
    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    if (!profile?.school_id) {
      return { success: false, message: 'No school associated with this account' };
    }
    
    if (method === 'code') {
      // Generate invitation code
      const code = await generateStudentInvitationCode(profile.school_id);
      if (!code) {
        return { success: false, message: 'Failed to generate invitation code' };
      }
      return { success: true, code };
    } else {
      // Email invitation method
      if (!email) {
        return { success: false, message: 'Email is required for email invitations' };
      }
      
      // Create an invitation in the student_invites table
      const { error } = await supabase.from('student_invites').insert({
        email,
        school_id: profile.school_id,
        status: 'pending'
      });
      
      if (error) {
        console.error('Error creating student invite:', error);
        return { success: false, message: error.message };
      }
      
      // In a real app, you would trigger an email sending process here
      
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error in inviteStudentDirect:', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}

// Invite a teacher directly - Function that was missing
export async function inviteTeacherDirect(
  email: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }
    
    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    if (!profile?.school_id) {
      return { success: false, message: 'No school associated with this account' };
    }
    
    // Generate a random token for invitation
    const token = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
    
    // Create an invitation in the teacher_invitations table
    const { error } = await supabase.from('teacher_invitations').insert({
      email,
      school_id: profile.school_id,
      created_by: user.id,
      invitation_token: token,
      status: 'pending'
    });
    
    if (error) {
      console.error('Error creating teacher invitation:', error);
      return { success: false, message: error.message };
    }
    
    // In a real app, you would trigger an email sending process here
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in inviteTeacherDirect:', error);
    return { success: false, message: error.message || 'An error occurred' };
  }
}
