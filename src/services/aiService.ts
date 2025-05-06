
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIRequestOptions {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export const sendAIRequest = async (options: AIRequestOptions): Promise<string> => {
  const { prompt, model } = options;

  try {
    if (model.startsWith('gpt-')) {
      // OpenAI request
      const { data, error } = await supabase.rpc('proxy_openai_request', {
        prompt,
        model
      });

      if (error) throw new Error(error.message);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Parse the response based on OpenAI's format
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from OpenAI');
      }
    } 
    else if (model.startsWith('gemini-')) {
      // Gemini request
      const { data, error } = await supabase.rpc('proxy_gemini_request', {
        prompt,
        model
      });

      if (error) throw new Error(error.message);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Parse the response based on Gemini's format
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    } 
    else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error: any) {
    console.error("AI Request Error:", error);
    
    // Check for specific errors
    if (error.message?.includes('API key not found')) {
      toast.error(`API key not set for ${model.startsWith('gemini') ? 'Gemini' : 'OpenAI'}`);
      return "API key not configured. Please ask an administrator to set up the API key.";
    }
    
    toast.error(`Error: ${error.message || 'Failed to get AI response'}`);
    return `Sorry, there was an error processing your request: ${error.message || 'Unknown error'}`;
  }
};
