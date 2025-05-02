
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client with the authorization token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get conversation_id from request
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "Conversation ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has permission to access this conversation
    const { data: conversationData, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('id, user_id, topic, title')
      .eq('id', conversation_id)
      .single();
    
    if (conversationError) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Get user information
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Verify user has permission for this conversation
    if (conversationData.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized access to conversation" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the conversation messages
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('content, sender')
      .eq('conversation_id', conversation_id)
      .order('timestamp', { ascending: true });
    
    if (messagesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found in conversation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a better summary using the first user messages
    // Look for the first 2-3 user messages to create a more comprehensive summary
    const userMessages = messages.filter(msg => msg.sender === 'user').slice(0, 3);
    let summary = '';
    
    if (userMessages.length > 0) {
      // If we have a topic, include it in the summary
      if (conversationData.topic) {
        summary = `Topic: ${conversationData.topic} - `;
      }
      
      // Add content from the first few user messages
      for (let i = 0; i < Math.min(2, userMessages.length); i++) {
        const content = userMessages[i].content;
        const shortenedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        summary += (i > 0 ? ' | ' : '') + shortenedContent;
      }
    } else {
      summary = conversationData.title || "Untitled conversation";
    }
    
    // Generate tags based on content analysis
    const allText = userMessages.map(msg => msg.content).join(' ');
    const tags = generateTags(allText, conversationData.topic);
    
    // Determine a category based on content or existing title/topic
    const category = determineCategory(allText, conversationData.topic);

    // Update the conversation with the summary, tags and category
    const { error: updateError } = await supabaseClient
      .from('conversations')
      .update({ 
        summary, 
        tags,
        category: category || null,
        title: conversationData.title || generateTitle(summary)
      })
      .eq('id', conversation_id);
    
    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, summary, tags, category }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Function to generate tags from conversation content
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

// Function to determine category based on content analysis
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

// Generate a title from the summary
function generateTitle(summary: string): string {
  // Extract first part of summary (max 50 chars) for title
  const titleText = summary.length > 50 ? summary.substring(0, 47) + '...' : summary;
  return titleText;
}
