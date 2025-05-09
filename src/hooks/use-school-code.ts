
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
      
      // Call the Supabase function to verify the code
      const { data, error } = await supabase.rpc('verify_school_code', { code });
      
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
      const { data, error } = await supabase.rpc('get_school_name_from_code', { code });
      
      if (error) {
        console.error("Error getting school name:", error);
        return '';
      }
      
      return data || '';
    } catch (error) {
      console.error("Error in getSchoolName:", error);
      return '';
    }
  };
  
  // Rename to generateCode to match what's being used in the components
  const generateCode = async (schoolId: string): Promise<string | null> => {
    try {
      setIsGenerating(true);
      
      // Call the Supabase function to generate a new code
      const { data, error } = await supabase
        .rpc('generate_new_school_code', { school_id_param: schoolId });
      
      if (error) {
        console.error("Error generating new school code:", error);
        if (error.message.includes('No API key found')) {
          toast.error("Connection error. Please refresh and try again.");
        } else {
          toast.error("Failed to generate new code. Please try again.");
        }
        return null;
      }
      
      if (data) {
        toast.success("New school code generated successfully!");
        return data;
      }
      
      return null;
      
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
