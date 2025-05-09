
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getApiKey, getAiProvider } from '@/integrations/supabase/client';

// Conditionally import only what we need for each provider
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Get provider from localStorage via client-side
    const provider = getAiProvider();
    const apiKey = getApiKey(provider);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          message: 'No API key found in localStorage', 
          hint: 'Please set an API key in the AI Chat settings' 
        }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    const { prompt, model, maxTokens, temperature } = await req.json();
    
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      
      const response = await openai.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 500,
        stream: true,
      });
      
      // Create a stream from the OpenAI response
      const stream = OpenAIStream(response);
      
      // Return a streaming response
      return new StreamingTextResponse(stream, { headers: corsHeaders });
    } 
    else if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
      
      const result = await model.generateContentStream(prompt);
      const stream = await OpenAIStream(result);
      
      return new StreamingTextResponse(stream, { headers: corsHeaders });
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid AI provider specified' }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error: any) {
    console.error('Error processing completion request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during the request' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}
