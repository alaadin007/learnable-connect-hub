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
