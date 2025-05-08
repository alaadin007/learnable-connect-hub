
import { supabase } from '@/integrations/supabase/client';

// Get user profile function - handles profiles with additional fields
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_type,
        full_name,
        email,
        school_id,
        school_code,
        avatar_url,
        is_active,
        organization:schools(id, name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    if (!data) {
      console.warn('No profile found for user:', userId);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    throw error;
  }
}

// Teacher invitation function - leverages database function
export async function inviteTeacherDirect(email: string) {
  try {
    // Get the school ID for the current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, organization(id)')
      .eq('id', supabase.auth.getUser().then(res => res.data.user?.id))
      .single();

    if (profileError) throw profileError;
    
    // Determine which school ID to use (direct or from organization)
    const schoolId = profile?.school_id || profile?.organization?.id;
    
    if (!schoolId) {
      return { success: false, message: 'No school associated with your account' };
    }

    // Call RPC function to create invitation
    const { data, error } = await supabase.rpc(
      'invite_teacher_direct', 
      { 
        teacher_email: email,
        school_id: schoolId
      }
    );

    if (error) throw error;

    return { success: true, invitationId: data };
  } catch (error: any) {
    console.error('Error inviting teacher:', error);
    return { success: false, message: error.message || 'Failed to send invitation' };
  }
}

// Student invitation function - supports both email and code methods
export async function inviteStudentDirect(
  method: 'email' | 'code' = 'code',
  email?: string
) {
  try {
    // Get the school ID for the current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, organization(id)')
      .eq('id', supabase.auth.getUser().then(res => res.data.user?.id))
      .single();

    if (profileError) throw profileError;
    
    const schoolId = profile?.school_id || profile?.organization?.id;
    
    if (!schoolId) {
      return { success: false, message: 'No school associated with your account' };
    }

    if (method === 'code') {
      // Generate invitation code using RPC function
      const { data, error } = await supabase.rpc(
        'invite_student_direct',
        { school_id_param: schoolId }
      );

      if (error) throw error;
      
      return { 
        success: true, 
        code: data[0]?.code, 
        expiresAt: data[0]?.expires_at
      };
    } else if (method === 'email' && email) {
      // For email invitations, insert directly
      const { data, error } = await supabase
        .from('student_invites')
        .insert({
          school_id: schoolId,
          email,
          status: 'pending'
        })
        .select();

      if (error) throw error;
      
      return { success: true };
    }

    return { success: false, message: 'Invalid invitation method' };
  } catch (error: any) {
    console.error('Error inviting student:', error);
    return { success: false, message: error.message || 'Failed to create invitation' };
  }
}

// Student approval function
export async function approveStudentDirect(studentId: string) {
  try {
    // Call RPC function
    const { data, error } = await supabase.rpc(
      'approve_student_direct',
      { student_id_param: studentId }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error approving student:', error);
    return false;
  }
}

// Revoke student access function
export async function revokeStudentAccessDirect(studentId: string) {
  try {
    // Call RPC function
    const { data, error } = await supabase.rpc(
      'revoke_student_access_direct',
      { student_id_param: studentId }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error revoking student access:', error);
    return false;
  }
}

// Other utility functions can be added here
