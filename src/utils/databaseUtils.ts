
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// User profile functions
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(userId: string, profileData: any) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    toast.error('Failed to update profile');
    return null;
  }
}

// Teacher management functions
export async function inviteTeacherDirect(email: string) {
  try {
    const { data, error } = await supabase.functions.invoke('invite-teacher', {
      body: { email }
    });
    
    if (error) throw error;
    return { success: true, ...data };
  } catch (error: any) {
    console.error('Error inviting teacher:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send invitation'
    };
  }
}

// Student management functions
export async function inviteStudentDirect(inviteType: 'code' | 'email', email?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('invite-student', {
      body: { inviteType, email }
    });
    
    if (error) throw error;
    return { 
      success: true, 
      code: data.code,
      invitation_id: data.invite_id
    };
  } catch (error: any) {
    console.error('Error creating student invitation:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to create invitation'
    };
  }
}

export async function approveStudentDirect(studentId: string) {
  try {
    const { error } = await supabase.functions.invoke('approve-student', {
      body: { studentId }
    });
    
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error approving student:', error);
    return false;
  }
}

export async function revokeStudentAccessDirect(studentId: string) {
  try {
    const { error } = await supabase.functions.invoke('revoke-student-access', {
      body: { studentId }
    });
    
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error revoking student access:', error);
    return false;
  }
}

// Session logging functions
export async function createSessionLog(topic?: string) {
  try {
    const { data, error } = await supabase.rpc('create_session_log', {
      topic
    });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating session log:', error);
    return null;
  }
}

export async function endSessionLog(sessionId: string, performanceData?: any) {
  try {
    const { error } = await supabase.rpc('end_session_log', {
      log_id: sessionId,
      performance_data: performanceData
    });
    
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error ending session log:', error);
    return false;
  }
}

// Add the missing updateSessionTopic function
export async function updateSessionTopic(sessionId: string, topic: string) {
  try {
    const { error } = await supabase.rpc('update_session_topic', {
      log_id: sessionId,
      topic
    });
    
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error updating session topic:', error);
    return false;
  }
}

// Document management functions
export async function uploadDocument(file: File, userId: string, schoolId: string) {
  try {
    // Generate a unique path for the file
    const filePath = `${schoolId}/${userId}/${Date.now()}_${file.name}`;
    
    // Upload file to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);
      
    if (storageError) throw storageError;
    
    // Create document record in the database - fix property name filetype to file_type
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        school_id: schoolId,
        filename: file.name,
        file_type: file.type, // Changed from filetype to file_type
        storage_path: filePath,
        file_size: file.size
      })
      .select()
      .single();
      
    if (documentError) throw documentError;
    
    // Trigger document processing if needed
    if (file.type === 'application/pdf' || file.type.startsWith('text/')) {
      await supabase.functions.invoke('process-document', {
        body: { documentId: documentData.id }
      });
    }
    
    return documentData;
  } catch (error: any) {
    console.error('Error uploading document:', error);
    toast.error('Failed to upload document');
    return null;
  }
}

export async function getDocuments(userId: string) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return [];
  }
}
