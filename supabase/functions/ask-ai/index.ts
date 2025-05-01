
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

    const { question, conversationId, sessionId, topic } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    console.log(`Processing question: "${question.substring(0, 50)}..."`);
    console.log(`Conversation ID: ${conversationId || 'New conversation'}`);
    console.log(`Session ID: ${sessionId || 'Not provided'}`);
    console.log(`Topic: ${topic || 'General'}`);

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

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the recommended model
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful educational assistant for LearnAble. Provide clear and accurate information to help students learn.' 
          },
          { role: 'user', content: question }
        ],
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

    return new Response(JSON.stringify({ 
      response: aiResponse,
      conversationId: newConversationId,
      sessionId: sessionId,
      topic: topic 
    }), {
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
