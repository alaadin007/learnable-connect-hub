
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

    try {
      // First update document status to processing
      await supabaseAdmin
        .from("documents")
        .update({ processing_status: "processing" })
        .eq("id", document_id);

      // Download the file to extract content (simulation for now)
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from('user-content')
        .download(file_path);
        
      if (downloadError || !fileData) {
        console.error("Error downloading file:", downloadError);
        throw new Error(`Unable to download file: ${downloadError?.message || "Unknown error"}`);
      }

      // Create a mock document content entry 
      // In production this would be replaced with actual text extraction
      const { error: contentError } = await supabaseAdmin
        .from("document_content")
        .insert({
          document_id: document_id,
          content: `This is extracted content from document ${document_id}. 
                  In a real implementation, we would extract text from the file.
                  File size: ${fileData.size} bytes.`,
          processing_status: "completed"
        });
        
      if (contentError) {
        console.error("Error creating document content:", contentError);
        throw new Error(`Failed to store document content: ${contentError.message}`);
      }

      // Mark document as completed
      const { error: updateError } = await supabaseAdmin
        .from("documents")
        .update({ processing_status: "completed" })
        .eq("id", document_id);
        
      if (updateError) {
        console.error("Error updating document status:", updateError);
        throw new Error(`Failed to update document status: ${updateError.message}`);
      }
      
      console.log("Document processed successfully");
      
      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Document processed successfully",
          document_id: document_id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      // Handle processing errors by updating document status to failed
      console.error("Processing error:", processingError);
      
      // Update document status to failed
      await supabaseAdmin
        .from("documents")
        .update({ 
          processing_status: "failed"
        })
        .eq("id", document_id);
      
      throw processingError;
    }
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
