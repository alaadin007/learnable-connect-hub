
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get environment variables
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    // Create Supabase client
    const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string);
    
    // Get the request body
    const { question, topic, documentId, sessionId, conversationId, useDocuments = true } = await req.json();
    
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user ID from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment query count if sessionId is provided
    if (sessionId) {
      await supabase.rpc("increment_session_query_count", { log_id: sessionId });
    }

    // Get previous conversation context if conversationId is provided
    let conversationContext = "";
    if (conversationId) {
      const { data: previousMessages, error: prevMsgError } = await supabase
        .from("messages")
        .select("content, sender")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: true })
        .limit(10); // Limit to last 10 messages for context
      
      if (!prevMsgError && previousMessages && previousMessages.length > 0) {
        conversationContext = previousMessages
          .map(msg => `${msg.sender === 'user' ? 'Student' : 'AI'}: ${msg.content}`)
          .join("\n\n");
      }
    }

    // Get document content if documentId is provided and useDocuments is true
    let documentContext = "";
    if (documentId && useDocuments) {
      const { data: documentContent, error: docError } = await supabase
        .from("document_content")
        .select("content")
        .eq("document_id", documentId);
      
      if (!docError && documentContent && documentContent.length > 0) {
        documentContext = documentContent.map(item => item.content).join("\n");
      }
    } else if (useDocuments) {
      // If no specific document is requested but useDocuments is true, 
      // we could get the most relevant documents based on the topic
      // This is just a placeholder for potential future enhancement
    }

    // Create system prompt based on available context
    let systemPrompt = "You are an educational AI assistant helping students learn.";
    
    if (topic) {
      systemPrompt += ` The current topic is: ${topic}.`;
    }
    
    if (documentContext) {
      systemPrompt += ` Use the following document context to answer questions: ${documentContext.substring(0, 3000)}...`;
    }

    if (conversationContext) {
      systemPrompt += " Here is the conversation history to provide context:\n\n" + conversationContext;
    }
    
    systemPrompt += " Be helpful, accurate, and educational in your responses. For math problems, show your work. For factual questions, provide reliable information. If unsure about something, acknowledge the uncertainty rather than providing incorrect information.";

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // If we have conversation context, don't add it to the messages
    // as we've already included it in the system prompt for context
    if (!conversationContext) {
      messages.push({ role: "user", content: question });
    } else {
      // If we have conversation context, just add the latest question
      messages.push({ role: "user", content: question });
    }

    // Make request to OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using a recommended model
        messages: messages,
        temperature: 0.5,
      }),
    });

    const openAIData = await openAIResponse.json();

    if (openAIData.error) {
      console.error("OpenAI API error:", openAIData.error);
      return new Response(JSON.stringify({ error: "Error getting response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the AI's response
    const aiResponse = openAIData.choices[0].message.content;

    // Prepare source citations if documents were used
    let sourceCitations = [];
    if (documentId && documentContext) {
      sourceCitations.push({
        document_id: documentId,
        filename: "Referenced Document", // Ideally we would fetch the actual filename
        relevance_score: 1.0
      });
    }

    // Return the AI's response
    return new Response(JSON.stringify({ 
      response: aiResponse,
      model: openAIData.model || "gpt-4o-mini",
      sessionId: sessionId || null,
      sourceCitations: sourceCitations.length > 0 ? sourceCitations : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ask-ai function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
