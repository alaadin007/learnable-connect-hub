
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
      console.log("No text detected in image or error in API response:", visionData);
      return "No text detected in image.";
    }
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return `Error processing image: ${error.message}`;
  }
}

// PDF processing function using pdf-parse library via an API endpoint
async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    // We'll use a PDF extraction API service for more reliable text extraction
    // This can be replaced with direct PDF.js usage if preferred
    const pdfApiUrl = Deno.env.get("PDF_EXTRACTION_API_URL");
    
    if (pdfApiUrl) {
      // If a specific PDF extraction API is configured, use it
      const apiResponse = await fetch(pdfApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("PDF_EXTRACTION_API_KEY") || ""}`
        },
        body: JSON.stringify({ url: pdfUrl })
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        return apiData.text || "No text extracted from PDF.";
      }
    }
    
    // Fallback: Fetch the PDF and extract text using a simple approach
    console.log("Using fallback PDF text extraction method");
    const pdfResponse = await fetch(pdfUrl);
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    
    // Extract text from PDF using simple pattern matching
    // This is a simplified approach and won't handle all PDFs correctly
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    let extractedText = "";
    
    // Extract text content between stream markers - a simplified approach
    const pdfText = new TextDecoder().decode(pdfBytes);
    const textFragments = pdfText.match(/\(([^)]+)\)/g) || [];
    
    extractedText = textFragments
      .map(fragment => fragment.substring(1, fragment.length - 1))
      .join(" ")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\/g, "");
    
    // If we couldn't extract meaningful text, provide a notice
    if (extractedText.trim().length < 100) {
      extractedText += "\n\nNote: Limited text extracted from this PDF. The document may be image-based or require more advanced extraction methods.";
    }
    
    return extractedText || "Could not extract text from PDF.";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return `Error processing PDF: ${error.message}`;
  }
}

// Split text into manageable sections for storage and processing
function splitContentIntoSections(content: string, maxSectionLength = 10000): string[] {
  const sections: string[] = [];
  
  // If content is smaller than max length, return as single section
  if (content.length <= maxSectionLength) {
    return [content];
  }
  
  // Try to split on paragraphs first
  const paragraphs = content.split(/\n\s*\n/);
  let currentSection = "";
  
  for (const paragraph of paragraphs) {
    if ((currentSection + paragraph).length <= maxSectionLength) {
      currentSection += (currentSection ? "\n\n" : "") + paragraph;
    } else {
      // If adding this paragraph would exceed max length, start a new section
      if (currentSection) {
        sections.push(currentSection);
        currentSection = paragraph;
      } else {
        // If a single paragraph is too long, split on sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if ((currentSection + sentence).length <= maxSectionLength) {
            currentSection += (currentSection ? " " : "") + sentence;
          } else {
            if (currentSection) {
              sections.push(currentSection);
              currentSection = sentence;
            } else {
              // If a single sentence is too long, hard split by character count
              for (let i = 0; i < sentence.length; i += maxSectionLength) {
                sections.push(sentence.substring(i, i + maxSectionLength));
              }
            }
          }
        }
      }
    }
  }
  
  // Add the last section if not empty
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Update document status in the database
async function updateDocumentStatus(documentId: string, status: string): Promise<void> {
  await supabaseAdmin
    .from('documents')
    .update({ processing_status: status })
    .eq('id', documentId);
}

// Store extracted content in the document_content table
async function storeExtractedContent(documentId: string, contentSections: string[]): Promise<void> {
  // Delete any existing content for this document
  await supabaseAdmin
    .from('document_content')
    .delete()
    .eq('document_id', documentId);
  
  // Insert each section
  for (let i = 0; i < contentSections.length; i++) {
    await supabaseAdmin
      .from('document_content')
      .insert({
        document_id: documentId,
        section_number: i + 1,
        content: contentSections[i],
        processing_status: 'completed'
      });
  }
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
    
    // Split content into sections if needed
    const contentSections = splitContentIntoSections(extractedText);
    console.log(`Extracted ${contentSections.length} sections of content`);
    
    // Store the extracted content
    await storeExtractedContent(document_id, contentSections);
    
    // Update document status to completed
    await updateDocumentStatus(document_id, 'completed');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processed successfully",
        sections: contentSections.length
      }),
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
