
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
      status: 204,
    });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { documentId, action, options = {} } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Get document details
    const { data: document, error: documentError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (documentError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Process based on action requested
    switch (action) {
      case "summarize":
        return await handleSummarization(document, supabaseClient, corsHeaders);
      case "extract_flashcards":
        return await handleFlashcardExtraction(document, supabaseClient, corsHeaders, options);
      case "analyze":
        return await handleDocumentAnalysis(document, supabaseClient, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
    }
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

async function handleSummarization(document, supabaseClient, corsHeaders) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    // Get document content
    const { data: documentContent, error: contentError } = await supabaseClient
      .from("document_content")
      .select("content")
      .eq("document_id", document.id)
      .order("section_number", { ascending: true });
    
    if (contentError) {
      throw new Error("Failed to fetch document content");
    }
    
    // Combine all content sections
    const fullContent = documentContent.map(section => section.content).join("\n\n");
    
    // Call OpenAI for summarization
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational assistant. Your task is to create a concise, informative summary of the document provided. Focus on the main points, key concepts, and important details. Structure the summary with bullet points for key takeaways."
          },
          { role: "user", content: `Please summarize this document: ${fullContent.substring(0, 16000)}` }
        ],
        temperature: 0.5,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to generate summary");
    }
    
    const summary = data.choices[0].message.content;
    
    // Store the summary in the database
    const { error: summaryError } = await supabaseClient
      .from("document_summaries")
      .upsert({
        document_id: document.id,
        summary,
        created_at: new Date().toISOString(),
      });
    
    if (summaryError) {
      throw new Error("Failed to save summary");
    }
    
    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in summarization:", error);
    return new Response(
      JSON.stringify({ error: "Failed to summarize document", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

async function handleFlashcardExtraction(document, supabaseClient, corsHeaders, options) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const { count = 10, difficulty = "medium" } = options;
    
    // Get document content
    const { data: documentContent, error: contentError } = await supabaseClient
      .from("document_content")
      .select("content")
      .eq("document_id", document.id)
      .order("section_number", { ascending: true });
    
    if (contentError) {
      throw new Error("Failed to fetch document content");
    }
    
    // Combine all content sections
    const fullContent = documentContent.map(section => section.content).join("\n\n");
    
    // Call OpenAI for flashcard generation
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert in creating educational flashcards. Create ${count} flashcards with ${difficulty} difficulty level based on the document provided. Each flashcard should have a front (question/term) and back (answer/definition). Return the flashcards in this JSON format: [{"front": "question", "back": "answer"},...]`
          },
          { role: "user", content: `Generate flashcards from this content: ${fullContent.substring(0, 16000)}` }
        ],
        temperature: 0.7,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to generate flashcards");
    }
    
    // Extract JSON from the response
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error("Failed to parse flashcards");
    }
    
    const flashcards = JSON.parse(jsonMatch[0]);
    
    // Store flashcards in the database
    const flashcardPromises = flashcards.map(card => {
      return supabaseClient
        .from("flashcards")
        .insert({
          user_id: document.user_id,
          document_id: document.id, 
          front: card.front,
          back: card.back,
          difficulty: difficulty,
          created_at: new Date().toISOString(),
        });
    });
    
    await Promise.all(flashcardPromises);
    
    return new Response(
      JSON.stringify({ flashcards }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in flashcard extraction:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract flashcards", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

async function handleDocumentAnalysis(document, supabaseClient, corsHeaders) {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    // Get document content
    const { data: documentContent, error: contentError } = await supabaseClient
      .from("document_content")
      .select("content")
      .eq("document_id", document.id)
      .order("section_number", { ascending: true });
    
    if (contentError) {
      throw new Error("Failed to fetch document content");
    }
    
    // Combine all content sections
    const fullContent = documentContent.map(section => section.content).join("\n\n");
    
    // Call OpenAI for analysis
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert educational analyst. Analyze the document and extract the following information: 1) Main topics covered, 2) Key concepts that might be challenging for students, 3) Suggested learning objectives. Return your analysis in JSON format: {\"topics\": [...], \"challenging_concepts\": [...], \"learning_objectives\": [...]}"
          },
          { role: "user", content: `Analyze this document: ${fullContent.substring(0, 16000)}` }
        ],
        temperature: 0.5,
      }),
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Failed to analyze document");
    }
    
    // Extract JSON from the response
    const content = data.choices[0].message.content;
    let analysis;
    try {
      // Try to parse the whole response as JSON
      analysis = JSON.parse(content);
    } catch {
      // If that fails, try to find a JSON object in the text
      const jsonMatch = content.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse analysis");
      }
      analysis = JSON.parse(jsonMatch[0]);
    }
    
    // Store analysis in the database
    const { error: analysisError } = await supabaseClient
      .from("document_analyses")
      .upsert({
        document_id: document.id,
        topics: analysis.topics,
        challenging_concepts: analysis.challenging_concepts,
        learning_objectives: analysis.learning_objectives,
        created_at: new Date().toISOString(),
      });
    
    if (analysisError) {
      throw new Error("Failed to save analysis");
    }
    
    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in document analysis:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze document", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}
