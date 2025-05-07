
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Create session log in database
export const createSessionLog = async (topic?: string): Promise<string | null> => {
  try {
    // Use the RPC function directly
    const { data, error } = await supabase.rpc("create_session_log", {
      topic: topic || "General Chat"
    });

    if (error) {
      console.error("Error creating session log:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error in createSessionLog:", error);
    return null;
  }
};

// End session log in database
export const endSessionLog = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to end");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("end_session_log", {
      log_id: sessionId,
      performance_data: performanceData
    });

    if (error) {
      console.error("Error ending session:", error);
    }
  } catch (error) {
    console.error("Error in endSessionLog:", error);
  }
};

// Update session topic in database
export const updateSessionTopic = async (sessionId: string, topic: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to update topic");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("update_session_topic", {
      log_id: sessionId,
      topic
    });

    if (error) {
      console.error("Error updating session topic:", error);
    }
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
  }
};

// Save chat message directly to database
export const saveChatMessage = async (
  message: { role: string; content: string },
  conversationId?: string,
  sessionId?: string
): Promise<{ success: boolean; message?: any; conversationId?: string }> => {
  try {
    if (!message || !message.role || !message.content) {
      console.error("Invalid message data");
      return { success: false };
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false };
    }

    // Get user's school ID
    const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
    if (schoolError) {
      console.error("Error getting school ID:", schoolError);
      return { success: false };
    }

    let convoId = conversationId;

    // If no conversation ID is provided, create a new conversation
    if (!convoId) {
      const { data: convoData, error: convoError } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: user.id, 
          school_id: schoolData,
          title: `New conversation on ${new Date().toLocaleDateString()}`,
          last_message_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (convoError) {
        console.error("Error creating conversation:", convoError);
        return { success: false };
      }
      convoId = convoData.id;
    } else {
      // Update the last_message_at for the existing conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    }

    // Save the message to the database
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: convoId,
        content: message.content,
        sender: message.role,
      }])
      .select('*')
      .single();

    if (msgError) {
      console.error("Error saving message:", msgError);
      return { success: false };
    }

    // If session ID is provided, update the session query count
    if (sessionId) {
      await supabase.rpc("increment_session_query_count", { log_id: sessionId });
    }

    return { 
      success: true, 
      message: msgData,
      conversationId: convoId
    };
  } catch (error) {
    console.error("Error in saveChatMessage:", error);
    return { success: false };
  }
};

// Get chat history directly from database
export const getChatHistory = async (conversationId: string): Promise<{ 
  messages: any[]; 
  conversation: any;
} | null> => {
  try {
    // Fetch conversation to verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convoError || !conversation) {
      console.error("Error fetching conversation:", convoError);
      return null;
    }

    // Fetch messages for the conversation
    const { data: messages, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgsError) {
      console.error("Error fetching messages:", msgsError);
      return null;
    }

    return { 
      messages: messages || [],
      conversation
    };
  } catch (error) {
    console.error("Error in getChatHistory:", error);
    return null;
  }
};

// Get user conversations directly from database
export const getUserConversations = async (): Promise<any[] | null> => {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Fetch all conversations for the user
    const { data: conversations, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (convoError) {
      console.error("Error fetching conversations:", convoError);
      return null;
    }

    return conversations || [];
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    return null;
  }
};

// Generate summary for conversation directly
export const generateConversationSummary = async (conversationId: string): Promise<{
  summary?: string;
  tags?: string[];
  category?: string;
} | null> => {
  try {
    // Verify the user can access this conversation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .select('id, user_id, topic, title')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();
    
    if (convoError || !conversation) {
      console.error("Conversation not found or access denied:", convoError);
      return null;
    }

    // Get the conversation messages
    const { data: messages, error: msgsError } = await supabase
      .from('messages')
      .select('content, sender')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (msgsError || !messages || messages.length === 0) {
      console.error("Failed to fetch messages:", msgsError);
      return null;
    }

    // Generate a summary based on the first few user messages
    const userMessages = messages.filter(msg => msg.sender === 'user').slice(0, 3);
    let summary = '';
    
    if (userMessages.length > 0) {
      // If we have a topic, include it in the summary
      if (conversation.topic) {
        summary = `Topic: ${conversation.topic} - `;
      }
      
      // Add content from the first few user messages
      for (let i = 0; i < Math.min(2, userMessages.length); i++) {
        const content = userMessages[i].content;
        const shortenedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        summary += (i > 0 ? ' | ' : '') + shortenedContent;
      }
    } else {
      summary = conversation.title || "Untitled conversation";
    }
    
    // Generate simple tags based on content
    const allText = userMessages.map(msg => msg.content).join(' ');
    const tags = generateTags(allText, conversation.topic);
    
    // Determine a category
    const category = determineCategory(allText, conversation.topic);

    // Update the conversation with the summary, tags and category
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        summary, 
        tags,
        category: category || null,
        title: conversation.title || generateTitle(summary)
      })
      .eq('id', conversationId);
    
    if (updateError) {
      console.error("Failed to update conversation:", updateError);
    }

    return { summary, tags, category };
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
};

