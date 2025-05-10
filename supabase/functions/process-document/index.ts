
// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { serve } from 'https://deno.land/std@0.180.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const processDocument = async (documentId: string) => {
  // Get env vars
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First, get the document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
      
    if (docError || !document) {
      throw new Error('Document not found: ' + docError?.message);
    }
    
    // Get the document file
    const { data: file, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);
      
    if (fileError || !file) {
      throw new Error('Could not download document file: ' + fileError?.message);
    }
    
    // Extract text content from document
    // For simplicity, we'll just assume we have the text content
    const documentText = "This is a sample document text for processing";
    
    // Store the document content for faster retrieval
    await supabase
      .from('document_content')
      .insert({
        document_id: documentId,
        content: documentText,
        processing_status: 'completed'
      });
    
    // Update the document status
    await supabase
      .from('documents')
      .update({ processing_status: 'completed' })
      .eq('id', documentId);
      
    return {
      success: true,
      status: 'completed'
    };
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Update the document status to 'error'
    await supabase
      .from('documents')
      .update({ processing_status: 'error' })
      .eq('id', documentId);
      
    return {
      success: false,
      error: error.message
    };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const result = await processDocument(documentId);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
