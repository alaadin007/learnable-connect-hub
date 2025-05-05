
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
      status: 204,
    });
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get request data
    const { 
      question, 
      sessionId, 
      context = "", 
      topic = "" 
    } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment query count for session if provided
    if (sessionId) {
      try {
        await supabaseClient.rpc("increment_session_query_count", {
          log_id: sessionId
        });

        // Update session topic if provided
        if (topic) {
          await supabaseClient.rpc("update_session_topic", {
            log_id: sessionId,
            topic
          });
        }
      } catch (error) {
        console.error("Error updating session log:", error);
        // Continue execution even if session update fails
      }
    }

    // Check for API keys
    // Try to get OpenAI API key first
    let { data: openaiKeyData } = await supabaseClient
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('provider', 'openai')
      .maybeSingle();

    if (openaiKeyData?.api_key) {
      // Call OpenAI API with user's key
      return await callOpenAI(openaiKeyData.api_key, question, context);
    }
    
    // Try Gemini if OpenAI key not found
    let { data: geminiKeyData } = await supabaseClient
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('provider', 'gemini')
      .maybeSingle();
      
    if (geminiKeyData?.api_key) {
      // Call Gemini API with user's key
      return await callGemini(geminiKeyData.api_key, question, context);
    }
    
    // No API keys found
    return new Response(
      JSON.stringify({ error: "No AI provider API key found. Please configure an API key in settings." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function callOpenAI(apiKey: string, question: string, context: string) {
  // Construct the prompt with context if available
  const systemPrompt = context 
    ? `You are an educational AI assistant helping a student learn. Use this context to inform your answers: ${context}`
    : "You are an educational AI assistant helping a student learn. Be helpful, accurate, and encouraging.";

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.7
    })
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.json();
    console.error("OpenAI API error:", errorData);
    return new Response(
      JSON.stringify({ error: "Error calling OpenAI API", details: errorData }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const openaiData = await openaiResponse.json();
  const answer = openaiData.choices[0].message.content;

  return new Response(
    JSON.stringify({ answer }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function callGemini(apiKey: string, question: string, context: string) {
  // Construct the prompt with context if available
  const prompt = context 
    ? `Context: ${context}\n\nQuestion: ${question}`
    : question;

  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "You are an educational AI assistant helping a student learn. Be helpful, accurate, and encouraging. " + prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    })
  });

  if (!geminiResponse.ok) {
    const errorData = await geminiResponse.json();
    console.error("Gemini API error:", errorData);
    return new Response(
      JSON.stringify({ error: "Error calling Gemini API", details: errorData }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const geminiData = await geminiResponse.json();
  const answer = geminiData.candidates[0].content.parts[0].text;

  return new Response(
    JSON.stringify({ answer }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
