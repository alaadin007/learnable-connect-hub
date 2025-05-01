
// This Supabase Edge Function processes uploaded PDFs and images to extract text

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { decode as base64Decode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

// Configure CORS headers for the Edge Function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client for the Edge Function context
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// OCR API for extracting text from images
async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    // For this example, we'll use Google Cloud Vision API
    // You'll need to set up the GOOGLE_CLOUD_API_KEY in your Supabase project
    const apiKey = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    
    if (!apiKey) {
      throw new Error("Google Cloud API Key not found");
    }
    
    // Fetch the image file
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    // Prepare request to Google Cloud Vision API
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: "TEXT_DETECTION"
            }
          ]
        }
      ]
    };
    
    // Call Vision API
    const visionResponse = await fetch(visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    const visionData = await visionResponse.json();
    
    // Check if text was detected
    if (visionData.responses && 
        visionData.responses[0] && 
        visionData.responses[0].fullTextAnnotation) {
      return visionData.responses[0].fullTextAnnotation.text;
    } else {
      return "No text detected in image.";
    }
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return `Error processing image: ${error.message}`;
  }
}

// PDF processing function using pdf-parse API
async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    // For this example, we'll use a PDF parsing service
    // In a production environment, you would use a more reliable solution
    
    // Fetch the PDF file
    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    // Using PDF.js example approach (simplified for demonstration)
    // In a real implementation, you would use a proper PDF parsing library
    // or service like pdf-parse, but those require Node.js environment
    
    // For now, we'll simulate PDF parsing
    const decodedText = "This is simulated PDF text extraction. In a production environment, you would use a more robust solution like a dedicated PDF parsing service.";
    
    return decodedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return `Error processing PDF: ${error.message}`;
  }
}

// Update document status in the database
async function updateDocumentStatus(documentId: string, status: string): Promise<void> {
  await supabaseAdmin
    .from('documents')
    .update({ processing_status: status })
    .eq('id', documentId);
}

// Store extracted content in the document_content table
async function storeExtractedContent(documentId: string, content: string): Promise<void> {
  // Split content into sections if needed (simplified here - just storing as one section)
  await supabaseAdmin
    .from('document_content')
    .insert({
      document_id: documentId,
      section_number: 1,
      content: content,
      processing_status: 'completed'
    });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { document_id } = await req.json();
    
    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "Missing document_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing document: ${document_id}`);
    
    // Get document info from database
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();
    
    if (docError || !document) {
      console.error("Error fetching document:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found", details: docError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update document status to processing
    await updateDocumentStatus(document_id, 'processing');
    
    // Get file URL from storage
    const { data: signedUrl } = await supabaseAdmin
      .storage
      .from('user-content')
      .createSignedUrl(document.storage_path, 60); // 60 seconds expiry
    
    if (!signedUrl?.signedUrl) {
      await updateDocumentStatus(document_id, 'error');
      return new Response(
        JSON.stringify({ error: "Failed to get file URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process document based on file type
    let extractedText = "";
    
    if (document.file_type.includes('pdf')) {
      console.log("Processing PDF document");
      extractedText = await extractTextFromPdf(signedUrl.signedUrl);
    } 
    else if (document.file_type.includes('image')) {
      console.log("Processing image document");
      extractedText = await extractTextFromImage(signedUrl.signedUrl);
    }
    else {
      await updateDocumentStatus(document_id, 'unsupported');
      return new Response(
        JSON.stringify({ error: "Unsupported file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Store the extracted content
    await storeExtractedContent(document_id, extractedText);
    
    // Update document status to completed
    await updateDocumentStatus(document_id, 'completed');
    
    return new Response(
      JSON.stringify({ success: true, message: "Document processed successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to process document", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
