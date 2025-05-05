
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserSchoolId } from "./schoolUtils";

/**
 * Get all conversations for the current user
 */
export const getConversations = async () => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    // Fetch all conversations for the user
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error("Error getting conversations:", error);
    return { data: null, error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Get chat history for a conversation
 */
export const getChatHistory = async (conversationId: string) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    // Fetch the conversation to verify ownership
    const { data: conversation, error: convoError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (convoError || !conversation) {
      return { data: null, error: "Conversation not found or access denied" };
    }

    // Fetch messages for the conversation
    const { data: messages, error: msgsError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true });

    if (msgsError) {
      throw msgsError;
    }

    return {
      data: {
        messages,
        conversation
      },
      error: null
    };
  } catch (error: any) {
    console.error("Error getting chat history:", error);
    return { data: null, error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Save a chat message to the database
 */
export const saveChatMessage = async (message: any, conversationId?: string, sessionId?: string) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    // Get user's school ID
    const schoolId = await getCurrentUserSchoolId();
    if (!schoolId) {
      return { data: null, error: "Could not determine school ID" };
    }

    // Ensure we have the required data
    if (!message || !message.role || !message.content) {
      return { data: null, error: "Message data is incomplete" };
    }

    let convoId = conversationId;

    // If no conversation ID is provided, create a new conversation
    if (!convoId) {
      const { data: convoData, error: convoError } = await supabase
        .from("conversations")
        .insert([{
          user_id: user.id,
          school_id: schoolId,
          title: `New conversation on ${new Date().toLocaleDateString()}`,
          last_message_at: new Date().toISOString()
        }])
        .select("id")
        .single();

      if (convoError) {
        throw convoError;
      }
      
      convoId = convoData.id;
    } else {
      // Update the last_message_at for the existing conversation
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convoId);
    }

    // Save the message to the database
    const { data: msgData, error: msgError } = await supabase
      .from("messages")
      .insert([{
        conversation_id: convoId,
        content: message.content,
        sender: message.role,
      }])
      .select("*")
      .single();

    if (msgError) {
      throw msgError;
    }

    // If session ID is provided, increment the session query count
    if (sessionId) {
      // Get current query count
      const { data: sessionData } = await supabase
        .from("session_logs")
        .select("num_queries")
        .eq("id", sessionId)
        .single();
        
      if (sessionData) {
        // Increment query count
        await supabase
          .from("session_logs")
          .update({ num_queries: (sessionData.num_queries || 0) + 1 })
          .eq("id", sessionId);
      }
    }

    return {
      data: {
        success: true,
        message: msgData,
        conversationId: convoId
      },
      error: null
    };
  } catch (error: any) {
    console.error("Error saving chat message:", error);
    return { data: null, error: error.message || "An unexpected error occurred" };
  }
};
