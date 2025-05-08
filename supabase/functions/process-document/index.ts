
// This Supabase Edge Function processes uploaded documents to extract text

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

// Simple text extraction function - doesn't need external APIs for demo
async function simulateTextExtraction(fileUrl: string, fileType: string): Promise<string> {
  // This is a simplified version for demo purposes
  // In a real implementation, we would use OCR or PDF extraction APIs
  
  try {
    // Just return a placeholder text based on the file type
    if (fileType.includes('pdf')) {
      return "This is extracted text from a PDF document.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.\n\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.";
    } else if (fileType.includes('image')) {
      return "Text extracted from image using OCR simulation.\n\nThis would be actual text detected in the image in a real implementation.";
    } else if (fileType.includes('text') || fileType.includes('plain')) {
      return "Plain text content extracted.\n\nThis is a sample text file content that would be extracted from the actual file in a real implementation.";
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return "Microsoft Word document content.\n\nThis text represents content that would be extracted from a Word document in a production environment.";
    } else {
      return "Content extracted from document of type: " + fileType;
    }
  } catch (error) {
    console.error("Error in text extraction:", error);
    return `Error extracting text: ${error.message}`;
  }
}

// Split text into sections for processing
function splitContentIntoSections(content: string, maxSectionLength = 8000): string[] {
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
        // Split on sentences if a single paragraph is too long
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if ((currentSection + sentence).length <= maxSectionLength) {
            currentSection += (currentSection ? " " : "") + sentence;
          } else {
            if (currentSection) {
              sections.push(currentSection);
              currentSection = sentence;
            } else {
              // Hard split by character count if a sentence is too long
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

// Update document processing status
async function updateDocumentStatus(documentId: string, status: string): Promise<void> {
  await supabaseAdmin
    .from('documents')
    .update({ processing_status: status })
    .eq('id', documentId);
}

// Store extracted content in database
async function storeExtractedContent(documentId: string, contentSections: string[]): Promise<void> {
  // Delete any existing content
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
    
    // For simplicity, we're using a simulation for text extraction
    let extractedText = await simulateTextExtraction(document.storage_path, document.file_type);
    
    // Split content into sections
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
