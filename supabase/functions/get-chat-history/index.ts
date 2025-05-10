
// This function retrieves chat history for a conversation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  let conversationId;
  try {
    // Extract conversation ID either from URL params or request body
    const url = new URL(req.url);
    conversationId = url.searchParams.get('conversationId');
    
    // If not in URL, check if it's in the body
    if (!conversationId) {
      const body = await req.json();
      conversationId = body.conversationId;
    }
  } catch (error) {
    // If JSON parsing fails, continue with URL param only
    console.error("Error parsing request body:", error);
  }

  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Conversation ID is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  console.log(`Retrieving chat history for conversation ID: ${conversationId}`);

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user ID from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User validation error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`User ID: ${user.id}`);

    // Fetch conversation to verify ownership
    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convoError) {
      console.error("Error fetching conversation:", convoError);
      return new Response(JSON.stringify({ error: "Conversation not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Found conversation with title: "${conversation.title}"`);

    // Fetch messages for the conversation
    const { data: messages, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgsError) {
      console.error("Error fetching messages:", msgsError);
      throw msgsError;
    }
    
    console.log(`Retrieved ${messages?.length || 0} messages`);

    return new Response(JSON.stringify({ 
      messages: messages || [],
      conversation,
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in get-chat-history function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
