
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
        
        // Improved approach: Extract more meaningful keywords from the question
        // Remove common words, articles, and prepositions to focus on important terms
        const stopWords = new Set([
          'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
          'have', 'has', 'had', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
          'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'this', 'that',
          'these', 'those', 'with', 'from', 'about', 'for', 'to', 'in', 'on', 'at', 'by', 'of',
          'me', 'my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'its', 'our', 'ours', 'their',
          'theirs', 'am', 'can', 'will', 'should', 'would', 'could', 'may', 'might', 'must'
        ]);
        
        // Extract the meaningful keywords
        const questionWords = question
          .toLowerCase()
          .replace(/[^\w\s]/g, '')  // Remove punctuation
          .split(/\s+/)              // Split by whitespace
          .filter(word => 
            word.length > 2 &&       // Words longer than 2 chars
            !stopWords.has(word)     // Not in stop words list
          );
        
        // If we have meaningful keywords to search for
        if (questionWords.length > 0) {
          console.log(`Extracted keywords: ${questionWords.join(', ')}`);
          
          // First get context from topic-related documents if a topic was provided
          let topicRelatedDocuments = [];
          
          if (topic) {
            // Try to find documents related to the specified topic
            const { data: topicDocuments, error: topicError } = await supabaseClient
              .from('documents')
              .select('id, filename')
              .eq('user_id', userId)
              .eq('processing_status', 'completed')
              .ilike('filename', `%${topic}%`);
              
            if (!topicError && topicDocuments && topicDocuments.length > 0) {
              topicRelatedDocuments = topicDocuments.map(doc => doc.id);
              console.log(`Found ${topicRelatedDocuments.length} documents related to topic "${topic}"`);
            }
          }
          
          // Get all user's processed documents
          const { data: userDocuments, error: docError } = await supabaseClient
            .from('documents')
            .select('id, filename')
            .eq('user_id', userId)
            .eq('processing_status', 'completed');
          
          if (docError) {
            console.error('Error fetching user documents:', docError);
          } else if (userDocuments && userDocuments.length > 0) {
            console.log(`Found ${userDocuments.length} processed documents`);
            
            // Get all document IDs
            const documentIds = userDocuments.map(doc => doc.id);
            
            // Build a more sophisticated search query
            // We'll use a scoring mechanism to rank content relevance
            
            // For each keyword, we'll search separately and then compile results
            let allMatchingContent = [];
            
            // First prioritize searching in topic-related documents if any
            if (topicRelatedDocuments.length > 0) {
              for (const keyword of questionWords) {
                const { data: topicMatches, error: topicMatchError } = await supabaseClient
                  .from('document_content')
                  .select('content, document_id')
                  .in('document_id', topicRelatedDocuments)
                  .ilike('content', `%${keyword}%`)
                  .limit(5);
                  
                if (!topicMatchError && topicMatches && topicMatches.length > 0) {
                  allMatchingContent.push(...topicMatches);
                }
              }
            }
            
            // Then search all other documents if we need more matches
            if (allMatchingContent.length < 5) {
              for (const keyword of questionWords) {
                const { data: otherMatches, error: otherMatchError } = await supabaseClient
                  .from('document_content')
                  .select('content, document_id')
                  .in('document_id', documentIds)
                  .ilike('content', `%${keyword}%`)
                  .limit(5);
                  
                if (!otherMatchError && otherMatches && otherMatches.length > 0) {
                  allMatchingContent.push(...otherMatches);
                }
              }
            }
            
            // Score and rank content based on keyword matches
            const contentScores = new Map();
            
            allMatchingContent.forEach(content => {
              // Generate a key combining document ID and content to avoid duplicates
              const key = `${content.document_id}:${content.content.substring(0, 50)}`;
              
              if (!contentScores.has(key)) {
                contentScores.set(key, { content, score: 0 });
              }
              
              const entry = contentScores.get(key);
              
              // Score content based on how many keywords match
              questionWords.forEach(keyword => {
                if (content.content.toLowerCase().includes(keyword)) {
                  // Increase score for each matching keyword
                  entry.score += 1;
                  
                  // Bonus points for exact phrase matches
                  if (content.content.toLowerCase().includes(question.toLowerCase())) {
                    entry.score += 5;
                  }
                }
              });
            });
            
            // Convert map to array, sort by score (highest first)
            const scoredContent = Array.from(contentScores.values())
              .sort((a, b) => b.score - a.score)
              .slice(0, 3); // Take top 3 most relevant chunks
              
            if (scoredContent.length > 0) {
              console.log(`Found ${scoredContent.length} relevant content sections`);
              
              // Extract document details for citations
              for (const item of scoredContent) {
                const content = item.content;
                // Find the document info
                const document = userDocuments.find(doc => doc.id === content.document_id);
                
                if (document) {
                  // Add this content with citation to our results
                  relevantContent += content.content + "\n\n";
                  
                  // Add citation information
                  sourceCitations.push({
                    filename: document.filename,
                    document_id: document.id,
                    relevance_score: item.score,
                    excerpt: content.content.substring(0, 150) + "..."
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
      systemPrompt += ' Answer the question based primarily on the provided context from the user\'s documents. If the context doesn\'t contain the information needed to answer the question fully, acknowledge that and supplement with your general knowledge, but make it clear which parts of your answer come from their documents and which parts are general information.';
      
      // Add instruction to include citations
      systemPrompt += ' When referring to information from the documents, mention the document name in your answer using phrases like "according to [document name]" or "as mentioned in [document name]".';
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
              content: aiResponse,
              document_citations: sourceCitations.length > 0 ? sourceCitations : null
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
      hasRelevantDocuments: sourceCitations.length > 0,
      sourceCitations: sourceCitations.length > 0 ? sourceCitations : undefined
    };

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
