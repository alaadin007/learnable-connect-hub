
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
    const { question, topic, documentId, sessionId } = await req.json();
    
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

    // Get document content if documentId is provided
    let documentContext = "";
    if (documentId) {
      const { data: documentContent, error: docError } = await supabase
        .from("document_content")
        .select("content")
        .eq("document_id", documentId);
      
      if (!docError && documentContent && documentContent.length > 0) {
        documentContext = documentContent.map(item => item.content).join("\n");
      }
    }

    // Create system prompt based on context available
    let systemPrompt = "You are an educational AI assistant helping students learn.";
    
    if (topic) {
      systemPrompt += ` The current topic is: ${topic}.`;
    }
    
    if (documentContext) {
      systemPrompt += ` Use the following document context to answer questions: ${documentContext.substring(0, 3000)}...`;
    }
    
    systemPrompt += " Be helpful, accurate, and educational in your responses. For math problems, show your work. For factual questions, provide reliable information. If unsure about something, acknowledge the uncertainty rather than providing incorrect information.";

    // Make request to OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using a recommended model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
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

    // Return the AI's response
    return new Response(JSON.stringify({ 
      response: aiResponse,
      model: openAIData.model || "gpt-4o-mini",
      sessionId: sessionId || null,
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
