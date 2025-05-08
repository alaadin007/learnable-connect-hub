
import { supabase } from '@/integrations/supabase/client';

/**
 * Invite a student to a school
 */
export const inviteStudentDirect = async (
  method: 'code' | 'email',
  email?: string
) => {
  try {
    if (method === 'email' && !email) {
      return { success: false, message: "Email is required for email invites" };
    }

    // For email invites, create a pending user in auth.users
    if (method === 'email' && email) {
      const { data, error } = await supabase.auth.inviteUserByEmail(email);

      if (error) {
        console.error("Error inviting user:", error);
        return { success: false, message: error.message };
      }

      return { success: true, message: `Invite sent to ${email}`, data };
    }

    // For code invites, generate a unique code
    if (method === 'code') {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      return { success: true, code };
    }

    return { success: false, message: "Invalid invite method" };
  } catch (error: any) {
    console.error("Error in inviteStudentDirect:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

/**
 * Invite a teacher to a school
 */
export const inviteTeacherDirect = async (email: string) => {
  try {
    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // Get the current user to use as the inviter
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    // Get the school ID of the inviter
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (!profile?.school_id) {
      return { success: false, message: "No school associated with your account" };
    }

    // Call the RPC function to invite teacher
    const { data, error } = await supabase.rpc(
      'invite_teacher', 
      { teacher_email: email, inviter_id: user.id }
    );

    if (error) {
      console.error("Error inviting teacher:", error);
      return { success: false, message: error.message };
    }

    // Insert the invitation record manually
    const token = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
    
    const { error: insertError } = await supabase
      .from('teacher_invitations')
      .insert({
        school_id: profile.school_id,
        email,
        invitation_token: token,
        created_by: user.id
      });

    if (insertError) {
      console.error("Error creating invitation record:", insertError);
      return { success: false, message: insertError.message };
    }

    return { success: true, message: `Invitation sent to ${email}`, data };
  } catch (error: any) {
    console.error("Error in inviteTeacherDirect:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

/**
 * Approve a student
 */
export const approveStudentDirect = async (studentId: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', studentId);

    if (error) {
      console.error("Error approving student:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in approveStudentDirect:", error);
    return false;
  }
};

/**
 * Revoke student access
 */
export const revokeStudentAccessDirect = async (studentId: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error("Error revoking student access:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in revokeStudentAccessDirect:", error);
    return false;
  }
};

/**
 * Create session log in the database
 */
export const createSessionLog = async (topic: string) => {
  try {
    const { data, error } = await supabase.rpc('create_session_log', { topic });

    if (error) {
      console.error("Error creating session log:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in createSessionLog:", error);
    return null;
  }
};

/**
 * End session log in the database
 */
export const endSessionLog = async (sessionId: string, performanceData?: any) => {
  try {
    const { error } = await supabase.rpc(
      'end_session_log',
      { 
        log_id: sessionId,
        performance_data: performanceData ? JSON.stringify(performanceData) : null
      }
    );

    if (error) {
      console.error("Error ending session log:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in endSessionLog:", error);
    return false;
  }
};

/**
 * Update session topic in the database
 */
export const updateSessionTopic = async (sessionId: string, topic: string) => {
  try {
    const { error } = await supabase.rpc(
      'update_session_topic',
      { log_id: sessionId, topic }
    );

    if (error) {
      console.error("Error updating session topic:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
    return false;
  }
};

/**
 * Save a chat message to the database
 */
export const saveChatMessage = async (
  conversationId: string,
  content: string,
  sender: string,
  isImportant: boolean = false
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        sender,
        is_important: isImportant
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving chat message:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in saveChatMessage:', err);
    return null;
  }
};

/**
 * Get the chat history for a conversation
 */
export const getChatHistory = async (conversationId: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('Error in getChatHistory:', err);
    return [];
  }
};
