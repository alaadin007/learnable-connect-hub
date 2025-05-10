
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
    console.log("Processing save-chat-message request");
    
    // Get the request body
    const requestBody = await req.json();
    const { message, conversationId, sessionId } = requestBody;
    
    console.log("Request data:", JSON.stringify({
      messageId: message?.id,
      messageRole: message?.role,
      conversationId,
      sessionId
    }));
    
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
    
    console.log(`Processing message for user ID: ${user.id}`);

    // Get user's school ID
    const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
    
    if (schoolError) {
      console.error("Error getting user school ID:", schoolError);
      throw schoolError;
    }
    
    console.log(`User school ID: ${schoolData}`);

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
      console.log("Creating new conversation");
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
        throw convoError;
      }
      convoId = convoData.id;
      console.log(`Created new conversation with ID: ${convoId}`);
    } else {
      // Update the last_message_at for the existing conversation
      console.log(`Updating last_message_at for conversation ID: ${convoId}`);
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    }

    // Save the message to the database
    console.log(`Saving message to conversation ID: ${convoId}`);
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
      throw msgError;
    }
    
    console.log(`Message saved successfully with ID: ${msgData.id}`);

    // If session ID is provided, update the session query count
    if (sessionId) {
      console.log(`Incrementing query count for session ID: ${sessionId}`);
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
