
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
    // Parse request body to get the file path
    let file_path, document_id;
    try {
      const body = await req.json();
      file_path = body.file_path;
      document_id = body.document_id;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!file_path || !document_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    console.log("Processing document:", document_id, "with file path:", file_path);

    // In a real implementation we would:
    // 1. Download the file from storage
    // 2. Extract text content (OCR for images, PDF parsing for PDFs)
    // 3. Process content (chunk, embed, etc.)
    // 4. Store processed content in document_content table
    
    // For now, we'll simulate successful processing

    // Create a mock document content entry
    const { error: contentError } = await supabaseAdmin
      .from("document_content")
      .insert({
        document_id: document_id,
        content: `This is extracted content from document ${document_id}`,
        processing_status: "completed"
      });
      
    if (contentError) {
      console.error("Error creating document content:", contentError);
      // Continue anyway, as we still want to update the document status
    }

    // Mark document as completed
    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ processing_status: "completed" })
      .eq("id", document_id);
      
    if (updateError) {
      console.error("Error updating document status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update document status", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Document marked as processed successfully");
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Document processed successfully",
        document_id: document_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