// Helper functions for summary generation
function generateTags(text: string, topic: string | null): string[] {
  const tags: Set<string> = new Set();
  
  // Add topic-based tags
  if (topic) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    topicWords.forEach(word => {
      if (word.length > 3) {
        tags.add(word);
      }
    });
  }
  
  // Common academic subjects to look for
  const subjects = [
    "math", "algebra", "calculus", "geometry", "physics", "chemistry", "biology",
    "history", "geography", "literature", "english", "writing", "grammar",
    "science", "computer", "programming", "language", "spanish", "french",
    "psychology", "sociology", "economics", "philosophy", "music", "art"
  ];
  
  // Look for subject mentions in the text
  const lowercaseText = text.toLowerCase();
  subjects.forEach(subject => {
    if (lowercaseText.includes(subject)) {
      tags.add(subject);
    }
  });
  
  // Convert set to array and limit to top 5 tags
  return Array.from(tags).slice(0, 5);
}

function determineCategory(text: string, topic: string | null): string | null {
  const lowercaseText = text.toLowerCase();
  const topicLower = topic ? topic.toLowerCase() : '';
  
  // Define category mapping with keywords
  const categories = {
    "Homework": ["homework", "assignment", "exercise", "problem set", "worksheet"],
    "Exam Prep": ["exam", "test", "quiz", "study", "review", "midterm", "final"],
    "Research": ["research", "paper", "essay", "thesis", "analysis", "investigate"],
    "General Question": ["question", "explain", "how to", "what is", "why does", "help me understand"],
    "Project": ["project", "build", "create", "design", "develop", "implement"]
  };
  
  // Check for category matches
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword) || (topicLower && topicLower.includes(keyword))) {
        return category;
      }
    }
  }
  
  return null;
}

function generateTitle(summary: string): string {
  // Extract first part of summary (max 50 chars) for title
  const titleText = summary.length > 50 ? summary.substring(0, 47) + '...' : summary;
  return titleText;
}

// Student management functions
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

// Helper function to generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes similar looking characters
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Teacher management functions
export const inviteTeacherDirect = async (email: string): Promise<{
  success: boolean;
  inviteId?: string;
  message?: string;
}> => {
  try {
    // Verify the user is logged in and is a school supervisor
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if user is a school supervisor
    const { data: isSupervisor, error: supervisorError } = await supabase
      .rpc("is_supervisor", { user_id: user.id });

    if (supervisorError || !isSupervisor) {
      return { success: false, message: "Only school supervisors can invite teachers" };
    }

    if (!email) {
      return { success: false, message: "Email is required" };
    }

    // Use RPC to invite teacher with existing function
    const { data: inviteResult, error: inviteError } = await supabase
      .rpc("invite_teacher", {
        teacher_email: email
      });

    if (inviteError) {
      console.error("Error inviting teacher:", inviteError);
      return { success: false, message: inviteError.message };
    }

    return { 
      success: true, 
      inviteId: inviteResult,
      message: "Teacher invitation sent successfully" 
    };
  } catch (error) {
    console.error("Error in inviteTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};

export const createTeacherDirect = async (email: string, full_name?: string): Promise<{
  success: boolean;
  message?: string;
  data?: {
    email: string;
    temp_password?: string;
  };
}> => {
  try {
    // This function uses admin privileges and must be run server-side
    // Since we're replacing edge functions, this would normally require an edge function
    // As a compromise, we'll indicate this limitation
    
    toast.error("Direct teacher creation requires server-side privileges");
    return { 
      success: false, 
      message: "Teacher creation requires admin privileges and cannot be performed directly from the browser. This would typically require server-side code."
    };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    return { success: false, message: "Internal error" };
  }
};

// Test account utilities
export const populateTestAccountWithSessionsDirect = async (userId: string, schoolId: string, numSessions = 5): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}> => {
  try {
    // Skip calls for non-test users or if missing required IDs
    if (!userId || !schoolId) {
      return { success: false, message: "Missing user ID or school ID" };
    }
    
    // Detect if this is a test account
    const isTest = userId.startsWith('test-') || schoolId.startsWith('test-');
    if (!isTest) {
      // Only create test sessions for test accounts
      return { success: false, message: "Not a test account" };
    }
    
    console.log(`Creating test sessions for ${userId} in school ${schoolId}`);
    
    // Call the database function directly
    const { error } = await supabase.rpc("populatetestaccountwithsessions", {
      userid: userId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error("Error creating test sessions:", error);
      return { success: false, message: error.message };
    }
    
    console.log("Test sessions created successfully");
    return { success: true, message: "Test sessions created successfully" };
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    return { success: false, message: error.message };
  }
};
