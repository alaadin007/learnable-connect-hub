
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const { question, conversationId, sessionId, topic, useDocuments = true } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    console.log(`Processing question: "${question.substring(0, 50)}..."`);
    console.log(`Conversation ID: ${conversationId || 'New conversation'}`);
    console.log(`Session ID: ${sessionId || 'Not provided'}`);
    console.log(`Topic: ${topic || 'General'}`);
    console.log(`Use Documents: ${useDocuments}`);

    // Create Supabase client
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_ANON_KEY')
      ? await createSupabaseClient()
      : null;

    if (!supabaseClient) {
      console.warn('Supabase client not initialized. Message history won\'t be saved.');
    }

    // Get user information from JWT
    const authHeader = req.headers.get('authorization');
    let userId = null;
    let schoolId = null;

    if (authHeader && supabaseClient) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (userError) {
          console.error('Error getting user data:', userError);
        } else if (userData?.user) {
          userId = userData.user.id;
          
          // Get school ID for the user
          const { data: schoolData } = await supabaseClient.rpc('get_user_school_id');
          schoolId = schoolData;
        }
      } catch (error) {
        console.error('Error verifying JWT:', error);
      }
    }

    // Search for relevant document content if useDocuments is true and user is authenticated
    let relevantContent = "";
    let sourceCitations = [];
    
    if (useDocuments && supabaseClient && userId) {
      try {
        console.log(`Searching for relevant documents for user ${userId}`);
        
        // Extract keywords from the question for better search
        // This is a simple approach - we could use embeddings for better results in the future
        const questionWords = question
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => 
            word.length > 3 && 
            !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'this', 'that', 'these', 'those', 'with', 'from'].includes(word)
          );
        
        // If we have meaningful keywords to search for
        if (questionWords.length > 0) {
          console.log(`Extracted keywords: ${questionWords.join(', ')}`);
          
          // Search for completed documents from this user
          const { data: userDocuments, error: docError } = await supabaseClient
            .from('documents')
            .select('id, filename')
            .eq('user_id', userId)
            .eq('processing_status', 'completed');
          
          if (docError) {
            console.error('Error fetching user documents:', docError);
          } else if (userDocuments && userDocuments.length > 0) {
            console.log(`Found ${userDocuments.length} processed documents`);
            
            // Search document content using keywords
            const documentIds = userDocuments.map(doc => doc.id);
            
            // Construct a query to search for content containing any of the keywords
            // This is a simple search approach that could be improved with full-text search or vector embeddings
            let textSearchQuery = supabaseClient
              .from('document_content')
              .select('content, document_id')
              .in('document_id', documentIds);
            
            // Add conditions to search for each keyword
            const searchConditions = questionWords.map(keyword => `content.ilike.%${keyword}%`);
            
            // Apply the conditions with OR logic
            for (const condition of searchConditions) {
              textSearchQuery = textSearchQuery.or(condition);
            }
            
            // Execute the search and limit results
            const { data: matchingContent, error: contentError } = await textSearchQuery.limit(5);
            
            if (contentError) {
              console.error('Error searching document content:', contentError);
            } else if (matchingContent && matchingContent.length > 0) {
              console.log(`Found ${matchingContent.length} relevant content sections`);
              
              // Extract document details for citations
              for (const content of matchingContent) {
                // Find the document info
                const document = userDocuments.find(doc => doc.id === content.document_id);
                
                if (document) {
                  // Add this content with citation to our results
                  relevantContent += content.content + "\n\n";
                  
                  // Add citation information
                  sourceCitations.push({
                    filename: document.filename,
                    document_id: document.id
                  });
                }
              }
              
              // Limit the total content length to prevent token overflow
              if (relevantContent.length > 4000) {
                relevantContent = relevantContent.substring(0, 4000) + "... (content truncated)";
              }
              
              console.log(`Found relevant content with ${relevantContent.length} characters`);
            } else {
              console.log('No matching content found in user documents');
            }
          } else {
            console.log('No processed documents found for this user');
          }
        }
      } catch (error) {
        console.error('Error searching documents:', error);
        // Continue with the request even if document search fails
      }
    }

    // Prepare system prompt based on whether document content was found
    let systemPrompt = 'You are a helpful educational assistant for LearnAble. Provide clear and accurate information to help students learn.';
    
    if (relevantContent) {
      systemPrompt += ' Answer the question based ONLY on the provided context from the user\'s documents. If the context doesn\'t contain the information needed to answer the question fully, acknowledge that and answer with what you can from the context.';
    }

    // Call OpenAI API
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add document content as context if available
    if (relevantContent) {
      messages.push({ 
        role: 'system', 
        content: `Context from user's documents:\n\n${relevantContent}` 
      });
    }
    
    // Add the user question
    messages.push({ role: 'user', content: question });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the recommended model
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save conversation history to database if Supabase client is available and user is authenticated
    let newConversationId = conversationId;
    
    if (supabaseClient && userId && schoolId) {
      try {
        // If no conversationId is provided, create a new conversation
        if (!conversationId) {
          // Generate a title based on the first question (first 30 chars)
          const defaultTitle = question.length > 30 
            ? `${question.substring(0, 30)}...` 
            : question;
          
          const { data: newConversation, error: conversationError } = await supabaseClient
            .from('conversations')
            .insert({
              user_id: userId,
              school_id: schoolId,
              title: defaultTitle,
              topic: topic || null,
              last_message_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (conversationError) {
            console.error('Error creating conversation:', conversationError);
          } else {
            newConversationId = newConversation.id;
            console.log(`Created new conversation with ID: ${newConversationId}`);
          }
        } else {
          // Update last_message_at for existing conversation
          await supabaseClient
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);
        }
        
        // If we have a valid conversation ID (either existing or newly created)
        if (newConversationId) {
          // Save user message
          await supabaseClient
            .from('messages')
            .insert({
              conversation_id: newConversationId,
              sender: 'user',
              content: question
            });
          
          // Save AI response
          await supabaseClient
            .from('messages')
            .insert({
              conversation_id: newConversationId,
              sender: 'ai',
              content: aiResponse
            });
          
          console.log(`Saved messages to conversation ID: ${newConversationId}`);
        }
      } catch (error) {
        console.error('Error saving conversation history:', error);
      }
    }

    // Create response with citations when available
    const responseData = {
      response: aiResponse,
      conversationId: newConversationId,
      sessionId: sessionId,
      topic: topic,
      useDocuments: useDocuments,
      hasRelevantDocuments: sourceCitations.length > 0
    };
    
    // Add source citations if we found relevant documents
    if (sourceCitations.length > 0) {
      responseData.sourceCitations = sourceCitations;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ask-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to create Supabase client
async function createSupabaseClient() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    }
  });
}
