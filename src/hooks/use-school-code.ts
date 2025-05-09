
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
      console.log("Fetching code for school ID:", schoolId);
      
      const { data, error } = await supabase
        .from("schools")
        .select("code")
        .eq("id", schoolId)
        .single();

      if (error) {
        console.error("Error fetching school code:", error);
        throw error;
      }
      
      console.log("Fetched school code data:", data);
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
      toast.error("School ID is required");
      return null;
    }

    setIsGenerating(true);
    console.log("Generating code for school ID:", schoolId);

    try {
      // Try to use the Supabase Edge Function first
      try {
        console.log("Attempting to use edge function for code generation");
        
        const { data, error } = await supabase.functions.invoke('generate-school-code', {
          body: { schoolId }
        });

        if (error) {
          console.error("Edge function error:", error);
          throw error;
        }

        console.log("Edge function response:", data);

        if (data && data.code) {
          console.log("Generated code from edge function:", data.code);
          setLastGeneratedCode(data.code);
          toast.success("School code generated successfully");
          return data.code;
        } else {
          console.warn("Edge function didn't return a valid code");
        }
      } catch (edgeFnError) {
        console.warn("Edge function failed, falling back to RPC function:", edgeFnError);
      }

      // Fallback to direct RPC function call
      console.log("Attempting RPC function for code generation");
      
      const { data, error } = await supabase.rpc('generate_new_school_code', { 
        school_id_param: schoolId 
      });

      if (error) {
        console.error("RPC function error:", error);
        throw error;
      }
      
      console.log("Generated code from RPC:", data);
      setLastGeneratedCode(data);
      toast.success("School code generated successfully");
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
      console.log("Generating student invitation code for school:", schoolId);
      
      // Try to use the edge function first
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: { method: 'code', schoolId }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Student invite edge function response:", data);

      // Check if we got a valid code from the edge function
      if (data && data.data && data.data.code) {
        const generatedCode = data.data.code;
        console.log("Generated student code:", generatedCode);
        setLastGeneratedCode(generatedCode);
        toast.success("Student invitation code generated successfully");
        return generatedCode;
      } else if (data && data.code) {
        // Handle direct code return format
        const generatedCode = data.code;
        console.log("Generated student code (alternate format):", generatedCode);
        setLastGeneratedCode(generatedCode);
        toast.success("Student invitation code generated successfully");
        return generatedCode;
      }

      // Fallback to RPC function if needed
      console.log("Attempting RPC function for student code generation");
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_student_invitation', { 
        school_id_param: schoolId 
      });

      if (rpcError) {
        console.error("RPC function error:", rpcError);
        throw rpcError;
      }

      console.log("RPC student invite response:", rpcData);
      
      if (rpcData && rpcData.length > 0) {
        const code = rpcData[0].code;
        console.log("Generated student code from RPC:", code);
        setLastGeneratedCode(code);
        toast.success("Student invitation code generated successfully");
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
