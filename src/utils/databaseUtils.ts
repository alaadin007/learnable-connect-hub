
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

    // For email invites - note that supabase doesn't have inviteUserByEmail anymore
    // Using sign-up with role data instead
    if (method === 'email' && email) {
      // Get the current user's school
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        return { success: false, message: "Not authenticated" };
      }
      
      // Get the profile of the current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userData.user.id)
        .single();
        
      if (!profileData?.school_id) {
        return { success: false, message: "No school associated with your account" };
      }
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).substring(2, 10) + 
                          Math.random().toString(36).substring(2, 10) + 
                          "!A1";
      
      // Create an invitation token
      const token = Math.random().toString(36).substring(2, 15);
      
      // Insert into student_invites
      const { error: inviteError } = await supabase
        .from('student_invites')
        .insert({
          school_id: profileData.school_id,
          email: email,
          code: token,
          status: 'pending'
        });
        
      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return { success: false, message: inviteError.message };
      }

      return { 
        success: true, 
        message: `Invite prepared for ${email}`, 
        data: { email, token } 
      };
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

    // Generate token and insert invitation record
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

    return { success: true, message: `Invitation sent to ${email}`, token };
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
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', studentId)
      .select();

    if (error) {
      console.error("Error approving student:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in approveStudentDirect:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Revoke student access
 */
export const revokeStudentAccessDirect = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', studentId)
      .select();

    if (error) {
      console.error("Error revoking student access:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in revokeStudentAccessDirect:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Create session log in the database
 */
export const createSessionLog = async (topic: string) => {
  try {
    // First get the current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) {
      return { success: false, message: "User not authenticated" };
    }
    
    // Get user's school ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData?.school_id) {
      console.error("Error getting user profile:", profileError);
      return { success: false, message: "Could not determine school ID" };
    }
    
    // Insert session log directly
    const { data, error } = await supabase
      .from('session_logs')
      .insert({
        user_id: userData.user.id,
        school_id: profileData.school_id,
        topic_or_content_used: topic,
        session_start: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session log:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in createSessionLog:", error);
    return { success: false, message: error.message };
  }
};

/**
 * End session log in the database
 */
export const endSessionLog = async (sessionId: string, performanceData?: any) => {
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .update({ 
        session_end: new Date().toISOString(),
        performance_metric: performanceData ? JSON.stringify(performanceData) : null
      })
      .eq('id', sessionId)
      .select();

    if (error) {
      console.error("Error ending session log:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in endSessionLog:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Update session topic in the database
 */
export const updateSessionTopic = async (sessionId: string, topic: string) => {
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .update({ topic_or_content_used: topic })
      .eq('id', sessionId)
      .select();

    if (error) {
      console.error("Error updating session topic:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in updateSessionTopic:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Save a chat message to the database
 */
export const saveChatMessage = async (
  conversation_id: string,
  content: string,
  sender: string,
  is_important: boolean = false
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        content,
        sender,
        is_important
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
export const getChatHistory = async (conversation_id: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getChatHistory:', err);
    return [];
  }
};

/**
 * Get a user's profile data
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, school_id, school_name')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getUserProfile:', err);
    return null;
  }
};

/**
 * Get profile and school data for a teacher
 */
export const getTeacherWithProfile = async (teacherId: string) => {
  try {
    // First get teacher record
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('id, school_id, is_supervisor')
      .eq('id', teacherId)
      .single();
      
    if (teacherError) {
      console.error('Error fetching teacher data:', teacherError);
      return null;
    }
    
    // Then get profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, user_type')
      .eq('id', teacherId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return null;
    }
    
    // Return combined data
    return {
      ...teacherData,
      full_name: profileData.full_name,
      user_type: profileData.user_type
    };
  } catch (err) {
    console.error('Error in getTeacherWithProfile:', err);
    return null;
  }
};
