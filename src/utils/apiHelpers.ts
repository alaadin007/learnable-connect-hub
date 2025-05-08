
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to invoke Supabase Edge Functions with proper authentication
 * @param functionName The name of the edge function to invoke
 * @param payload The payload to send to the function
 * @returns The response from the edge function
 */
export async function invokeEdgeFunction<T = any>(functionName: string, payload?: any): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });
    
    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      throw error;
    }
    
    return data as T;
  } catch (error) {
    console.error(`Failed to invoke ${functionName}:`, error);
    throw error;
  }
}
