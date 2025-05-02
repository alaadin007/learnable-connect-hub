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

    // Find relevant documents based on question if useDocuments is true
    let documentContexts = [];
    let sourceCitations = [];
    
    if (useDocuments) {
      // If specific document is provided, use it
      if (documentId) {
        const { data: documentContent, error: docError } = await supabase
          .from("document_content")
          .select("content, document_id")
          .eq("document_id", documentId)
          .order("section_number", { ascending: true });
        
        if (!docError && documentContent && documentContent.length > 0) {
          // Get document metadata for citation
          const { data: docMetadata } = await supabase
            .from("documents")
            .select("filename")
            .eq("id", documentId)
            .single();
            
          documentContexts.push({
            content: documentContent.map(section => section.content).join("\n\n"),
            document_id: documentId,
            relevance_score: 1.0
          });
          
          if (docMetadata) {
            sourceCitations.push({
              document_id: documentId,
              filename: docMetadata.filename,
              relevance_score: 1.0
            });
          }
        }
      } 
      // Otherwise do a search across all user's documents
      else {
        // Get the user's documents
        const { data: userDocs } = await supabase
          .from("documents")
          .select("id, filename")
          .eq("user_id", user.id)
          .eq("processing_status", "completed");
        
        if (userDocs && userDocs.length > 0) {
          // Simple keyword search - extract keywords from question
          const keywords = question.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !['what', 'when', 'where', 'which', 'how', 'why', 'who', 'that', 'this', 'these', 'those'].includes(word));
          
          // Search for relevant content in each document
          for (const doc of userDocs) {
            const { data: docContent } = await supabase
              .from("document_content")
              .select("content")
              .eq("document_id", doc.id);
              
            if (docContent && docContent.length > 0) {
              // Combine all sections into a single string for search
              const fullText = docContent.map(section => section.content).join(" ");
              const lowerText = fullText.toLowerCase();
              
              // Count keyword matches to determine relevance
              const matchCount = keywords.reduce((count, keyword) => {
                return count + (lowerText.includes(keyword) ? 1 : 0);
              }, 0);
              
              // Only include documents with at least one keyword match
              if (matchCount > 0) {
                const relevanceScore = matchCount / keywords.length;
                
                // Extract a relevant excerpt (a few sentences around the first match)
                let excerpt = "";
                if (keywords.length > 0) {
                  const firstMatchingKeyword = keywords.find(kw => lowerText.includes(kw));
                  if (firstMatchingKeyword) {
                    const matchIndex = lowerText.indexOf(firstMatchingKeyword);
                    const startIndex = Math.max(0, lowerText.lastIndexOf(".", matchIndex) + 1);
                    const endIndex = Math.min(lowerText.length, lowerText.indexOf(".", matchIndex + 100) + 1);
                    if (startIndex < endIndex) {
                      excerpt = fullText.substring(startIndex, endIndex).trim();
                    }
                  }
                }
                
                documentContexts.push({
                  content: fullText,
                  document_id: doc.id,
                  relevance_score: relevanceScore
                });
                
                sourceCitations.push({
                  document_id: doc.id,
                  filename: doc.filename,
                  relevance_score: relevanceScore,
                  excerpt: excerpt
                });
              }
            }
          }
        }
      }
    }
    
    // Sort documents by relevance and take top 3
    documentContexts.sort((a, b) => b.relevance_score - a.relevance_score);
    sourceCitations.sort((a, b) => b.relevance_score - a.relevance_score);
    
    const topDocuments = documentContexts.slice(0, 3);
    const topCitations = sourceCitations.slice(0, 3);
    
    // Create document context string for the prompt
    let documentContext = "";
    if (topDocuments.length > 0) {
      documentContext = "Here is relevant information from the user's documents:\n\n";
      topDocuments.forEach((doc, index) => {
        // Truncate content if it's too long
        const truncatedContent = doc.content.length > 3000 
          ? doc.content.substring(0, 3000) + "..." 
          : doc.content;
          
        documentContext += `Document ${index + 1}: ${truncatedContent}\n\n`;
      });
    }

    // Create system prompt based on available context
    let systemPrompt = "You are an educational AI assistant helping students learn.";
    
    if (topic) {
      systemPrompt += ` The current topic is: ${topic}.`;
    }
    
    if (documentContext) {
      systemPrompt += " " + documentContext;
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

    // Return the AI's response along with source citations if available
    return new Response(JSON.stringify({ 
      response: aiResponse,
      model: openAIData.model || "gpt-4o-mini",
      sessionId: sessionId || null,
      sourceCitations: topCitations.length > 0 ? topCitations : undefined,
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
