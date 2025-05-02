
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
      .select('id, user_id')
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

    // Generate a summary (this is a simple implementation - in production we would use AI)
    // For now we'll just use the first message as a summary
    const firstUserMessage = messages.find(msg => msg.sender === 'user')?.content || '';
    const summary = firstUserMessage.length > 100 
      ? firstUserMessage.substring(0, 100) + '...' 
      : firstUserMessage;

    // Update the conversation with the summary
    const { error: updateError } = await supabaseClient
      .from('conversations')
      .update({ summary })
      .eq('id', conversation_id);
    
    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
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
