
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
      console.error("School ID is required to fetch code");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("schools")
        .select("code")
        .eq("id", schoolId)
        .single();

      if (error) throw error;
      
      return data?.code || null;
    } catch (error: any) {
      console.error("Error fetching school code:", error);
      return null;
    }
  };

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
        const { data, error } = await supabase.functions.invoke('generate-school-code', {
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
      const { data, error } = await supabase.rpc('generate_new_school_code', { 
        school_id_param: schoolId 
      });

      if (error) throw error;

      setLastGeneratedCode(data);
      return data;
    } catch (error: any) {
      console.error("Error generating school code:", error);
      toast.error(error.message || "Failed to generate invitation code");
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
      toast.error("School ID is required");
      return null;
    }

    setIsGenerating(true);

    try {
      // Try to use the edge function
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: { method: 'code', schoolId }
      });

      if (error) throw error;

      if (data && data.code) {
        setLastGeneratedCode(data.code);
        return data.code;
      }

      // If edge function doesn't return a code, try the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_student_invitation', { 
        school_id_param: schoolId 
      });

      if (rpcError) throw rpcError;

      if (rpcData && rpcData.length > 0) {
        const code = rpcData[0].code;
        setLastGeneratedCode(code);
        return code;
      }

      throw new Error("Failed to generate student invitation code");
    } catch (error: any) {
      console.error("Error generating student invite code:", error);
      toast.error(error.message || "Failed to generate student invitation code");
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
