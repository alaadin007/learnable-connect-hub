
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Custom hook for generating and managing school invitation codes
 */
export const useSchoolCode = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null);

  /**
   * Generate a new school code
   */
  const generateCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      toast.error("School ID is required");
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Try to use the Supabase Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('generate-student-invite', {
          body: { schoolId }
        });
        
        if (error) throw error;
        
        if (data && data.code) {
          setLastGeneratedCode(data.code);
          return data.code;
        }
      } catch (edgeFnError) {
        console.warn("Edge function failed, falling back to RPC function:", edgeFnError);
      }
      
      // Fallback to direct RPC function call
      const { data, error } = await supabase.rpc('create_student_invitation', { 
        school_id_param: schoolId 
      });
      
      if (error) throw error;
      
      if (data && data.length > 0 && data[0].code) {
        const newCode = data[0].code;
        setLastGeneratedCode(newCode);
        return newCode;
      }
      
      throw new Error("Failed to generate code");
    } catch (error: any) {
      console.error("Error generating school code:", error);
      toast.error(error.message || "Failed to generate invitation code");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateCode,
    isGenerating,
    lastGeneratedCode
  };
};
