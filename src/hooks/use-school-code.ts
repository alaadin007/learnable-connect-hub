
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
   * Fetch the current school code
   */
  const fetchCurrentCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      console.log("School ID is required to fetch code");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("schools")
        .select("code")
        .eq("id", schoolId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching school code:", error);
        return null;
      }
      
      return data?.code || null;
    } catch (error: any) {
      console.error("Exception fetching school code:", error);
      return null;
    }
  };

  /**
   * Generate a new school code
   */
  const generateCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      console.log("School ID is required");
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Use RPC function directly for faster response
      const { data, error } = await supabase.rpc('generate_new_school_code', { 
        school_id_param: schoolId 
      });

      if (error) {
        console.error("RPC function error:", error);
        return null;
      }
      
      setLastGeneratedCode(data);
      return data;
    } catch (error: any) {
      console.error("Error generating school code:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate a student invitation code
   */
  const generateStudentInviteCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      console.log("School ID is required");
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Use RPC function directly for faster response
      const { data, error } = await supabase.rpc('create_student_invitation', { 
        school_id_param: schoolId 
      });

      if (error) {
        console.error("RPC function error:", error);
        return null;
      }

      if (data && data.length > 0) {
        const code = data[0].code;
        setLastGeneratedCode(code);
        return code;
      }

      return null;
    } catch (error: any) {
      console.error("Error generating student invite code:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateCode,
    fetchCurrentCode,
    generateStudentInviteCode,
    isGenerating,
    lastGeneratedCode
  };
};
