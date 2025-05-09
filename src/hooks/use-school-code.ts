
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSchoolCode() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const verifySchoolCode = async (code: string): Promise<boolean> => {
    try {
      setIsVerifying(true);
      
      if (!code) {
        return false;
      }
      
      // Try to use the RPC function to verify the code
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_school_code', { code });
      
      if (!rpcError && rpcData !== null) {
        return !!rpcData; // Convert to boolean
      }
      
      // Fallback to direct query if RPC fails
      console.log("RPC verify_school_code failed, falling back to direct query");
      const { data, error } = await supabase
        .from('schools')
        .select('id')
        .eq('code', code)
        .single();
      
      if (error) {
        console.error("Error verifying school code:", error);
        if (error.message.includes('No API key found')) {
          toast.error("Connection error. Please refresh and try again.");
        }
        return false;
      }
      
      return !!data; // Convert to boolean
    } catch (error) {
      console.error("Error in verifySchoolCode:", error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };
  
  const getSchoolName = async (code: string): Promise<string> => {
    try {
      // Try to use the RPC function to get the school name
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_school_name_from_code', { code });
      
      if (!rpcError && rpcData !== null) {
        return rpcData || '';
      }
      
      // Fallback to direct query if RPC fails
      console.log("RPC get_school_name_from_code failed, falling back to direct query");
      const { data, error } = await supabase
        .from('schools')
        .select('name')
        .eq('code', code)
        .single();
      
      if (error) {
        console.error("Error getting school name:", error);
        return '';
      }
      
      return data?.name || '';
    } catch (error) {
      console.error("Error in getSchoolName:", error);
      return '';
    }
  };
  
  const generateCode = async (schoolId: string): Promise<string | null> => {
    try {
      setIsGenerating(true);
      console.log("Generating new code for school ID:", schoolId);
      
      // First try to use the edge function
      try {
        const { data: functionData, error: functionError } = await supabase
          .functions.invoke('generate-school-code', {
            body: { schoolId }
          });
        
        if (functionError) {
          console.error("Edge function error:", functionError);
          throw functionError;
        }
        
        if (functionData?.code) {
          console.log("Code generated successfully via edge function:", functionData.code);
          return functionData.code;
        }
      } catch (edgeFunctionError) {
        console.error("Edge function failed, falling back to RPC:", edgeFunctionError);
      }
      
      // Fall back to RPC function if edge function fails
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('generate_new_school_code', { school_id_param: schoolId });
      
      if (rpcError) {
        console.error("Error generating new school code via RPC:", rpcError);
        
        if (rpcError.message.includes('No API key found')) {
          toast.error("Connection error. Please refresh and try again.");
        } else {
          toast.error("Failed to generate new code. Please try again.");
        }
        return null;
      }
      
      if (rpcData) {
        console.log("Code generated successfully via RPC:", rpcData);
        return rpcData;
      }
      
      // If both methods fail, make a direct update as last resort
      console.warn("All preferred methods failed. Falling back to direct update");
      
      // Generate a code with SCH prefix and 6 random chars
      const prefix = 'SCH';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const newCode = `${prefix}${result}`;
      
      // Update the school record directly
      const { error: updateError } = await supabase
        .from('schools')
        .update({ 
          code: newCode,
          code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        })
        .eq('id', schoolId);
        
      if (updateError) {
        console.error("Error in direct update fallback:", updateError);
        toast.error("Failed to generate new code. Please try again.");
        return null;
      }
      
      return newCode;
      
    } catch (error) {
      console.error("Error in generateCode:", error);
      toast.error("An unexpected error occurred while generating code.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    verifySchoolCode,
    getSchoolName,
    generateNewCode: generateCode, // Keep old name for backward compatibility
    generateCode, // Add the new name that's being used in components
    isVerifying,
    isGenerating
  };
}
