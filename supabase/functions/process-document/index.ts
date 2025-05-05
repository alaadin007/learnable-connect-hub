
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    
    // Parse the request body
    const { file_path } = await req.json();
    
    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "file_path is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("Processing document:", file_path);
    
    // Find the document record in the database
    const { data: documentData, error: documentError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('storage_path', file_path)
      .single();
    
    if (documentError || !documentData) {
      console.error("Error finding document:", documentError);
      return new Response(
        JSON.stringify({ 
          error: "Document not found in database",
          details: documentError?.message 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Update document status to processing
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentData.id);
    
    if (updateError) {
      console.error("Error updating document status:", updateError);
    }
    
    try {
      // Check if the file exists in storage
      const { data: fileData, error: fileError } = await supabaseClient
        .storage
        .from('user-content')
        .download(file_path);
      
      if (fileError) {
        throw new Error(`File storage error: ${fileError.message}`);
      }
      
      // Simplified mock document processing
      // In a real implementation, you would process the document content here
      
      // Create dummy content record
      const { error: contentError } = await supabaseClient
        .from('document_content')
        .insert({
          document_id: documentData.id,
          content: `This is extracted content from ${documentData.filename}. In a real implementation, this would contain the actual parsed content from the document.`,
          processing_status: 'completed'
        });
      
      if (contentError) {
        throw contentError;
      }
      
      // Mark document as processed
      const { error: completeError } = await supabaseClient
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', documentData.id);
      
      if (completeError) {
        console.error("Error marking document as completed:", completeError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Document processed successfully",
          document_id: documentData.id
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (processingError) {
      console.error("Error processing document:", processingError);
      
      // Mark document as failed
      await supabaseClient
        .from('documents')
        .update({ processing_status: 'error' })
        .eq('id', documentData.id);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to process document", 
          details: processingError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
});
