
// This function handles saving chat messages to the database

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

  try {
    // Get the request body
    const { message, conversationId, sessionId } = await req.json();
    
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
      return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's school ID
    const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
    
    if (schoolError) {
      throw schoolError;
    }

    // Ensure we have the required data
    if (!message || !message.role || !message.content) {
      return new Response(JSON.stringify({ error: "Message data is incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        throw convoError;
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
      throw msgError;
    }

    // If session ID is provided, update the session query count
    if (sessionId) {
      await supabase.rpc("increment_session_query_count", { log_id: sessionId });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: msgData,
      conversationId: convoId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in save-chat-message function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
