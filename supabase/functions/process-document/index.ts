
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the document ID from the request
    const { document_id } = await req.json();
    
    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "Missing document_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the document metadata
    const { data: documentData, error: documentError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (documentError || !documentData) {
      console.error("Error fetching document:", documentError);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status to processing
    await supabaseClient
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", document_id);

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabaseClient
      .storage
      .from("user-content")
      .download(documentData.storage_path);

    if (fileError || !fileData) {
      console.error("Error downloading file:", fileError);
      
      // Update document status to error
      await supabaseClient
        .from("documents")
        .update({ processing_status: "error" })
        .eq("id", document_id);
        
      return new Response(
        JSON.stringify({ error: "File not found in storage" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedText = "";

    // Process based on file type
    if (documentData.file_type === "application/pdf") {
      // For PDFs, we'd implement PDF parsing here
      // This is a placeholder - in a real implementation, you'd use a PDF parsing library
      extractedText = "PDF content extraction not implemented. This is a placeholder for PDF extraction.";
      
      // In a real implementation, you might do:
      // 1. Use a PDF parsing library to extract text
      // 2. Divide the content into logical sections (pages, paragraphs)
      // 3. Store each section separately in the document_content table
    } 
    else if (documentData.file_type.startsWith("image/")) {
      // For images, we'd implement OCR here
      // This is a placeholder - in a real implementation, you'd use an OCR library
      extractedText = "OCR extraction not implemented. This is a placeholder for image text extraction.";
      
      // In a real implementation, you might:
      // 1. Convert the image data to a format suitable for OCR
      // 2. Use an OCR service (like Google Vision) to extract text
      // 3. Process the extracted text as needed
    }
    else {
      // Unsupported file type
      await supabaseClient
        .from("documents")
        .update({ processing_status: "error" })
        .eq("id", document_id);
        
      return new Response(
        JSON.stringify({ error: "Unsupported file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store extracted text in document_content table
    const { error: contentError } = await supabaseClient
      .from("document_content")
      .insert({
        document_id: document_id,
        content: extractedText,
        processing_status: "completed"
      });

    if (contentError) {
      console.error("Error storing document content:", contentError);
      
      // Update document status to error
      await supabaseClient
        .from("documents")
        .update({ processing_status: "error" })
        .eq("id", document_id);
        
      return new Response(
        JSON.stringify({ error: "Failed to store document content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status to completed
    await supabaseClient
      .from("documents")
      .update({ processing_status: "completed" })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, message: "Document processed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
