
import { supabase } from "@/integrations/supabase/client";

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
